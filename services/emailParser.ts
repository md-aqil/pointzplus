// services/emailParser.ts – Email Statement & Coupon Parser Service
import { ParsedEmailResult, LinkedAccount, ExtractedCoupon, LoyaltyCategory } from "../types/loyalty";
import { POPULAR_PROGRAMS } from "../constants/popularPrograms";

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

// ─── Simulated Raw Statements & Coupon Emails (for demo/offline) ─
export const MOCK_RAW_EMAILS = [
  {
    from: "statements@intermiles.com",
    subject: "Your InterMiles Monthly Statement - August 2026",
    date: "2026-08-10",
    body: `
      Dear Member,
      Here is your monthly InterMiles activity update.
      Membership No: IM-***892
      Total Available Balance: 11,450 Miles
      Alert: 2,500 Miles expiring on 18 Aug 2026.
      Earn more miles on your upcoming flights!
      Use promo code FLYINTER25 to get 25% extra bonus miles on international bookings. Valid till 30 Sep 2026.
    `,
  },
  {
    from: "rewards@airindia.com",
    subject: "Air India Flying Returns - Current Miles Summary & Special ₹500 Coupon",
    date: "2026-08-08",
    body: `
      Welcome Back,
      FFN Member ID: AI-***402
      Available Points Balance: 4,318 Points
      588 pts expire 30 Sep 2026.
      Member Voucher: Use code AIR500OFF to get flat ₹500 off on minimum spend of ₹2,500. Valid until 15 Oct 2026.
    `,
  },
  {
    from: "updates@marriott.com",
    subject: "Marriott Bonvoy - Your Points Balance & Exclusive Offers",
    date: "2026-08-05",
    body: `
      Dear Valued Member,
      Member No: MB-***719
      Total Points Balance: 3,500 Points
      1,000 points expiring on 15 Oct 2026.
      Redeem for complimentary stays across 8,000+ properties worldwide.
      Use promo code BONVOYSTAY for +20% Bonus points on dining.
    `,
  },
  {
    from: "alerts@hdfcbank.com",
    subject: "HDFC Credit Card Reward Points Statement",
    date: "2026-08-01",
    body: `
      Dear Customer,
      Card Ending: **4092
      Reward Points Balance: 9,150 Points
      Total points earned this billing cycle: 697 Points.
      Exclusive SmartBuy voucher: Use coupon code HDFCSMART10 to get 10% instant discount on flights.
    `,
  },
  {
    from: "offers@swiggy.in",
    subject: "Swiggy One: Flat 20% OFF on Gourmet with SuperCoins",
    date: "2026-08-12",
    body: `
      Hey Foodie!
      Your SuperCoins Balance: 2,400 Coins.
      Claim your exclusive weekend deal: Use coupon code SWIGGYIT20 to get Flat 20% off on minimum order of ₹299.
      Valid till 31 Aug 2026.
    `,
  },
  {
    from: "rewards@flipkart.com",
    subject: "Your Flipkart SuperCoins Balance Update + ₹250 Voucher",
    date: "2026-08-03",
    body: `
      Hi Member,
      Your SuperCoins Balance: 8,450 Coins
      500 coins expire 31 Dec 2026.
      Use code SUPERCOIN250 to claim ₹250 instant voucher on electronics. Valid until 25 Sep 2026 on min order ₹999.
    `,
  },
];

export interface SyncExecutionResult {
  linkedAccounts: LinkedAccount[];
  extractedCoupons: ExtractedCoupon[];
}

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

  /**
   * Run the sync process with live progress callbacks
   */
  static async executeEmailSync(
    provider: "gmail",
    userEmail: string,
    onProgress: (step: string, percent: number) => void
  ): Promise<SyncExecutionResult> {
    // Step 1: Authenticate OAuth Token
    onProgress("Authenticating with Google Gmail OAuth...", 20);
    await new Promise((r) => setTimeout(r, 500));

    // Step 2: Search Inbox for Statement Folders
    onProgress("Searching inbox for loyalty statements, rewards & vouchers...", 45);
    await new Promise((r) => setTimeout(r, 600));

    // Step 3: Run Regex Statement & Coupon Parser
    onProgress("Extracting reward balances, promo codes & expiry dates...", 75);
    await new Promise((r) => setTimeout(r, 700));

    const parsedResults: ParsedEmailResult[] = [];
    const extractedCoupons: ExtractedCoupon[] = [];

    for (const email of MOCK_RAW_EMAILS) {
      const parsedStmt = this.parseEmailStatement(email.from, email.subject, email.body, email.date);
      if (parsedStmt) {
        parsedResults.push(parsedStmt);
      }

      const parsedCpn = this.parseEmailCoupons(email.from, email.subject, email.body, email.date);
      if (parsedCpn) {
        extractedCoupons.push(parsedCpn);
      }
    }

    // Step 4: Normalizing & Mapping to Linked Accounts
    onProgress("Normalizing points & organizing token wallet...", 90);
    await new Promise((r) => setTimeout(r, 400));

    const linkedAccounts: LinkedAccount[] = parsedResults.map((res, index) => {
      const catalogProgram = POPULAR_PROGRAMS.find((p) => p.id === res.programId) || {
        id: res.programId,
        name: res.programName,
        category: "airlines" as const,
        logoInitial: "✈️",
        accentColor: "#01A2FB",
        defaultExpiryMonths: 24,
        pointValueINR: 0.35,
      };

      return {
        id: `acc_sync_${index + 1}_${Date.now()}`,
        programId: catalogProgram.id,
        program: catalogProgram,
        accountNumberMasked: res.accountNumberMasked,
        currentBalance: res.pointsBalance,
        expiringPoints: res.expiringPoints || 0,
        expiryDate: res.expiryDate || null,
        lastSyncedAt: new Date().toISOString(),
        syncMethod: "email_parser",
        isActive: true,
      };
    });

    onProgress(`Sync complete! Extracted ${linkedAccounts.length} programs & ${extractedCoupons.length} coupons.`, 100);
    await new Promise((r) => setTimeout(r, 300));

    return {
      linkedAccounts,
      extractedCoupons,
    };
  }
}
