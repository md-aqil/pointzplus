// services/smsDetector.ts – Android SMS Auto-Detect for Loyalty Points
import { Platform } from 'react-native';
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

// Mock SMS retrieval (for testing)
export async function getRecentSMS(limit: number = 10): Promise<{ body: string; sender: string; timestamp: string }[]> {
  const mockSMS = [
    {
      body: 'AIRHELLO: You earned 2,400 SuperCoins on your HDFC transaction. Total balance: 1,289 points. Expires in 30 days.',
      sender: 'AIRHELLO',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      body: 'CULTAPP: Great! You earned 450 FitCoins on your recent workout. Your current balance: 1,289 FitCoins. Points expire in 30 days.',
      sender: 'CULTAPP',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      body: 'SWIGGY: You earned 200 SuperCoins on Swiggy One! Total: 2,400 SuperCoins. Use them for vouchers.',
      sender: 'SWIGGY',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      body: 'HDFCBANK: Reward Points Statement for Card ending 4092. Current Balance: 9,150 Points. 500 pts expire on 30 Nov 2026.',
      sender: 'HDFCBANK',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      body: 'FLIPKART: SuperCoins Alert: 500 SuperCoins added for your recent purchase. Balance: 8,450 SuperCoins.',
      sender: 'FLIPKART',
      timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
  ];

  return mockSMS.slice(0, limit);
}

// Main detection handler
export async function detectLoyaltyFromSMS(): Promise<{
  detections: SMSDetectionResult[];
  totalSMSAnalyzed: number;
}> {
  const smsList = await getRecentSMS(20);
  
  const detections: SMSDetectionResult[] = [];
  
  for (const sms of smsList) {
    const result = detectPointsFromSMS(sms.body, sms.sender);
    
    if (result) {
      detections.push(result);
    }
  }

  return {
    detections,
    totalSMSAnalyzed: smsList.length,
  };
}

// Start SMS listener (for real-time detection)
export function startSMSListener(callback: (detection: {
  programId: string;
  points: number;
  confidence: number;
}) => void) {
  console.log('SMS listener started (placeholder)');
  
  // Simulate periodic checks
  setInterval(async () => {
    const result = await detectLoyaltyFromSMS();
    if (result.detections.length > 0) {
      callback({
        programId: result.detections[0].programId,
        points: result.detections[0].points,
        confidence: result.detections[0].confidence,
      });
    }
  }, 60000); // Check every minute
}
