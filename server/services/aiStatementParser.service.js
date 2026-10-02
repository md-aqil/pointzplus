// server/services/aiStatementParser.service.js
// Next-Gen Hybrid AI Statement Parser for PointzPlus
//
// Extracts loyalty balances, expiry dates, and program metadata using LLM
// structured extraction (Gemini / OpenAI) with automatic fallback to the
// deterministic StatementParser rules engine.

import crypto from 'crypto';
import zlib from 'zlib';
import { StatementParser } from './statementParser.js';

const getDeepSeekApiKey = () => (process.env.DEEPSEEK_API_KEY || '').trim();
const getDeepSeekBaseUrl = () => process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const getDeepSeekModel = () => process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const getGeminiApiKey = () => (process.env.GEMINI_API_KEY || '').trim();
const getOpenAiApiKey = () => (process.env.OPENAI_API_KEY || '').trim();

const CATEGORY_COLORS = {
  airlines: '#01A2FB',
  hotels: '#F59E0B',
  banking: '#38BDF8',
  shopping: '#2DD4BF',
  dining: '#EC4899',
  fuel: '#EF4444',
  supermarket: '#10B981',
  entertainment: '#8B5CF6',
  travel: '#06B6D4',
  other: '#6366F1',
};

// Conservative default for dynamically-created programs.
const DEFAULT_POINT_VALUE_INR = 0.25;

// The model may answer with its own vocabulary; normalise to the categories the
// app actually supports (see constants/popularPrograms.ts CATEGORY_LABELS).
const CATEGORY_ALIASES = {
  airlines: 'airlines',
  hotels: 'hotels',
  banking: 'banking',
  shopping: 'shopping',
  dining: 'dining',
  fuel: 'fuel',
  entertainment: 'entertainment',
  travel: 'travel',
  telecom: 'telecom',
  health: 'health',
  groceries: 'groceries',
  supermarket: 'groceries',
  other: 'other',
};

// A provider that hangs or rate-limits must not stall the whole scan worker,
// so every AI call is bounded by a strict 7s timeout with 1 fast retry.
const AI_TIMEOUT_MS = Math.max(1, Number.parseInt(process.env.AI_TIMEOUT_MS || '7000', 10) || 7000);
const AI_MAX_RETRIES = Math.max(0, Number.parseInt(process.env.AI_MAX_RETRIES || '1', 10) || 1);
const aiSleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url, options, timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** An error that must not be retried (4xx other than 429). */
class PermanentProviderError extends Error {}

async function callProvider(name, url, options) {
  let lastErr;
  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) return response;

      const status = response.status;
      const errText = (await response.text()).slice(0, 200);
      // 429 and 5xx are worth another try; other 4xx means the request itself
      // is wrong, so retrying only burns quota and time.
      const transient = status === 429 || status >= 500;
      if (!transient) throw new PermanentProviderError(`${name} HTTP ${status}: ${errText}`);
      lastErr = new Error(`${name} HTTP ${status}`);
    } catch (err) {
      if (err instanceof PermanentProviderError) throw err;
      // Network errors and aborts (timeout) are transient.
      lastErr = err;
    }

    if (attempt === AI_MAX_RETRIES) break;
    const backoff = 750 * 2 ** attempt;
    console.warn(
      `[AIStatementParser] ${name} attempt ${attempt + 1} failed (${lastErr.message}); retrying in ${backoff}ms`
    );
    await aiSleep(backoff);
  }
  throw lastErr;
}

export class AIStatementParser {
  /**
   * Universal parse entry point for incoming emails.
   * Tries AI structured extraction first; falls back to deterministic rules.
   */
  static async parseEmail({
    messageId,
    fromHeader = '',
    subjectHeader = '',
    bodyText = '',
    bodyHtml = '',
    receivedDate = new Date().toISOString(),
    pdfAttachments = [],
  }) {
    const messageIdHash = StatementParser.generateMessageHash(
      messageId,
      fromHeader,
      subjectHeader,
      receivedDate
    );

    // 1. Fast-Path: Deterministic rule-based and heuristic parsing (0ms, zero rate limits)
    // If there are no binary PDF attachments, deterministic rules handle statements instantly.
    if (pdfAttachments.length === 0) {
      const ruleResult = StatementParser.parseEmail({
        messageId,
        fromHeader,
        subjectHeader,
        bodyText,
        bodyHtml,
        receivedDate,
      });

      if (ruleResult.isLoyaltyStatement && ruleResult.loyaltyData) {
        return {
          messageIdHash,
          isLoyaltyStatement: true,
          source: 'rule_parser',
          loyaltyData: ruleResult.loyaltyData,
        };
      }
    }

    // 2. Candidate Gating: If not matched by regex and no PDF, only call LLM if email has loyalty signals
    const combinedText = `${subjectHeader} ${bodyText} ${bodyHtml.replace(/<[^>]+>/g, ' ')}`.toLowerCase();
    const hasCandidateSignals =
      pdfAttachments.length > 0 ||
      /(?:points|miles|neucoins|supercoins|rewards|reward|statement|balance|qmiles|avios|cashback|flyerbonus|bluchip|loyalty)/i.test(
        combinedText
      );

    if (!hasCandidateSignals) {
      return {
        messageIdHash,
        isLoyaltyStatement: false,
        loyaltyData: null,
        rejectionReason: 'NO_REWARD_SIGNALS',
        aiNotes: 'No loyalty, points, miles, or balance keywords detected in subject or email body.',
      };
    }

    // 3. If AI credentials are present, attempt AI structured extraction (including PDFs)
    if (getGeminiApiKey() || getDeepSeekApiKey() || getOpenAiApiKey()) {
      try {
        const aiResult = await this.extractWithAI({
          fromHeader,
          subjectHeader,
          bodyText,
          bodyHtml,
          receivedDate,
          pdfAttachments,
        });

        if (aiResult) {
          if (aiResult.is_loyalty_statement && typeof aiResult.current_balance === 'number') {
            const balance = Math.round(aiResult.current_balance);
            if (balance >= 0 && balance < 50_000_000) {
              const category = CATEGORY_ALIASES[aiResult.category] || 'shopping';
              const programName = aiResult.program_name || aiResult.brand_name || 'Loyalty Program';

              let expiryDate = null;
              if (aiResult.expiry_date) {
                const d = new Date(aiResult.expiry_date);
                if (!isNaN(d.getTime())) {
                  expiryDate = d.toISOString();
                }
              }

              return {
                messageIdHash,
                isLoyaltyStatement: true,
                source: pdfAttachments.length > 0 ? 'ai_pdf_extractor' : 'ai_extractor',
                loyaltyData: {
                  programId: (aiResult.brand_name || 'program')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_'),
                  programName,
                  brandName: aiResult.brand_name || programName,
                  category,
                  accentColor: CATEGORY_COLORS[category] || '#01A2FB',
                  pointValueINR: DEFAULT_POINT_VALUE_INR,
                  balance,
                  accountNumber: aiResult.membership_id || 'MEMBER-***',
                  expiringPoints: Math.max(0, Math.round(aiResult.expiring_points || 0)),
                  expiryDate,
                  confidence: Math.min(1, Math.max(0.7, Number(aiResult.confidence_score) || 0.95)),
                  sourceDate: receivedDate,
                },
              };
            }
          }

          // If AI parsed the message but concluded it's not a loyalty statement or had no valid balance
          return {
            messageIdHash,
            isLoyaltyStatement: false,
            loyaltyData: null,
            rejectionReason: aiResult.is_loyalty_statement ? 'NO_VALID_BALANCE' : 'AI_NON_LOYALTY',
            aiNotes:
              aiResult.reason ||
              (aiResult.is_loyalty_statement
                ? `AI recognized ${aiResult.brand_name || 'loyalty program'} but found no valid numeric balance.`
                : 'AI examined message content and determined it is not an active points balance statement.'),
          };
        }
      } catch (aiErr) {
        console.warn(`[AIStatementParser] AI extraction error on message ${messageId}:`, aiErr.message);
        return {
          messageIdHash,
          isLoyaltyStatement: false,
          loyaltyData: null,
          rejectionReason: 'AI_ERROR',
          aiNotes: `AI analysis timed out or failed: ${aiErr.message}`,
        };
      }
    }

    return {
      messageIdHash,
      isLoyaltyStatement: false,
      loyaltyData: null,
      rejectionReason: 'NO_LOYALTY_DATA',
      aiNotes: 'No matching loyalty rules and AI service was not configured.',
    };
  }

  /**
   * Robust raw text extractor for digital PDF statements (supports uncompressed & FlateDecode streams)
   */
  static extractTextFromPdfBase64(base64Data) {
    if (!base64Data || typeof base64Data !== 'string') return '';
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const raw = buffer.toString('binary');
      const textChunks = [];

      // 1. Extract and decompress all FlateDecode streams inside the PDF
      const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
      let match;
      while ((match = streamRegex.exec(raw)) !== null) {
        const streamData = match[1];
        try {
          const decompressed = zlib.inflateSync(Buffer.from(streamData, 'binary')).toString('binary');
          this.extractTextFromPdfStream(decompressed, textChunks);
        } catch {
          // Plain or uncompressed stream
          this.extractTextFromPdfStream(streamData, textChunks);
        }
      }

      // 2. Also search top-level text objects in raw stream
      this.extractTextFromPdfStream(raw, textChunks);

      const extracted = textChunks
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      return extracted.length > 20 ? extracted.slice(0, 5000) : '';
    } catch {
      return '';
    }
  }

  static extractTextFromPdfStream(streamStr, chunks) {
    if (!streamStr || typeof streamStr !== 'string') return;
    const unescapePdf = (str) =>
      str
        .replace(/\\([0-9]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\[nrtbf]/g, ' ')
        .replace(/\\(.)/g, '$1');

    // Standard string operations: (text) Tj
    const singleMatches = streamStr.match(/\(([^()]*)\)\s*T[jJ]/g) || [];
    for (const m of singleMatches) {
      const cleaned = m.replace(/^[(]/, '').replace(/[)]\s*T[jJ]$/, '');
      if (cleaned.trim()) chunks.push(unescapePdf(cleaned));
    }

    // Array string operations: [ (text1) 20 (text2) ] TJ
    const arrayMatches = streamStr.match(/\[(.*?)\]\s*TJ/g) || [];
    for (const m of arrayMatches) {
      const innerStrings = m.match(/\(([^()]*)\)/g) || [];
      const joined = innerStrings.map((s) => s.slice(1, -1)).join('');
      if (joined.trim()) chunks.push(unescapePdf(joined));
    }
  }

  /**
   * LLM Extraction using DeepSeek-V3 (for Text, HTML & PDFs) with Gemini 2.0 Flash (for Images & Complex PDFs)
   */
  static async extractWithAI({ fromHeader, subjectHeader, bodyText, bodyHtml, receivedDate, pdfAttachments = [], attachments = [] }) {
    const allAttachments = Array.isArray(attachments) && attachments.length > 0 ? attachments : (pdfAttachments || []);
    
    // Extract text from attached PDFs so DeepSeek can read all statement data directly
    let pdfTextContent = '';
    const imageAttachments = [];
    const rawPdfAttachments = [];

    for (const att of allAttachments) {
      if (att.isPdf || att.filename?.toLowerCase().endsWith('.pdf') || att.mimeType === 'application/pdf') {
        rawPdfAttachments.push(att);
        if (att.base64Data) {
          const text = this.extractTextFromPdfBase64(att.base64Data);
          if (text) pdfTextContent += `\n[Attached PDF (${att.filename || 'statement.pdf'}) Content]:\n${text}\n`;
        }
      } else if (att.isImage || att.mimeType?.startsWith('image/')) {
        imageAttachments.push(att);
      }
    }

    const cleanBody = `${bodyText || bodyHtml.replace(/<[^>]+>/g, ' ')}\n${pdfTextContent}`
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);

    const hasImages = imageAttachments.length > 0 && imageAttachments.some((a) => a.base64Data);
    const hasUnreadPdfs = rawPdfAttachments.length > 0 && !pdfTextContent && rawPdfAttachments.some((a) => a.base64Data);

    const prompt = `You are a precision loyalty rewards, air miles, and points parser.
Analyze this email and statement data to extract loyalty balances and reward updates in any format.

Email Metadata:
From: ${fromHeader}
Subject: ${subjectHeader}
Received Date: ${receivedDate}

Email & Statement Content:
"""
${cleanBody || '(See attached image/PDF document)'}
"""

Instructions & Loyalty Formats to Recognize:
1. RECOGNIZE ALL REWARD UNITS:
   - Points: "Reward Points", "Available Points", "Closing Balance", "i-Points", "EDGE Rewards", "Pts", "RP", "Bonus Points"
   - Miles: "Air Miles", "Flying Returns", "KrisFlyer Miles", "CV Points", "InterMiles", "Avios", "SkyMiles", "Club Premier"
   - Coins / Tokens: "SuperCoins", "NeuCoins", "CRED Coins", "Zomato Coins", "Cleartrip Coins", "Reward Coins"
   - Stars: "Starbucks Stars", "Reward Stars"
   - Loyalty Credits & Cashback Points: "Myntra Insider Points", "Swiggy One Rewards", "Fuel Points" (IOCL XtraRewards, BPCL PetroMiles)
2. FORMAT FLEXIBILITY:
   - Statements can present balances as:
     • Explicit labels: "Current Balance: 12,450 pts", "Available NeuCoins: 1,420"
     • Subject line alerts: "450 SuperCoins credited to your wallet", "You've earned 250 Stars!"
     • Currency equivalents: "NeuCoins: ₹1,420", "Reward Balance: 8,400 (Value: ₹2,100)" -> extract the numeric coin/point count (1420 or 8400)
     • Summary tables: "Opening: 1000, Earned: 500, Redeemed: 0, Closing: 1500" -> extract Closing/Available balance (1500)
3. DISTINGUISH FIAT TRANSACTIONS:
   - DO NOT extract bank account debit amounts (e.g. "₹5,000 debited from A/c XX1234"), OTP codes, bill payment amounts, or courier tracking numbers as points.
4. If no genuine loyalty points balance or statement is present in this email/PDF, return "is_loyalty_statement": false.

Respond ONLY with valid JSON conforming to this schema:
{
  "is_loyalty_statement": boolean,
  "reason": string (brief explanation of why this was or was not identified as a loyalty points statement),
  "brand_name": string (e.g. "Flipkart", "Air India", "InterMiles", "Myntra", "Marriott", "HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank", "Tata Neu", "Starbucks", "CRED", "Vistara"),
  "program_name": string (e.g. "SuperCoins", "Flying Returns", "EDGE Rewards", "NeuCoins", "Starbucks Rewards", "CRED Coins", "Regalia Reward Points"),
  "category": "airlines" | "hotels" | "banking" | "shopping" | "dining" | "fuel" | "supermarket" | "entertainment" | "travel" | "other",
  "current_balance": integer (>= 0),
  "expiring_points": integer (>= 0),
  "expiry_date": string or null (YYYY-MM-DD),
  "membership_id": string or null,
  "point_value_inr": number (estimated value per point in INR, default 0.25),
  "confidence_score": number (0.0 to 1.0)
}`;

    const geminiKey = getGeminiApiKey();
    const deepSeekKey = getDeepSeekApiKey();
    const openAiKey = getOpenAiApiKey();

    // Routing Logic:
    // 1. If images or unread binary PDFs are attached AND GEMINI_API_KEY is present -> use Gemini 2.0 Flash Vision
    // 2. For all Text, HTML, and extracted PDF Statements -> use DeepSeek-V3 (deepseek-chat)
    // 3. Fallback to Gemini 2.0 Flash if DeepSeek is not configured
    if ((hasImages || hasUnreadPdfs) && geminiKey) {
      return this.callGemini(prompt, hasImages ? imageAttachments : rawPdfAttachments);
    } else if (deepSeekKey && cleanBody) {
      return this.callDeepSeek(prompt);
    } else if (geminiKey) {
      return this.callGemini(prompt, allAttachments);
    } else if (hasUnreadPdfs) {
      // PDF was attached but could not be decompressed/read and no vision multimodal fallback was configured
      return {
        is_loyalty_statement: false,
        reason: 'PDF_UNREADABLE',
      };
    } else if (openAiKey) {
      return this.callOpenAI(prompt);
    }
    return null;
  }

  static async callGemini(prompt, attachments = []) {
    const key = getGeminiApiKey();
    if (!key) return null;
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const parts = [];

    // Multimodal PDF & Image Attachment Ingestion
    if (Array.isArray(attachments)) {
      for (const att of attachments.slice(0, 3)) {
        if (att.base64Data) {
          const mimeType = att.mimeType || (att.filename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: att.base64Data,
            },
          });
        }
      }
    }

    parts.push({ text: prompt });

    const response = await callProvider('Gemini', url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;
    return JSON.parse(candidateText);
  }

  static async callOpenAI(prompt) {
    const key = getOpenAiApiKey();
    if (!key) return null;
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await callProvider('OpenAI', url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  }

  static async callDeepSeek(prompt) {
    const key = getDeepSeekApiKey();
    if (!key) return null;
    const url = `${getDeepSeekBaseUrl().replace(/\/+$/, '')}/chat/completions`;
    const response = await callProvider('DeepSeek', url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: getDeepSeekModel(),
        messages: [
          {
            role: 'system',
            content: 'You are a precision loyalty rewards and financial points extraction engine. Return ONLY valid JSON matching the requested schema.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  }
}
