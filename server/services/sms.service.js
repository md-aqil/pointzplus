// server/services/sms.service.js – SMS point detection business logic.
import { ApiError } from '../lib/errors.js';
import { SmsRepo } from '../repositories/sms.repo.js';

// Parser rules mirror the mobile app (canonical program slugs, not UUIDs).
const SMS_RULES = [
  { programId: 'hdfc_mycards', keywords: ['HDFCBANK', 'HDFC'], balanceRegex: /(?:Reward Points|Points Balance)\s*(?:is|are)?\s*([0-9,]+)/i },
  { programId: 'airtel_thanks', keywords: ['AIRTEL', 'THANKS'], balanceRegex: /(?:SuperCoins|points|balance)\s*(?:is|are)?\s*([0-9,]+)/i },
  { programId: 'flipkart_supercoins', keywords: ['FLIPKART', 'SUPERCOINS'], balanceRegex: /(?:SuperCoins|points|balance)\s*(?:is|are)?\s*([0-9,]+)/i },
  { programId: 'swiggy_one', keywords: ['SWIGGY'], balanceRegex: /(?:SuperCoins|points)\s*([0-9,]+)/i },
  { programId: 'cult_fit', keywords: ['CULTFIT', 'CULT'], balanceRegex: /(?:FitCoins|points)\s*([0-9,]+)/i },
  { programId: 'bookmyshow', keywords: ['BOOKMYSHOW', 'BMS'], balanceRegex: /(?:Rewards|points)\s*([0-9,]+)/i },
];

export const smsService = {
  async detect(userId, smsList) {
    const detections = [];

    for (const sms of smsList) {
      const body = (sms.body || '').toUpperCase();
      const sender = (sms.sender || '').toUpperCase();

      for (const rule of SMS_RULES) {
        const matchesKeyword = rule.keywords.some(
          (k) => body.includes(k) || sender.includes(k)
        );
        if (!matchesKeyword) continue;

        const match = sms.body?.match(rule.balanceRegex);
        if (!match) continue;

        const points = parseInt(match[1].replace(/,/g, ''), 10);
        if (Number.isNaN(points) || points <= 0) continue;

        const program = await SmsRepo.findProgramBySlug(rule.programId);
        if (!program) continue;

        detections.push({
          programId: program.id,
          programName: program.name,
          category: program.category,
          points,
          accountNumber: null,
          confidence: 0.85,
          source: 'sms',
          detectedAt: new Date().toISOString(),
        });

        await SmsRepo.insertDetection({
          userId,
          sender: sms.sender || 'unknown',
          body: sms.body,
          programId: program.id,
          points,
          confidence: 0.85,
        });

        break; // One detection per SMS
      }
    }

    return { totalScanned: smsList.length, detections };
  },

  async autoAdd(userId, { programId, points, accountNumber, sourceSmsId }) {
    const masked = accountNumber || 'SMS-***';
    const existing = await SmsRepo.findAccount(userId, programId);

    if (existing) {
      // Update in place only when the mask matches; otherwise create a row.
      await SmsRepo.upsertBalanceFromSms(userId, programId, {
        points,
        maskedNumber: masked,
      });
    } else {
      await SmsRepo.upsertBalanceFromSms(userId, programId, {
        points,
        maskedNumber: masked,
      });
    }

    if (sourceSmsId) {
      await SmsRepo.markDetectionAutoAdded(sourceSmsId);
    }

    return { success: true, message: 'Account added via SMS' };
  },

  history(userId) {
    return SmsRepo.history(userId);
  },

  async getSettings(userId) {
    const existing = await SmsRepo.getSettings(userId);
    if (existing) return existing;
    return SmsRepo.insertDefaultSettings(userId);
  },

  async updateSettings(userId, fields) {
    await this.getSettings(userId);
    const updated = await SmsRepo.updateSettings(userId, fields);
    if (!updated) throw ApiError.notFound('Settings not found');
    return updated;
  },
};
