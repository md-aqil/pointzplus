// server/services/statementAndCouponParser.js
// High-Performance Deterministic Statement & Coupon Parser Engine

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
    balanceRegex: /(?:cv points|points balance|available points)[:\s]*([0-9,]+)/i,
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
    balanceRegex: /(?:reward points balance|total reward points|balance)[:\s]*([0-9,]+)/i,
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
    domains: ['flipkart.com', 'flipkartemail.com'],
    subjectKeywords: ['supercoins', 'supercoin statement', 'coins added', 'balance update'],
    balanceRegex: /(?:supercoins?|coins balance|available coins)[:\s]*([0-9,]+)/i,
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
 * Deterministic Statement & Coupon Parser Engine
 */
export class StatementAndCouponParser {

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
    const hash = this.generateMessageHash(messageId, fromHeader, subjectHeader, receivedDate);

    // 1. Try Loyalty Statement Parsing
    const loyaltyData = this.parseLoyaltyStatement(from, subject, fullContent, receivedDate);

    // 2. Try Coupon & Voucher Token Parsing
    const couponData = this.parseCouponTokens(fromHeader, subjectHeader, fullContent, bodyHtml, receivedDate, hash);

    return {
      messageIdHash: hash,
      isLoyaltyStatement: !!loyaltyData,
      loyaltyData,
      isCoupon: !!couponData,
      couponData,
    };
  }

  /**
   * Parses Loyalty Statement balances & expiration
   */
  static parseLoyaltyStatement(from, subject, content, date) {
    const matchedRule = STATEMENT_RULES.find(rule => {
      const matchDomain = rule.domains.some(d => from.includes(d));
      const matchSubject = rule.subjectKeywords.some(k => subject.includes(k));
      return matchDomain || matchSubject;
    });

    if (!matchedRule) return null;

    // 1. Balance Match
    const balanceMatch = content.match(matchedRule.balanceRegex) || subject.match(matchedRule.balanceRegex);
    if (!balanceMatch) return null;

    const balanceNum = parseInt(balanceMatch[1].replace(/,/g, ''), 10);
    if (isNaN(balanceNum) || balanceNum < 0 || balanceNum > 50000000) return null;

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

  /**
   * Parses Promotional Coupons, Discount Vouchers, and Promo Codes
   */
  static parseCouponTokens(fromHeader, subjectHeader, content, rawHtml, date, hash) {
    // Coupon Code Matchers
    const CODE_PATTERNS = [
      /(?:use code|apply coupon|coupon code|promo code|voucher code|discount code)[:\s*]+([A-Z0-9_-]{4,18})\b/i,
      /\bcode[:\s]+<b>([A-Z0-9_-]{4,18})<\/b>/i,
      /\bcode[:\s]+"?([A-Z0-9_-]{4,18})"?\b/i,
      /\b([A-Z]{3,8}[0-9]{2,6})\b/, // e.g., SAVE200, DISK50, WELCOME100, VISTA25
    ];

    // Discount Value Matchers
    const DISCOUNT_PATTERNS = [
      /\b([0-9]{1,2}%\s*(?:off|discount|cashback))\b/i,
      /(?:flat|save|get)\s*(?:₹|rs\.?|inr)\s*([0-9,]+)\s*(?:off|cashback|discount)?/i,
      /(?:₹|rs\.?|inr)\s*([0-9,]+)\s*(?:off|cashback|discount|voucher)/i,
      /\b(2X|3X|5X)\s*(?:points|multiplier|rewards)\b/i,
      /\b(free\s+[0-9a-zA-Z\s]{3,20}(?:pass|subscription|delivery|stay))\b/i,
    ];

    // 1. Extract Coupon Code
    let couponCode = null;
    for (const pattern of CODE_PATTERNS) {
      const match = rawHtml.match(pattern) || content.match(pattern) || subjectHeader.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim().toUpperCase();
        // Discard common false positives like "HTTP", "HTML", "GMAIL"
        if (!['HTTP', 'HTTPS', 'HTML', 'GMAIL', 'EMAIL', 'ORDER', 'INVOICE'].includes(candidate)) {
          couponCode = candidate;
          break;
        }
      }
    }

    // 2. Extract Discount Value
    let discountValue = null;
    for (const pattern of DISCOUNT_PATTERNS) {
      const match = content.match(pattern) || subjectHeader.match(pattern);
      if (match) {
        discountValue = match[0].trim();
        break;
      }
    }

    // If neither a valid coupon code nor a clear promotional discount was found, skip
    if (!couponCode && !discountValue) {
      return null;
    }

    // 3. Extract Expiry Date
    let expiryDate = null;
    const expMatch = content.match(/(?:valid (?:till|until)|expires on|valid through|use before|ends on)[:\s]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,}\s+[0-9]{4})/i);
    if (expMatch && expMatch[1]) {
      const d = new Date(expMatch[1]);
      if (!isNaN(d.getTime())) {
        expiryDate = d.toISOString();
      }
    }

    // 4. Extract Minimum Spend Requirement
    let minimumSpendINR = 0;
    const minSpendMatch = content.match(/(?:min(?:imum)?\s*(?:order|spend|purchase|cart)\s*(?:of|value)?)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
    if (minSpendMatch && minSpendMatch[1]) {
      minimumSpendINR = parseFloat(minSpendMatch[1].replace(/,/g, '')) || 0;
    }

    // 5. Determine Merchant & Category
    const { merchantName, category } = this.resolveMerchantAndCategory(fromHeader, subjectHeader);

    // 6. Generate Clean Title & Description
    const title = discountValue 
      ? `${discountValue} at ${merchantName}`
      : `Exclusive Promo Code: ${couponCode}`;

    const description = subjectHeader.length > 80 
      ? `${subjectHeader.substring(0, 77)}...` 
      : subjectHeader;

    return {
      merchantName,
      category,
      couponCode: couponCode || 'AUTO-APPLY',
      couponType: 'discount_code',
      title,
      description,
      discountValue: discountValue || 'Special Discount',
      minimumSpendINR,
      expiryDate: expiryDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Default 14 days
      emailMessageIdHash: hash,
      sourceEmailSubject: subjectHeader,
      sourceSender: fromHeader,
      confidenceScore: couponCode ? 0.98 : 0.85,
    };
  }

  /**
   * Helper to map sender domain to clean Merchant Name and Category
   */
  static resolveMerchantAndCategory(fromHeader, subjectHeader) {
    const lower = `${fromHeader} ${subjectHeader}`.toLowerCase();

    if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('dominos') || lower.includes('eats')) {
      const merchant = lower.includes('swiggy') ? 'Swiggy' : (lower.includes('zomato') ? 'Zomato' : 'Dominos');
      return { merchantName: merchant, category: 'dining' };
    }
    if (lower.includes('airindia') || lower.includes('vistara') || lower.includes('indigo') || lower.includes('intermiles') || lower.includes('airline')) {
      const merchant = lower.includes('vistara') ? 'Club Vistara' : (lower.includes('indigo') ? 'IndiGo' : 'Air India');
      return { merchantName: merchant, category: 'airlines' };
    }
    if (lower.includes('marriott') || lower.includes('hilton') || lower.includes('taj') || lower.includes('hotel') || lower.includes('booking')) {
      const merchant = lower.includes('marriott') ? 'Marriott Bonvoy' : (lower.includes('hilton') ? 'Hilton' : 'Taj Hotels');
      return { merchantName: merchant, category: 'hotels' };
    }
    if (lower.includes('flipkart') || lower.includes('amazon') || lower.includes('myntra') || lower.includes('ajio') || lower.includes('nykaa')) {
      const merchant = lower.includes('flipkart') ? 'Flipkart' : (lower.includes('amazon') ? 'Amazon' : 'Myntra');
      return { merchantName: merchant, category: 'shopping' };
    }
    if (lower.includes('cult.fit') || lower.includes('curefit') || lower.includes('health') || lower.includes('pharmeasy')) {
      return { merchantName: 'Cult.fit', category: 'health' };
    }
    if (lower.includes('bookmyshow') || lower.includes('pvr') || lower.includes('inox') || lower.includes('entertainment')) {
      return { merchantName: 'BookMyShow', category: 'entertainment' };
    }
    if (lower.includes('hdfc') || lower.includes('sbi') || lower.includes('icici') || lower.includes('axis') || lower.includes('amex')) {
      const merchant = lower.includes('hdfc') ? 'HDFC Bank' : (lower.includes('sbi') ? 'SBI Card' : 'ICICI Bank');
      return { merchantName: merchant, category: 'banking' };
    }

    // Fallback: extract domain name
    const domainMatch = fromHeader.match(/@([a-zA-Z0-9.-]+)\./);
    const rawDomain = domainMatch ? domainMatch[1].replace(/^(mail|alerts|news|info|no-reply|notifications)\./i, '') : 'Partner';
    const merchantName = rawDomain.charAt(0).toUpperCase() + rawDomain.slice(1);

    return { merchantName, category: 'shopping' };
  }
}
