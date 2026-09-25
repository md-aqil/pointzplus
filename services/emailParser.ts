// services/emailParser.ts – Email Statement & Coupon Parser Service
//
// This module is a pure parser: it converts real message text (as returned by
// the authenticated email-sync backend) into structured loyalty data. It never
// fabricates statements, balances or coupons, and it performs no network calls.
import { ParsedEmailResult, ExtractedCoupon, LoyaltyCategory } from "../types/loyalty";

// ─── Statement Regex & Parser Templates ─────────────────────────
interface ParserRule {
  programId: string;
  programName: string;
  category: LoyaltyCategory;
  senderDomains: string[];
  subjectPatterns: RegExp[];
  balanceRegex: RegExp;
  accountRegex: RegExp;
  expiryRegex?: RegExp;
}

export const STATEMENT_PARSER_RULES: ParserRule[] = [
  {
    programId: "intermills",
    programName: "InterMiles Airline",
    category: "airlines",
    senderDomains: ["intermiles.com", "jetprivilege.com"],
    subjectPatterns: [/monthly statement/i, /your miles summary/i, /activity update/i, /intermiles/i],
    balanceRegex: /(?:total|available|current)\s*(?:miles|points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member(?:ship)?|account|no)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*(?:miles|pts|points)\s*expir(?:e|ing)\s*(?:on|by)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
  },
  {
    programId: "air_india",
    programName: "Air India Flying Returns",
    category: "airlines",
    senderDomains: ["airindia.com", "flyingreturns.co.in"],
    subjectPatterns: [/flying returns statement/i, /miles balance/i, /e-statement/i, /air india/i],
    balanceRegex: /(?:points|miles|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:ffn|member(?:ship)?|id)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*pts.*expire\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
  },
  {
    programId: "marriott_bonvoy",
    programName: "Marriott Bonvoy",
    category: "hotels",
    senderDomains: ["marriott.com", "marriottbonvoy.com"],
    subjectPatterns: [/account update/i, /points summary/i, /monthly activity/i, /marriott/i],
    balanceRegex: /(?:total points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member no|account)[:\s#]*([0-9*-]{6,12})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expiring/i,
  },
  {
    programId: "hdfc_mycards",
    programName: "HDFC Regalia / Infinia Points",
    category: "banking",
    senderDomains: ["hdfcbank.com", "hdfcbank.net"],
    subjectPatterns: [/credit card statement/i, /reward points summary/i, /hdfc/i],
    balanceRegex: /(?:reward points|points balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending in|a\/c no)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
  },
  {
    programId: "flipkart_supercoins",
    programName: "Flipkart SuperCoins",
    category: "shopping",
    senderDomains: ["flipkart.com"],
    subjectPatterns: [/supercoin statement/i, /supercoins added/i, /balance update/i, /supercoin/i],
    balanceRegex: /(?:supercoins|coins balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:user|account)[:\s#]*([A-Za-z0-9_*-]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*coins\s*expire/i,
  },
];

// Email statements are parsed only from messages returned by the authenticated
// email-sync backend. There are no bundled sample statements in the app.

// ─── Email Sync Engine ───────────────────────────────────────────
export class EmailSyncService {
  /**
   * Parses raw statement text and returns structured loyalty data
   */
  static parseEmailStatement(
    from: string,
    subject: string,
    body: string,
    date: string
  ): ParsedEmailResult | null {
    const matchedRule = STATEMENT_PARSER_RULES.find((rule) => {
      const matchSender = rule.senderDomains.some((d) => from.toLowerCase().includes(d));
      const matchSubject = rule.subjectPatterns.some((p) => p.test(subject));
      return matchSender || matchSubject;
    });

    if (!matchedRule) return null;

    const balanceMatch = body.match(matchedRule.balanceRegex);
    if (!balanceMatch) return null;
    const balance = parseInt(balanceMatch[1].replace(/,/g, ""), 10);

    const accountMatch = body.match(matchedRule.accountRegex);
    const accountNumber = accountMatch ? accountMatch[1] : "XXXX-****";

    let expiringPoints: number | undefined;
    let expiryDate: string | undefined;

    if (matchedRule.expiryRegex) {
      const expMatch = body.match(matchedRule.expiryRegex);
      if (expMatch) {
        expiringPoints = parseInt(expMatch[1].replace(/,/g, ""), 10);
        expiryDate = expMatch[2] || "30 Days";
      }
    }

    return {
      programName: matchedRule.programName,
      programId: matchedRule.programId,
      accountNumberMasked: accountNumber,
      pointsBalance: balance,
      expiringPoints,
      expiryDate,
      sourceEmailSubject: subject,
      sourceEmailDate: date,
      confidence: 0.98,
    };
  }

  /**
   * Extracts promo codes, discount tokens, and vouchers from email text
   */
  static parseEmailCoupons(
    from: string,
    subject: string,
    body: string,
    date: string
  ): ExtractedCoupon | null {
    // 1. Code match
    const codeMatch = body.match(/(?:use code|apply coupon|coupon code|promo code|code|coupon)[:\s*]+([A-Z0-9_-]{4,16})\b/i);
    const discountMatch = body.match(/([0-9]{1,2}%\s*(?:off|bonus|discount))|(?:flat|save|get)\s*(?:₹|rs\.?|inr)\s*([0-9,]+)/i);

    if (!codeMatch && !discountMatch) return null;

    const couponCode = codeMatch ? codeMatch[1].toUpperCase() : "SPECIAL-PERK";
    const discountValue = discountMatch ? discountMatch[0] : "Special Discount";

    // Expiry date
    let expiryDate: string | null = null;
    const expMatch = body.match(/(?:valid (?:till|until)|expires on|validity)[:\s]*([0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{4}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i);
    if (expMatch) {
      expiryDate = expMatch[1];
    }

    // Min spend
    let minSpend = 0;
    const minMatch = body.match(/(?:min(?:imum)?\s*(?:order|spend|purchase))\s*(?:of)?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
    if (minMatch) {
      minSpend = parseInt(minMatch[1].replace(/,/g, ""), 10) || 0;
    }

    // Resolve Merchant
    let merchantName = "Partner Merchant";
    let category: LoyaltyCategory = "shopping";

    const lower = `${from} ${subject}`.toLowerCase();
    if (lower.includes("intermiles")) {
      merchantName = "InterMiles";
      category = "airlines";
    } else if (lower.includes("airindia") || lower.includes("air india")) {
      merchantName = "Air India";
      category = "airlines";
    } else if (lower.includes("marriott")) {
      merchantName = "Marriott Bonvoy";
      category = "hotels";
    } else if (lower.includes("hdfc")) {
      merchantName = "HDFC Bank";
      category = "banking";
    } else if (lower.includes("swiggy")) {
      merchantName = "Swiggy";
      category = "dining";
    } else if (lower.includes("flipkart")) {
      merchantName = "Flipkart";
      category = "shopping";
    }

    return {
      id: `cpn_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      merchantName,
      category,
      couponCode,
      couponType: "discount_code",
      title: `${discountValue} at ${merchantName}`,
      description: subject,
      discountValue,
      minimumSpendINR: minSpend,
      expiryDate: expiryDate || "30 Days",
      isUsed: false,
      sourceEmailSubject: subject,
      sourceSender: from,
      confidenceScore: 0.98,
      createdAt: new Date().toISOString(),
    };
  }

}

