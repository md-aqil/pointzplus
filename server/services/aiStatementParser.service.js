// server/services/aiStatementParser.service.js
// Next-Gen Hybrid AI Statement Parser for PointzPlus
//
// Extracts loyalty balances, expiry dates, and program metadata using LLM
// structured extraction (Gemini / OpenAI) with automatic fallback to the
// deterministic StatementParser rules engine.

import crypto from 'crypto';
import { StatementParser } from './statementParser.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4.1-flash';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

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
// so every AI call is bounded by a timeout and retried with backoff.
const AI_TIMEOUT_MS = Math.max(1, Number.parseInt(process.env.AI_TIMEOUT_MS || '20000', 10) || 20000);
const AI_MAX_RETRIES = Math.max(0, Number.parseInt(process.env.AI_MAX_RETRIES || '2', 10) || 2);
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
      };
    }

    // 3. If AI credentials are present, attempt AI structured extraction (including PDFs)
    if (GEMINI_API_KEY || OPENROUTER_API_KEY || OPENAI_API_KEY || DEEPSEEK_API_KEY) {
      try {
        const aiResult = await this.extractWithAI({
          fromHeader,
          subjectHeader,
          bodyText,
          bodyHtml,
          receivedDate,
          pdfAttachments,
        });

        if (aiResult && aiResult.is_loyalty_statement && typeof aiResult.current_balance === 'number') {
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
      } catch (aiErr) {
        console.warn(`[AIStatementParser] AI extraction error on message ${messageId}:`, aiErr.message);
      }
    }

    return {
      messageIdHash,
      isLoyaltyStatement: false,
      loyaltyData: null,
    };
  }

  /**
   * LLM Extraction using Gemini API (with multimodal PDF support), OpenAI API, or DeepSeek API
   */
  static async extractWithAI({ fromHeader, subjectHeader, bodyText, bodyHtml, receivedDate, pdfAttachments = [] }) {
    const cleanBody = (bodyText || bodyHtml.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2500);

    const hasPdfs = Array.isArray(pdfAttachments) && pdfAttachments.length > 0;
    const attachmentNote = hasPdfs
      ? `\nAttached Files: ${pdfAttachments.map((p) => p.filename || 'statement.pdf').join(', ')} (Please analyze the attached PDF statement content for points balances, account IDs, and expiry dates).`
      : '';

    const prompt = `You are a precision loyalty rewards, air miles, and points parser.
Analyze this email ${hasPdfs ? 'and its attached statement document(s)' : ''} to extract loyalty balances and reward updates in any format.

Email Metadata:
From: ${fromHeader}
Subject: ${subjectHeader}
Received Date: ${receivedDate}${attachmentNote}

Email Content:
"""
${cleanBody || '(See attached PDF document)'}
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

    // Priority routing: Gemini (native PDF) -> NVIDIA DeepSeek -> OpenRouter (free/byok) -> OpenAI -> DeepSeek
    if (GEMINI_API_KEY) {
      return this.callGemini(prompt, pdfAttachments);
    } else if (NVIDIA_API_KEY) {
      return this.callNvidiaDeepSeek(prompt, pdfAttachments);
    } else if (OPENROUTER_API_KEY) {
      return this.callOpenRouter(prompt);
    } else if (OPENAI_API_KEY) {
      return this.callOpenAI(prompt);
    } else if (DEEPSEEK_API_KEY) {
      return this.callDeepSeek(prompt);
    }
    return null;
  }

  static async callGemini(prompt, pdfAttachments = []) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const parts = [];

    // Multimodal PDF Ingestion
    if (Array.isArray(pdfAttachments)) {
      for (const pdf of pdfAttachments.slice(0, 3)) {
        if (pdf.base64Data) {
          parts.push({
            inline_data: {
              mime_type: 'application/pdf',
              data: pdf.base64Data,
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

  static async callNvidiaDeepSeek(prompt, pdfAttachments = []) {
    const url = `${NVIDIA_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
    const response = await callProvider('NvidiaDeepSeek', url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }

  static async callOpenRouter(prompt) {
    const candidateModels = [
      process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'openrouter/free',
    ];
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    for (const model of candidateModels) {
      try {
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://pointzplus.app',
            'X-Title': 'PointzPlus',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
        }, 8000);

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) continue;

        const match = content.match(/\{[\s\S]*\}/);
        if (!match) continue;
        return JSON.parse(match[0]);
      } catch {
        // try next candidate model
      }
    }
    return null;
  }

  static async callOpenAI(prompt) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await callProvider('OpenAI', url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
    const url = 'https://api.deepseek.com/chat/completions';
    const response = await callProvider('DeepSeek', url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
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
}
