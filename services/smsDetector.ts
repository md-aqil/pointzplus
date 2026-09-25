// services/smsDetector.ts – Android SMS Auto-Detect for Loyalty Points
import { POPULAR_PROGRAMS } from '../constants/popularPrograms';

// SMS Regex patterns for popular loyalty programs
interface SMSRule {
  programId: string;
  senderKeywords: string[];
  balanceRegex: RegExp;
  accountRegex?: RegExp;
  expiryRegex?: RegExp;
}

interface SMSDetectionResult {
  programId: string;
  programName: string;
  points: number;
  confidence: number;
  accountNumber?: string;
  expiryPoints?: number;
  expiryDate?: string;
}

export const SMS_DETECTION_RULES: SMSRule[] = [
  {
    programId: 'airtel_thanks',
    senderKeywords: ['AIRHELLO', 'AIRTHELLO', 'AIRTELTHEY'],
    balanceRegex: /(?:SuperCoins|points|balance)\s*(?:is|are)?\s*([0-9,]+)/i,
    accountRegex: /(?:account|mobile)\s*(?:ending)?\s*([0-9]{4})/i,
  },
  {
    programId: 'cult_fit',
    senderKeywords: ['CULTAPP', 'CULTFIT'],
    balanceRegex: /(?:FitCoins|points|balance)\s*([0-9,]+)/i,
  },
  {
    programId: 'swiggy_one',
    senderKeywords: ['SWIGGY', 'SWIGGYONE'],
    balanceRegex: /(?:SuperCoins|points|balance)\s*([0-9,]+)/i,
  },
  {
    programId: 'zomato_gold',
    senderKeywords: ['ZOMATO', 'ZOMATOGOLD'],
    balanceRegex: /(?:points|balance)\s*([0-9,]+)/i,
  },
  {
    programId: 'hdfc_mycards',
    senderKeywords: ['HDFCBANK', 'HDFC'],
    balanceRegex: /(?:Reward Points|Points Balance)\s*(?:is|are)?\s*([0-9,]+)/i,
    accountRegex: /(?:Card ending in|A\/C)\s*([0-9]{4})/i,
  },
  {
    programId: 'flipkart_supercoins',
    senderKeywords: ['FLIPKART', 'SUPERCOINS'],
    balanceRegex: /(?:SuperCoins|points|balance)\s*(?:is|are)?\s*([0-9,]+)/i,
  },
  {
    programId: 'amazon_pay_rewards',
    senderKeywords: ['AMAZON', 'AMZN'],
    balanceRegex: /(?:Points|Rewards)\s*(?:earned|balance)\s*([0-9,]+)/i,
  },
  {
    programId: 'bookmyshow',
    senderKeywords: ['BOOKMYSHOW', 'BMS'],
    balanceRegex: /(?:Rewards|points|balance)\s*([0-9,]+)/i,
  },
  {
    programId: 'dominos',
    senderKeywords: ['DOMINOS', 'PIZZA'],
    balanceRegex: /(?:Payback|points|balance)\s*([0-9,]+)/i,
  },
  {
    programId: 'indianoil',
    senderKeywords: ['IOCL', 'INDIANOIL', 'XTRA'],
    balanceRegex: /(?:XTRAREWARDS|points|balance)\s*([0-9,]+)/i,
  },
];

// Detect points from SMS body
export function detectPointsFromSMS(smsBody: string, sender?: string): SMSDetectionResult | null {
  const body = smsBody.toUpperCase();
  
  // Find matching SMS rule
  const matchedRule = SMS_DETECTION_RULES.find(rule => {
    const matchesSender = sender ? rule.senderKeywords.some(k => sender.includes(k)) : false;
    const matchesBody = rule.senderKeywords.some(k => body.includes(k));
    return matchesSender || matchesBody;
  });

  if (!matchedRule) return null;

  // Extract points balance
  const balanceMatch = smsBody.match(matchedRule.balanceRegex);
  if (!balanceMatch) return null;

  const points = parseInt(balanceMatch[1].replace(/,/g, ''), 10);
  
  // Extract account if available
  let accountNumber: string | undefined;
  if (matchedRule.accountRegex) {
    const accMatch = smsBody.match(matchedRule.accountRegex);
    if (accMatch) accountNumber = accMatch[1];
  }

  // Check for expiry info
  let expiryPoints: number | undefined;
  let expiryDate: string | undefined;
  
  const expiryMatches = smsBody.match(/([0-9,]+)\s*pts?[\s,]*expire|expiring/i);
  if (expiryMatches) {
    expiryPoints = parseInt(expiryMatches[1].replace(/,/g, ''), 10);
    const dateMatch = smsBody.match(/(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/);
    if (dateMatch) expiryDate = dateMatch[1];
  }

  // Calculate confidence based on matches
  let confidence = 0.75; // Base confidence
  if (matchedRule.accountRegex && accountNumber) confidence += 0.15;
  if (expiryPoints !== undefined) confidence += 0.10;
  confidence = Math.min(confidence, 0.98);

  return {
    programId: matchedRule.programId,
    programName: POPULAR_PROGRAMS.find(p => p.id === matchedRule.programId)?.name || matchedRule.programId,
    points,
    confidence,
    accountNumber,
    expiryPoints,
    expiryDate,
  };
}

// Parse messages supplied by a real device SMS provider or backend.
// This function intentionally never creates or retrieves sample messages.
export function detectLoyaltyFromSMS(
  smsList: { body: string; sender?: string; timestamp?: string }[]
): {
  detections: SMSDetectionResult[];
  totalSMSAnalyzed: number;
} {
  const detections = smsList
    .map((sms) => detectPointsFromSMS(sms.body, sms.sender))
    .filter((result): result is SMSDetectionResult => result !== null);

  return {
    detections,
    totalSMSAnalyzed: smsList.length,
  };
}
