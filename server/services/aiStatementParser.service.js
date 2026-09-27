// server/services/aiStatementParser.service.js
// Next-Gen Hybrid AI Statement Parser for PointzPlus
//
// Extracts loyalty balances, expiry dates, and program metadata using LLM
// structured extraction (Gemini / OpenAI) with automatic fallback to the
// deterministic StatementParser rules engine.

import crypto from 'crypto';
import { StatementParser } from './statementParser.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
  }) {
    const messageIdHash = StatementParser.generateMessageHash(
      messageId,
      fromHeader,
      subjectHeader,
      receivedDate
    );

    // 1. If AI credentials are present, attempt AI extraction
    if (GEMINI_API_KEY || OPENAI_API_KEY) {
      try {
        const aiResult = await this.extractWithAI({
          fromHeader,
          subjectHeader,
          bodyText,
          bodyHtml,
          receivedDate,
        });

        if (aiResult && aiResult.is_loyalty_statement && typeof aiResult.current_balance === 'number') {
          // Sanity check numeric value: reject phone numbers, OTPs, tracking IDs
          const balance = Math.round(aiResult.current_balance);
          if (balance >= 0 && balance < 50_000_000) {
            // The model is asked for a category, but its vocabulary drifts from
            // the one the app can actually render (it likes "supermarket"/"travel").
            // Map anything unrecognised to 'other' rather than storing a value no
            // component knows how to label.
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
              source: 'ai_extractor',
              loyaltyData: {
                programId: (aiResult.brand_name || 'program')
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '_'),
                programName,
                brandName: aiResult.brand_name || programName,
                category,
                accentColor: CATEGORY_COLORS[category] || '#01A2FB',
                // Deliberately NOT taken from the model. point_value_inr drives
                // portfolio value in INR, and a hallucinated estimate would
                // silently corrupt it. Use the conservative default and let a
                // human correct it via the catalogue.
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

    // 2. Fallback to deterministic regex-based rules parser
    const ruleResult = StatementParser.parseEmail({
      messageId,
      fromHeader,
      subjectHeader,
      bodyText,
      bodyHtml,
      receivedDate,
    });

    return {
      ...ruleResult,
      source: 'rule_parser',
    };
  }

  /**
   * LLM Extraction using Gemini API or OpenAI API
   */
  static async extractWithAI({ fromHeader, subjectHeader, bodyText, bodyHtml, receivedDate }) {
    const cleanBody = (bodyText || bodyHtml.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2500);

    const prompt = `You are a precision loyalty rewards and points parser.
Analyze this email to determine if it is a genuine loyalty points/miles statement or balance notification.

Email Metadata:
From: ${fromHeader}
Subject: ${subjectHeader}
Received Date: ${receivedDate}

Email Content Snippet:
"""
${cleanBody}
"""

Rules:
1. Extract points only from real loyalty programs (airlines, hotels, credit cards, retail points, SuperCoins, dining coins, miles).
2. DO NOT confuse fiat monetary transactions (e.g. ₹500 paid, $20 spent), bank account numbers, OTP codes, shipment tracking IDs, or order numbers as loyalty points.
3. If no loyalty points balance is present in this email, return "is_loyalty_statement": false.

Respond ONLY with valid JSON conforming to this schema:
{
  "is_loyalty_statement": boolean,
  "brand_name": string (e.g. "Flipkart", "Air India", "InterMiles", "Myntra", "Marriott", "Axis Bank", "Tata Neu"),
  "program_name": string (e.g. "SuperCoins", "Flying Returns", "EDGE Rewards", "NeuCoins"),
  "category": "airlines" | "hotels" | "banking" | "shopping" | "dining" | "fuel" | "supermarket" | "entertainment" | "travel" | "other",
  "current_balance": integer (>= 0),
  "expiring_points": integer (>= 0),
  "expiry_date": string or null (YYYY-MM-DD),
  "membership_id": string or null,
  "point_value_inr": number (estimated value per point in INR, default 0.25),
  "confidence_score": number (0.0 to 1.0)
}`;

    if (GEMINI_API_KEY) {
      return this.callGemini(prompt);
    } else if (OPENAI_API_KEY) {
      return this.callOpenAI(prompt);
    }
    return null;
  }

  static async callGemini(prompt) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await callProvider('Gemini', url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
}
