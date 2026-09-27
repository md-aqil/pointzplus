// server/services/statementParser.js
// Deterministic loyalty-statement parser.
//
// Points only: coupon/promo-token extraction was removed because it produced a
// high false-positive rate (bank account numbers and shipment tracking IDs were
// persisted as "coupon codes"). This module now extracts balances, expiry and
// account numbers from loyalty statements and nothing else.

import crypto from 'crypto';

/**
 * 20+ Popular Loyalty Program Rules
 */
export const STATEMENT_RULES = [
  {
    programId: 'intermills',
    programName: 'InterMiles Airline',
    category: 'airlines',
    domains: ['intermiles.com', 'jetprivilege.com'],
    subjectKeywords: ['statement', 'miles summary', 'activity update', 'intermiles'],
    balanceRegex: /(?:total|available|current)\s*(?:miles|points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member(?:ship)?|account|no)[:\s#]*([A-Z0-9*-]{4,14})/i,
    expiryRegex: /([0-9,]+)\s*(?:miles|pts|points)\s*expir(?:e|ing)\s*(?:on|by)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.25,
  },
  {
    programId: 'air_india',
    programName: 'Air India Flying Returns',
    category: 'airlines',
    domains: ['airindia.com', 'flyingreturns.co.in', 'airindia.in'],
    subjectKeywords: ['flying returns', 'statement', 'miles balance', 'e-statement'],
    balanceRegex: /(?:points|miles|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:ffn|member(?:ship)?|id)[:\s#]*([A-Z0-9*-]{4,14})/i,
    expiryRegex: /([0-9,]+)\s*pts.*expire\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.45,
  },
  {
    programId: 'club_vistara',
    programName: 'Club Vistara',
    category: 'airlines',
    domains: ['airvistara.com', 'vistara.com'],
    subjectKeywords: ['club vistara', 'cv points', 'statement'],
    balanceRegex: /(?:cv points|points balance|available points|total miles|miles balance|available miles)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:cv id|membership no|id)[:\s#]*([0-9*-]{6,12})/i,
    expiryRegex: /([0-9,]+)\s*(?:cv points|points)\s*expir(?:e|ing)\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.60,
  },
  {
    programId: 'indigo_6e',
    programName: 'IndiGo 6E Rewards',
    category: 'airlines',
    domains: ['goindigo.in', '6e-rewards.com'],
    subjectKeywords: ['6e rewards', 'indigo statement', 'rewards summary'],
    balanceRegex: /(?:6e rewards|reward points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member id|account no)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expir(?:e|ing)\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.35,
  },
  {
    programId: 'marriott_bonvoy',
    programName: 'Marriott Bonvoy',
    category: 'hotels',
    domains: ['marriott.com', 'marriottbonvoy.com', 'email.marriott.com'],
    subjectKeywords: ['marriott bonvoy', 'account update', 'points summary', 'activity'],
    balanceRegex: /(?:total points|points balance|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member no|account)[:\s#]*([0-9*-]{6,12})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expiring(?:\s*on\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}))?/i,
    pointValueINR: 0.70,
  },
  {
    programId: 'hilton_honors',
    programName: 'Hilton Honors',
    category: 'hotels',
    domains: ['hilton.com', 'hiltonhonors.com'],
    subjectKeywords: ['hilton honors', 'monthly activity', 'points balance'],
    balanceRegex: /(?:points balance|total honors points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:honors #|account)[:\s#]*([0-9*-]{6,12})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expir(?:e|ing)/i,
    pointValueINR: 0.40,
  },
  {
    programId: 'taj_epicure',
    programName: 'Taj Epicure / Tata Neu',
    category: 'hotels',
    domains: ['tajhotels.com', 'tataneu.com', 'ihcltata.com'],
    subjectKeywords: ['taj epicure', 'neucoins', 'epicure points'],
    balanceRegex: /(?:neucoins|epicure points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:membership no|member id)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*(?:neucoins|points)\s*expir(?:e|ing)\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'hdfc_mycards',
    programName: 'HDFC Regalia / Infinia Points',
    category: 'banking',
    domains: ['hdfcbank.com', 'hdfcbank.net', 'mycards.hdfcbank.com'],
    subjectKeywords: ['credit card statement', 'reward points', 'mycards', 'regalia', 'infinia'],
    balanceRegex: /(?:reward points|points balance|closing balance|available points)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending in|a\/c no|card #)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expir(?:e|ing)\s*(?:on|by)?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'sbi_rewardz',
    programName: 'SBI Card Reward Points',
    category: 'banking',
    domains: ['sbicard.com', 'sbirewardz.com'],
    subjectKeywords: ['sbi card', 'reward points statement', 'rewardz balance'],
    balanceRegex: /(?:reward points balance|total reward points|rewardz balance|reward points|points balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending|account no)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.25,
  },
  {
    programId: 'icici_rewards',
    programName: 'ICICI Rewards (i-Points)',
    category: 'banking',
    domains: ['icicibank.com'],
    subjectKeywords: ['icici bank statement', 'reward points', 'handpicked rewards'],
    balanceRegex: /(?:reward points|points balance|i-points)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending in|account)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
    pointValueINR: 0.25,
  },
  {
    programId: 'axis_edge',
    programName: 'Axis EDGE REWARDS',
    category: 'banking',
    domains: ['axisbank.com', 'edgerewards.axisbank.co.in'],
    subjectKeywords: ['edge rewards', 'axis bank statement', 'points summary'],
    balanceRegex: /(?:edge rewards|points balance|total points)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending|account)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.20,
  },
  {
    programId: 'amex_mr',
    programName: 'American Express Membership Rewards',
    category: 'banking',
    domains: ['americanexpress.com', 'americanexpress.co.in', 'welcome.americanexpress.com'],
    subjectKeywords: ['membership rewards', 'points statement', 'amex balance'],
    balanceRegex: /(?:membership rewards|points balance|available balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending in|card\s*#)[:\s#]*([0-9*]{4,5})/i,
    expiryRegex: null, // Amex MR points do not expire
    pointValueINR: 0.50,
  },
  {
    programId: 'flipkart_supercoins',
    programName: 'Flipkart SuperCoins',
    category: 'shopping',
    domains: ['flipkart.com', 'flipkartemail.com', 'myntra.com'],
    subjectKeywords: ['supercoins', 'supercoin statement', 'coins added', 'balance update'],
    // Both orders occur in the wild: "SuperCoins: 899" (body) and
    // "18 SuperCoins on the way!" (Myntra/Flipkart subject line).
    balanceRegex: /(?:supercoins?|coins balance|available coins)[:\s]*([0-9,]+)|([0-9,]+)\s*(?:supercoins?|coins)\b/i,
    accountRegex: /(?:user|account|member)[:\s#]*([A-Za-z0-9_*-]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*coins\s*expir(?:e|ing)\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'amazon_pay_rewards',
    programName: 'Amazon Pay Rewards & Cashback',
    category: 'shopping',
    domains: ['amazon.in', 'amazon.com'],
    subjectKeywords: ['amazon pay', 'cashback balance', 'rewards earned', 'gift card balance'],
    balanceRegex: /(?:amazon pay balance|cashback earned|rewards balance)[:\s]*₹?\s*([0-9,]+)/i,
    accountRegex: /(?:account|ending)[:\s#]*([A-Za-z0-9*-]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*(?:balance|cashback)\s*expir(?:e|ing)/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'swiggy_one',
    programName: 'Swiggy One Points',
    category: 'food_delivery',
    domains: ['swiggy.in', 'swiggy.com'],
    subjectKeywords: ['swiggy one', 'supercoins', 'order statement', 'swiggy money'],
    balanceRegex: /(?:supercoins|swiggy money|points balance)[:\s]*₹?\s*([0-9,]+)/i,
    accountRegex: /(?:account|phone)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'zomato_gold',
    programName: 'Zomato Gold',
    category: 'dining',
    domains: ['zomato.com', 'mail.zomato.com'],
    subjectKeywords: ['zomato gold', 'credits balance', 'zomato points'],
    balanceRegex: /(?:credits?|points balance|balance)[:\s]*₹?\s*([0-9,]+)/i,
    accountRegex: /(?:user|account)[:\s#]*([A-Za-z0-9*-]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*credits\s*expire\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'cult_fit',
    programName: 'Cult.fit FitCoins',
    category: 'health',
    domains: ['cult.fit', 'cure.fit'],
    subjectKeywords: ['fitcoins', 'workout summary', 'cult.fit rewards'],
    balanceRegex: /(?:fitcoins?|coins balance|points)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member|user)[:\s#]*([A-Za-z0-9*-]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*coins\s*expir(?:e|ing)\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 0.50,
  },
  {
    programId: 'bookmyshow',
    programName: 'BookMyShow Rewards',
    category: 'entertainment',
    domains: ['bookmyshow.com', 'bms.com'],
    subjectKeywords: ['bookmyshow', 'rewards balance', 'movie voucher'],
    balanceRegex: /(?:rewards?|points balance|bms cash)[:\s]*₹?\s*([0-9,]+)/i,
    accountRegex: /(?:account|phone)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*(?:points|cash)\s*expire\s*(?:on)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    pointValueINR: 1.00,
  },
  {
    programId: 'airtel_thanks',
    programName: 'Airtel Thanks Rewards',
    category: 'telecom',
    domains: ['airtel.in', 'airtel.com'],
    subjectKeywords: ['airtel thanks', 'rewards update', 'airtel payments'],
    balanceRegex: /(?:supercoins|rewards balance|points)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:mobile|account\s*no)[:\s#]*([0-9*]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
    pointValueINR: 0.25,
  },
];

/**
 * Deterministic loyalty-statement parser for the supported programs.
 */
export class StatementParser {

  /**
   * Generates a stable SHA-256 hash for message idempotency & deduplication
   */
  static generateMessageHash(messageId, sender, subject, date) {
    const raw = `${messageId || ''}-${sender || ''}-${subject || ''}-${date || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Universal parse entrypoint for incoming emails
   */
  static parseEmail({
    messageId,
    fromHeader = '',
    subjectHeader = '',
    bodyText = '',
    bodyHtml = '',
    receivedDate = new Date().toISOString(),
  }) {
    const from = fromHeader.toLowerCase();
    const subject = subjectHeader.toLowerCase();
    const htmlStripped = bodyHtml ? bodyHtml.replace(/<[^>]+>/g, ' ') : '';
    const fullContent = `${bodyText} ${htmlStripped}`;

    // Loyalty statements only — coupon extraction was removed.
    const loyaltyData = this.parseLoyaltyStatement(from, subject, fullContent, receivedDate);

    return {
      messageIdHash: this.generateMessageHash(messageId, fromHeader, subjectHeader, receivedDate),
      isLoyaltyStatement: !!loyaltyData,
      loyaltyData,
    };
  }

  /**
   * Keywords that appear on almost every statement and therefore identify
   * nothing. Without penalising them, a longer-but-generic term like
   * "statement" outranks a short-but-distinctive one like "regalia", and the
   * wrong programme wins.
   */
  static get WEAK_SUBJECT_KEYWORDS() {
    return new Set([
      'statement', 'e-statement', 'activity', 'summary', 'update',
      'account update', 'balance update', 'points summary', 'monthly activity',
      'points statement', 'credit card statement', 'activity update',
    ]);
  }

  /**
   * Rank candidate rules for an email instead of taking the first hit.
   *
   * The old code used `STATEMENT_RULES.find(...)`, which is first-match-wins.
   * Several rules list the bare word "statement" as a subject keyword
   * (intermiles, air_india, club_vistara), so ANY email whose subject contained
   * "statement" was captured by whichever rule came first in the file — an HDFC
   * "Regalia Points Statement" was attributed to InterMiles and wrote its
   * balance to the wrong account.
   *
   * Ordering now prefers:
   *   1. a sender-domain match (the most reliable signal), then
   *   2. subject matches ranked by how distinctive the keyword is. Generic terms
   *      are demoted to a near-zero score so a specific brand phrase always wins.
   */
  static rankRules(from, subject) {
    const weak = this.WEAK_SUBJECT_KEYWORDS;
    const byDomain = [];
    const bySubject = [];

    for (const rule of STATEMENT_RULES) {
      if ((rule.domains || []).some((d) => from.includes(d))) {
        byDomain.push({ rule, score: Infinity, generic: false });
        continue;
      }
      const hits = (rule.subjectKeywords || []).filter((k) => subject.includes(k));
      if (hits.length > 0) {
        // Specific keyword: longer term scores higher. Generic terms are pushed
        // to the bottom regardless of length.
        const score = Math.max(...hits.map((k) => (weak.has(k) ? 1 : k.length + 10)));
        bySubject.push({ rule, score, generic: score === 1 });
      }
    }

    bySubject.sort((a, b) => b.score - a.score);
    return [...byDomain, ...bySubject];
  }

  /**
   * Parses Loyalty Statement balances & expiration
   */
  static parseLoyaltyStatement(from, subject, content, date) {
    for (const { rule: matchedRule, generic } of this.rankRules(from, subject)) {
      // A generic-keyword-only candidate (e.g. a subject that merely says
      // "statement") identifies no brand. It may only be used if nothing more
      // specific claimed the message — never as a fallback for a stronger
      // candidate that simply failed to parse. Guessing here writes one
      // program's balance onto another's account, which is worse than
      // extracting nothing.
      if (generic) break;

      // A rule that matched the identity signal but whose balance pattern does
      // not fit this message must not win — fall through to the next candidate.
      const balanceMatch =
        content.match(matchedRule.balanceRegex) || subject.match(matchedRule.balanceRegex);
      if (!balanceMatch) continue;

      const balanceRaw = balanceMatch[1] ?? balanceMatch[2];
      const balanceNum = parseInt(String(balanceRaw ?? '').replace(/,/g, ''), 10);
      if (isNaN(balanceNum) || balanceNum < 0 || balanceNum > 50000000) continue;

      // 2. Account Number Match
      let accountNumber = 'MEMBER-***';
      const accountMatch = content.match(matchedRule.accountRegex);
      if (accountMatch && accountMatch[1]) {
        accountNumber = accountMatch[1].trim();
      }

      // 3. Expiry Match
      let expiringPoints = 0;
      let expiryDate = null;
      if (matchedRule.expiryRegex) {
        const expMatch = content.match(matchedRule.expiryRegex);
        if (expMatch) {
          if (expMatch[1]) expiringPoints = parseInt(expMatch[1].replace(/,/g, ''), 10) || 0;
          if (expMatch[2]) {
            const parsedDate = new Date(expMatch[2]);
            if (!isNaN(parsedDate.getTime())) {
              expiryDate = parsedDate.toISOString();
            }
          }
        }
      }

      // Fallback general expiry detection if program didn't catch it
      if (!expiryDate) {
        const generalExp = content.match(/(?:expiring on|expires on|valid until|points expiring)[:\s]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{4})/i);
        if (generalExp && generalExp[1]) {
          const d = new Date(generalExp[1]);
          if (!isNaN(d.getTime())) expiryDate = d.toISOString();
        }
      }

      return {
        programId: matchedRule.programId,
        programName: matchedRule.programName,
        category: matchedRule.category,
        pointValueINR: matchedRule.pointValueINR,
        balance: balanceNum,
        accountNumber,
        expiringPoints,
        expiryDate,
        confidence: 0.98,
        sourceDate: date,
      };
    }

    return null;
  }

}
