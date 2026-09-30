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
    pointValueINR: 1.00,
  },
  {
    programName: 'Airtel Thanks Rewards',
    category: 'telecom',
    domains: ['airtel.in', 'airtel.com'],
    subjectKeywords: ['airtel thanks', 'rewards update', 'airtel payments'],
    balanceRegex: /(?:supercoins|rewards balance|points)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:mobile|account\s*no)[:\s#]*([0-9*]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
    pointValueINR: 0.25,
  },
  {
    programId: 'vibeship_rewards',
    programName: 'Vibeship Rewards',
    category: 'other',
    domains: ['vibeship.in', 'vibeship.com'],
    subjectKeywords: ['vibeship', 'vibeship rewards', 'building with vibeship'],
    balanceRegex: [
      /(?:total\s+available\s+balance\s+is|available\s+balance\s+is(?:\s+now)?|vibeship\s+rewards\s+balance\s+is|you\s+(?:now\s+)?have|total\s+points|points\s+balance|balance\s+is(?:\s+now)?|balance)[:\s]*([0-9,]+)/i,
      /(?:earned(?:\s+you)?|added)[:\s]*([0-9,]+)\s*(?:points|vibeship rewards points)?/i,
    ],
    accountRegex: /(?:member(?:ship)?|account)[:\s#]*([A-Za-z0-9*-]{4,14})/i,
    expiryRegex: null,
    pointValueINR: 0.25,
  },
  {
    programId: 'jumsom_rewards',
    programName: 'Jumsom Growth Rewards',
    category: 'other',
    domains: ['jumsom.com'],
    subjectKeywords: ['jumsom', 'growth rewards', 'publishing rewards', 'jumsom points'],
    balanceRegex: [
      /(?:total\s+available\s+balance\s+is|available\s+balance\s+is(?:\s+now)?|growth\s+rewards\s+balance\s+is|you\s+now\s+have|total\s+points|points\s+balance|balance\s+is(?:\s+now)?|balance)[:\s]*([0-9,]+)/i,
      /(?:earned|added)[:\s]*([0-9,]+)\s*(?:jumsom growth rewards points|growth rewards points|points)?/i,
    ],
    accountRegex: /(?:member(?:ship)?|account)[:\s#]*([A-Za-z0-9*-]{4,14})/i,
    expiryRegex: null,
    pointValueINR: 0.25,
  },
  {
    programId: 'airasia_rewards',
    programName: 'AirAsia Rewards',
    category: 'airlines',
    domains: ['rewards.airasia.com', 'airasia.com'],
    subjectKeywords: ['airasia', 'airasia rewards', 'airasia points'],
    balanceRegex: /(?:airasia points|points balance|total points)[:\s*]*([0-9,]+)/i,
    accountRegex: /(?:member id)[:\s*]*([0-9*-]{4,14})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
    pointValueINR: 0.25,
  },
  {
    programId: 'bangkok_airways',
    programName: 'Bangkok Airways FlyerBonus',
    category: 'airlines',
    domains: ['bangkokair.com', 'flyerbonus.com'],
    subjectKeywords: ['bangkok airways', 'flyerbonus', 'skytrax'],
    balanceRegex: /(?:points balance|flyerbonus points|extra points|points|balance)[:\s*]*([0-9,]+)/i,
    accountRegex: /(?:member(?:ship)?|id)[:\s#]*([A-Za-z0-9*-]{4,14})/i,
    expiryRegex: null,
    pointValueINR: 0.35,
  },
  {
    programId: 'qatar_privilege',
    programName: 'Qatar Airways Privilege Club',
    category: 'airlines',
    domains: ['loyalty.qatarairways.com', 'qatarairways.com'],
    subjectKeywords: ['qatar airways', 'privilege club', 'qmiles', 'avios'],
    balanceRegex: /(?:avios balance|qmiles balance|points balance|available avios|avios|qmiles|points)[:\s*]*([0-9,]+)/i,
    accountRegex: /(?:membership no|member id)[:\s#]*([0-9*-]{6,12})/i,
    expiryRegex: /([0-9,]+)\s*(?:avios|qmiles|points)\s*expire/i,
    pointValueINR: 0.80,
  },
  {
    programId: 'indigo_bluchip',
    programName: 'IndiGo BluChip',
    category: 'airlines',
    domains: ['indigobluchip.goindigo.in', 'goindigo.in'],
    subjectKeywords: ['bluchip', 'indigo bluchip', '6e rewards'],
    balanceRegex: /(?:bluchip balance|available bluchips?|6e rewards|reward points|balance)[:\s*]*([0-9,]+)/i,
    accountRegex: /(?:member id|account no)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
    pointValueINR: 0.35,
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
   * Unwraps forwarded emails (Fwd: / Fw:) to extract the original sender and subject
   */
  static unwrapForwardedEmail(fromHeader = '', subjectHeader = '', bodyText = '', bodyHtml = '') {
    let effectiveFrom = fromHeader;
    let effectiveSubject = subjectHeader;
    const combined = `${bodyText}\n${bodyHtml.replace(/<[^>]+>/g, ' ')}`;

    // Check if this is a forwarded email
    const isForward =
      /^(?:fwd?|fw):\s*/i.test(subjectHeader) ||
      /---------- Forwarded message ---------/i.test(combined) ||
      /(?:^|\n)From:\s*[^<\n]+<[^>\n]+>/im.test(combined.slice(0, 1500));

    if (isForward) {
      // Clean leading Fwd: from subject
      effectiveSubject = subjectHeader.replace(/^(?:fwd?|fw):\s*/i, '').trim();

      // Look for embedded original "From:" in the first 1500 characters
      const fromMatch = combined.slice(0, 1500).match(/(?:^|\n)From:\s*([^\n\r]+)/i);
      if (fromMatch && fromMatch[1]) {
        effectiveFrom = fromMatch[1].trim();
      }

      // Look for embedded original "Subject:" if present
      const subjMatch = combined.slice(0, 1500).match(/(?:^|\n)Subject:\s*([^\n\r]+)/i);
      if (subjMatch && subjMatch[1]) {
        effectiveSubject = subjMatch[1].trim();
      }
    }

    return { effectiveFrom, effectiveSubject };
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
    // 1. Unwrap forwarded email headers if applicable
    const { effectiveFrom, effectiveSubject } = this.unwrapForwardedEmail(
      fromHeader,
      subjectHeader,
      bodyText,
      bodyHtml
    );

    const from = effectiveFrom.toLowerCase();
    const subject = effectiveSubject.toLowerCase();
    const htmlStripped = bodyHtml ? bodyHtml.replace(/<[^>]+>/g, ' ') : '';
    const fullContent = `${bodyText} ${htmlStripped}`;

    // 2. Try configured deterministic program rules first
    let loyaltyData = this.parseLoyaltyStatement(from, subject, fullContent, receivedDate);

    // 3. Fallback to universal dynamic heuristic parser for any brand
    if (!loyaltyData) {
      loyaltyData = this.parseUniversalLoyaltyStatement(effectiveFrom, effectiveSubject, fullContent, receivedDate);
    }

    return {
      messageIdHash: this.generateMessageHash(messageId, fromHeader, subjectHeader, receivedDate),
      isLoyaltyStatement: !!loyaltyData,
      loyaltyData,
    };
  }

  /**
   * Keywords that appear on almost every statement and therefore identify
   * nothing.
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
        const score = Math.max(...hits.map((k) => (weak.has(k) ? 1 : k.length + 10)));
        bySubject.push({ rule, score, generic: score === 1 });
      }
    }

    bySubject.sort((a, b) => b.score - a.score);
    return [...byDomain, ...bySubject];
  }

  /**
   * Parses Loyalty Statement balances & expiration against configured rules
   */
  static parseLoyaltyStatement(from, subject, content, date) {
    for (const { rule: matchedRule, generic } of this.rankRules(from, subject)) {
      if (generic) break;

      let balanceMatch = null;
      if (Array.isArray(matchedRule.balanceRegex)) {
        for (const regex of matchedRule.balanceRegex) {
          balanceMatch = content.match(regex) || subject.match(regex);
          if (balanceMatch) break;
        }
      } else {
        balanceMatch =
          content.match(matchedRule.balanceRegex) || subject.match(matchedRule.balanceRegex);
      }
      if (!balanceMatch) continue;

      const balanceRaw = balanceMatch[1] ?? balanceMatch[2];
      const balanceNum = parseInt(String(balanceRaw ?? '').replace(/,/g, ''), 10);
      if (isNaN(balanceNum) || balanceNum < 0 || balanceNum > 50000000) continue;

      // 2. Account Number Match
      let accountNumber = 'MEMBER-***';
      if (matchedRule.accountRegex) {
        const accountMatch = content.match(matchedRule.accountRegex);
        if (accountMatch && accountMatch[1]) {
          accountNumber = accountMatch[1].trim();
        }
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

  /**
   * Universal dynamic heuristic extractor for any brand / loyalty statement.
   * Enables 100% zero-config discovery for uncatalogued senders and custom reward programs.
   */
  static parseUniversalLoyaltyStatement(rawFrom, rawSubject, content, date) {
    const fromLower = rawFrom.toLowerCase();
    const subjectLower = rawSubject.toLowerCase();
    const contentLower = content.toLowerCase();

    // Must have explicit loyalty / points signals
    const hasLoyaltySignal =
      /(?:points|miles|neucoins|supercoins|qmiles|avios|cashback|growth rewards|rewards balance|rewards update|reward points|rewardz|points balance|extra points)/i.test(
        `${subjectLower} ${contentLower}`
      );

    if (!hasLoyaltySignal) return null;

    // Filter out common false positives (e.g., job alerts, bug trackers, generic billing without points)
    if (
      /(?:apply now|job alert|interview|github|gitlab|invoice|bill due|payment receipt)/i.test(subjectLower) &&
      !/(?:points balance|reward points|miles earned|points earned)/i.test(subjectLower)
    ) {
      return null;
    }

    // 1. Extract balance using high-precision patterns
    const balancePatterns = [
      /(?:total\s+)?available\s+balance\s+is(?:\s+now)?[:\s]*([0-9,]+)\s*(?:points|pts|miles|coins|rewards)?/i,
      /(?:total\s+)?points\s+balance\s+is(?:\s+now)?[:\s]*([0-9,]+)/i,
      /(?:reward\s+points|rewards\s+balance|growth\s+rewards\s+balance|available\s+balance|balance)\s+is(?:\s+now)?[:\s]*([0-9,]+)\s*(?:points|pts|miles)?/i,
      /(?:you\s+have|you\s+now\s+have)[:\s]*([0-9,]+)\s*(?:[A-Za-z]+\s+)?(?:points|pts|miles|coins|rewards)\s+available/i,
      /(?:earned|added|credited)\s+(?:you\s+)?([0-9,]+)\s*(?:[A-Za-z]+\s+)?(?:points|pts|miles|coins|rewards)/i,
      /([0-9,]+)\s*(?:points|pts|miles|coins|rewards)\s*(?:available|earned|added|balance|to your account)/i,
      /(?:airasia points|reward points|points balance|miles balance)[:\s*]*([0-9,]+)/i,
    ];

    let extractedBalance = null;
    for (const pattern of balancePatterns) {
      const match = content.match(pattern) || rawSubject.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1].replace(/,/g, ''), 10);
        if (!isNaN(num) && num >= 0 && num < 50000000) {
          extractedBalance = num;
          break;
        }
      }
    }

    if (extractedBalance === null) return null;

    // 2. Extract brand name
    let brandName = '';
    // Check for "Mukesh | Vibeship", "Mukesh Jha <hello@jumsom.com>", "Bangkok Airways FlyerBonus"
    const displaySenderMatch = rawFrom.match(/^["']?([^<"]+)["']?\s*<([^>]+)>/);
    if (displaySenderMatch) {
      const displayName = displaySenderMatch[1].trim();
      const emailPart = displaySenderMatch[2].trim();

      if (displayName.includes('|')) {
        brandName = displayName.split('|').pop().trim();
      } else if (!/(?:team|support|hello|noreply|mailers|admin)/i.test(displayName)) {
        brandName = displayName;
      }

      if (!brandName) {
        const domainMatch = emailPart.match(/@(?:(?:news|mailers|loyalty|rewards|auth)\.)?([a-zA-Z0-9-]+)\.[a-zA-Z]{2,}/);
        if (domainMatch && domainMatch[1]) {
          brandName = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
        }
      }
    } else {
      brandName = rawFrom.split('@')[0].replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    }

    if (!brandName || brandName.length < 2) {
      brandName = 'Loyalty Program';
    }

    // Check subject for refined program name (e.g. "Jumsom Growth Rewards", "Vibeship Rewards")
    const subjectProgMatch = rawSubject.match(/([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\s+(?:Rewards|Points|Club|Miles|FlyerBonus|BluChip))/);
    let programName = subjectProgMatch ? subjectProgMatch[1].trim() : `${brandName} Rewards`;

    // 3. Category heuristics
    let category = 'other';
    const textAll = `${rawSubject} ${contentLower} ${rawFrom}`.toLowerCase();
    if (/(?:airline|airways|flight|flyer|miles|skytrax|avios|qmiles)/i.test(textAll)) {
      category = 'airlines';
    } else if (/(?:hotel|bonvoy|resort|stay|suite|hilton|marriott|hyatt)/i.test(textAll)) {
      category = 'hotels';
    } else if (/(?:bank|credit card|card ending|account statement|regalia|infinia|rewardz)/i.test(textAll)) {
      category = 'banking';
    } else if (/(?:supercoins|cashback|shopping|order|flipkart|amazon|myntra)/i.test(textAll)) {
      category = 'shopping';
    } else if (/(?:food|dine|dining|zomato|swiggy|restaurant)/i.test(textAll)) {
      category = 'dining';
    }

    // 4. Account number extraction
    let accountNumber = 'MEMBER-***';
    const acctMatch = content.match(/(?:member(?:ship)?(?:\s*id|\s*no)?|account\s*no|card\s*ending)[:\s*#*]*([A-Za-z0-9*-]{4,16})/i);
    if (acctMatch && acctMatch[1]) {
      accountNumber = acctMatch[1].trim();
    }

    // 5. Expiry Date
    let expiryDate = null;
    const expMatch = content.match(/(?:expiring on|expires on|valid until|points expiring)[:\s]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{4})/i);
    if (expMatch && expMatch[1]) {
      const d = new Date(expMatch[1]);
      if (!isNaN(d.getTime())) expiryDate = d.toISOString();
    }

    const programId = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50);

    return {
      programId,
      programName,
      brandName,
      category,
      pointValueINR: 0.25,
      balance: extractedBalance,
      accountNumber,
      expiringPoints: 0,
      expiryDate,
      confidence: 0.92,
      sourceDate: date,
    };
  }
}

