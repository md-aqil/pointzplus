// services/emailParser.ts – Email Statement Parser & OAuth Sync Service
import { ParsedEmailResult, LinkedAccount } from "../types/loyalty";
import { POPULAR_PROGRAMS } from "../constants/popularPrograms";

// ─── Statement Regex & Parser Templates ─────────────────────────
interface ParserRule {
  programId: string;
  programName: string;
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
    senderDomains: ["intermiles.com", "jetprivilege.com"],
    subjectPatterns: [/monthly statement/i, /your miles summary/i, /activity update/i],
    balanceRegex: /(?:total|available|current)\s*(?:miles|points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member(?:ship)?|account|no)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*(?:miles|pts|points)\s*expir(?:e|ing)\s*(?:on|by)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
  },
  {
    programId: "air_india",
    programName: "Air India Flying Returns",
    senderDomains: ["airindia.com", "flyingreturns.co.in"],
    subjectPatterns: [/flying returns statement/i, /miles balance/i, /e-statement/i],
    balanceRegex: /(?:points|miles|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:ffn|member(?:ship)?|id)[:\s#]*([A-Z0-9*-]{4,12})/i,
    expiryRegex: /([0-9,]+)\s*pts.*expire\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
  },
  {
    programId: "marriott_bonvoy",
    programName: "Marriott Bonvoy",
    senderDomains: ["marriott.com", "marriottbonvoy.com"],
    subjectPatterns: [/account update/i, /points summary/i, /monthly activity/i],
    balanceRegex: /(?:total points|balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:member no|account)[:\s#]*([0-9*-]{6,12})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expiring/i,
  },
  {
    programId: "hdfc_mycards",
    programName: "HDFC Regalia / Infinia Points",
    senderDomains: ["hdfcbank.com", "hdfcbank.net"],
    subjectPatterns: [/credit card statement/i, /reward points summary/i],
    balanceRegex: /(?:reward points|points balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:card ending in|a\/c no)[:\s#]*([0-9*]{4})/i,
    expiryRegex: /([0-9,]+)\s*points\s*expire/i,
  },
  {
    programId: "flipkart_supercoins",
    programName: "Flipkart SuperCoins",
    senderDomains: ["flipkart.com"],
    subjectPatterns: [/supercoin statement/i, /supercoins added/i, /balance update/i],
    balanceRegex: /(?:supercoins|coins balance)[:\s]*([0-9,]+)/i,
    accountRegex: /(?:user|account)[:\s#]*([A-Za-z0-9_*-]{4,10})/i,
    expiryRegex: /([0-9,]+)\s*coins\s*expire/i,
  },
];

// ─── Simulated Raw Statements (for instant offline demonstration) ─
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
    `,
  },
  {
    from: "rewards@airindia.com",
    subject: "Air India Flying Returns - Current Miles Summary",
    date: "2026-08-08",
    body: `
      Welcome Back,
      FFN Member ID: AI-***402
      Available Points Balance: 4,318 Points
      588 pts expire 30 Sep 2026.
      Book your next journey with Flying Returns.
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
    `,
  },
  {
    from: "rewards@flipkart.com",
    subject: "Your Flipkart SuperCoins Balance Update",
    date: "2026-08-03",
    body: `
      Hi Member,
      Your SuperCoins Balance: 8,450 Coins
      Use your SuperCoins to claim exciting vouchers, discounts, and OTT subscriptions.
    `,
  },
];

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
    // 1. Match matching rule by sender domain or subject
    const matchedRule = STATEMENT_PARSER_RULES.find((rule) => {
      const matchSender = rule.senderDomains.some((d) => from.toLowerCase().includes(d));
      const matchSubject = rule.subjectPatterns.some((p) => p.test(subject));
      return matchSender || matchSubject;
    });

    if (!matchedRule) {
      return null;
    }

    // 2. Extract Balance
    const balanceMatch = body.match(matchedRule.balanceRegex);
    if (!balanceMatch) return null;
    const balance = parseInt(balanceMatch[1].replace(/,/g, ""), 10);

    // 3. Extract Account Number
    const accountMatch = body.match(matchedRule.accountRegex);
    const accountNumber = accountMatch ? accountMatch[1] : "XXXX-****";

    // 4. Extract Expiry Info if available
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
   * Run the sync process with live progress callbacks
   */
  static async executeEmailSync(
    provider: "gmail" | "outlook",
    userEmail: string,
    onProgress: (step: string, percent: number) => void
  ): Promise<LinkedAccount[]> {
    // Step 1: Authenticate OAuth Token
    onProgress(`Connecting to ${provider === "gmail" ? "Google Gmail" : "Microsoft Outlook"} OAuth...`, 20);
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Search Inbox for Statement Folders
    onProgress("Searching inbox for loyalty statements & e-receipts...", 45);
    await new Promise((r) => setTimeout(r, 700));

    // Step 3: Run Regex Statement Parser
    onProgress("Extracting reward balances, account numbers & expiry dates...", 75);
    await new Promise((r) => setTimeout(r, 800));

    // Parse all available mock statements
    const parsedResults: ParsedEmailResult[] = [];
    for (const email of MOCK_RAW_EMAILS) {
      const parsed = this.parseEmailStatement(email.from, email.subject, email.body, email.date);
      if (parsed) {
        parsedResults.push(parsed);
      }
    }

    // Step 4: Normalizing & Mapping to Linked Accounts
    onProgress("Normalizing points data across programs...", 90);
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

    onProgress(`Sync complete! Successfully extracted ${linkedAccounts.length} programs.`, 100);
    await new Promise((r) => setTimeout(r, 300));

    return linkedAccounts;
  }
}
