// server/services/gmail.service.js – Gmail OAuth + scan pipeline business logic.
// Extracted from routes/emailSync.js (route → controller → service → repository).
import crypto from 'crypto';
import { google } from 'googleapis';
import { JWT_SECRET } from '../middleware/auth.js';
import { encryptToken, decryptToken } from '../crypto.js';
import { StatementAndCouponParser } from './statementAndCouponParser.js';
import { EmailSyncRepo } from '../repositories/emailSync.repo.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/email-sync/google/callback';
const GOOGLE_PUBSUB_TOPIC = process.env.GOOGLE_PUBSUB_TOPIC;

export function createOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function oauthConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function pubsubTopicConfigured() {
  return Boolean(GOOGLE_PUBSUB_TOPIC);
}

// ─── OAuth state (CSRF protection) ───────────────────────────────
// Signed, expiring HMAC payload instead of a raw userId, so an attacker
// cannot forge a state that binds the victim's session to their consent.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function signOAuthState(userId) {
  const exp = Date.now() + OAUTH_STATE_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state) {
  if (typeof state !== 'string') return null;
  const parts = state.split('.');
  if (parts.length !== 3) return null;

  const [userId, expStr, sig] = parts;
  const payload = `${userId}.${expStr}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}

// ─── Pub/Sub push authentication ─────────────────────────────────
// 1. PUBSUB_WEBHOOK_SECRET → shared bearer secret; 2. Google-issued OIDC JWT.
let googleCertsCache = { keys: null, fetchedAt: 0 };

async function fetchGoogleCerts() {
  const now = Date.now();
  if (googleCertsCache.keys && now - googleCertsCache.fetchedAt < 10 * 60 * 1000) {
    return googleCertsCache.keys;
  }
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!resp.ok) throw new Error(`Google certs fetch failed: ${resp.status}`);
  const body = await resp.json();
  googleCertsCache = { keys: body.keys, fetchedAt: now };
  return body.keys;
}

async function verifyGoogleIdToken(token) {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  if (header.alg !== 'RS256') return false;

  const keys = await fetchGoogleCerts();
  const kid = header.kid;
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) return false;

  const publicKey = crypto.createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
    format: 'jwk',
  });
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(Buffer.from(`${headerB64}.${payloadB64}`));
  return verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'));
}

export async function isAuthorizedPubSubRequest(req) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  const sharedSecret = process.env.PUBSUB_WEBHOOK_SECRET;
  if (sharedSecret) {
    if (!token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(sharedSecret);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  if (!token) return false;
  try {
    return await verifyGoogleIdToken(token);
  } catch {
    return false;
  }
}

// ─── Gmail search & body helpers ─────────────────────────────────

export function buildLoyaltySearchQuery(domains = []) {
  const unique = [...new Set(domains.filter(Boolean))];
  const domainFilters = unique.slice(0, 25).map((d) => `from:${d}`).join(' OR ');
  const keywords =
    'points OR miles OR "reward points" OR SuperCoins OR statement OR coupon OR voucher OR "use code" OR "promo code" OR "reward balance"';
  const dateFilter = 'newer_than:60d';
  if (domainFilters) {
    return `((${domainFilters}) OR (${keywords})) ${dateFilter}`;
  }
  return `(${keywords}) ${dateFilter}`;
}

export function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
}

export function extractBodyParts(payload) {
  let text = '';
  let html = '';
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    if (payload.mimeType === 'text/html') html += decoded;
    else text += decoded;
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        const nested = extractBodyParts(part);
        text += nested.text;
        html += nested.html;
      }
    }
  }
  return { text, html };
}

// ─── Persistence (via repository) ────────────────────────────────

async function persistLoyaltyResult(userId, parsed, fromHeader, subjectHeader, receivedAt, preview, provider, syncAccountId) {
  const detected = parsed.loyaltyData;
  const program = await EmailSyncRepo.findProgramForStatement(
    extractDomain(fromHeader),
    `%${detected.programName || detected.programId || ''}%`
  );
  if (!program) return { added: false, updated: false };

  const existing = await EmailSyncRepo.findStatementAccount(userId, program.id);

  let accountId;
  let added = false;
  let updated = false;

  if (!existing) {
    const created = await EmailSyncRepo.insertStatementAccount({
      userId, programId: program.id, detected, provider,
    });
    accountId = created.id;
    added = true;
    await EmailSyncRepo.insertStatementTransaction({
      accountId,
      points: detected.balance,
      description: `Statement from ${fromHeader}`,
    });
  } else {
    accountId = existing.id;
    await EmailSyncRepo.updateStatementBalance({ programId: program.id, userId, detected });
    updated = true;
  }

  await EmailSyncRepo.insertEmailStatement([
    userId, syncAccountId, fromHeader, subjectHeader, receivedAt || new Date(),
    program.id, detected.balance, detected.accountNumber, detected.expiryDate,
    detected.confidence || 0.95, preview || null,
  ]);

  return { added, updated, accountId, program };
}

async function persistCouponResult(userId, couponData, programId = null) {
  if (!couponData?.couponCode) return false;
  try {
    const result = await EmailSyncRepo.insertCoupon([
      userId, programId, couponData.merchantName, couponData.category || 'shopping',
      couponData.couponCode, couponData.couponType || 'discount_code',
      couponData.title, couponData.description || null, couponData.discountValue,
      couponData.minimumSpendINR || 0, couponData.expiryDate,
      couponData.emailMessageIdHash, couponData.sourceEmailSubject,
      couponData.sourceSender, couponData.confidenceScore || 0.95,
    ]);
    return result.rows.length > 0;
  } catch (err) {
    console.error('Persist coupon error:', err.message);
    return false;
  }
}

// ─── Scan pipeline ───────────────────────────────────────────────

async function scanGmailMessages(account, { maxResults = 40, historyId = null } = {}) {
  const oAuth2Client = createOAuthClient();
  const refreshPlaintext = decryptToken(
    account.oauth_refresh_token,
    account.refresh_encryption_iv ?? null,
    account.refresh_encryption_tag ?? null
  );
  oAuth2Client.setCredentials({
    access_token: decryptToken(account.oauth_token, account.encryption_iv, account.encryption_tag),
    refresh_token: refreshPlaintext || undefined,
  });

  oAuth2Client.on('tokens', async (tokens) => {
    if (!tokens.access_token) return;
    const encrypted = encryptToken(tokens.access_token);
    let refreshCiphertext = account.oauth_refresh_token;
    let refreshIv = account.refresh_encryption_iv ?? null;
    let refreshTag = account.refresh_encryption_tag ?? null;
    if (tokens.refresh_token) {
      const re = encryptToken(tokens.refresh_token);
      refreshCiphertext = re.ciphertext;
      refreshIv = re.iv;
      refreshTag = re.tag;
    }
    await EmailSyncRepo.updateTokens({
      accountId: account.id,
      accessEnc: encrypted,
      refreshCiphertext,
      refreshIv,
      refreshTag,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const domains = await EmailSyncRepo.sellerDomains();
  const searchQuery = buildLoyaltySearchQuery(domains);

  let messages = [];
  try {
    if (historyId && account.history_id) {
      const hist = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: account.history_id,
        historyTypes: ['messageAdded'],
      });
      const added = (hist.data.history || []).flatMap((h) => h.messagesAdded || []);
      messages = added.map((m) => m.message).filter(Boolean);
    }

    if (messages.length === 0) {
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults,
      });
      messages = listRes.data.messages || [];
    }
  } catch (searchErr) {
    console.warn('Gmail search fallback:', searchErr.message);
    const fallbackRes = await gmail.users.messages.list({
      userId: 'me',
      q: '(points OR miles OR coupon OR voucher OR "reward points" OR statement) newer_than:60d',
      maxResults: 20,
    });
    messages = fallbackRes.data.messages || [];
  }

  const detectedAccounts = [];
  const extractedCoupons = [];
  let programsAdded = 0;
  let programsUpdated = 0;
  let couponsInserted = 0;
  let processed = 0;

  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = detail.data.payload.headers || [];
      const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date();
      const { text, html } = extractBodyParts(detail.data.payload);
      const preview = (text || html.replace(/<[^>]+>/g, ' ')).substring(0, 200);

      const parsed = StatementAndCouponParser.parseEmail({
        messageId: msg.id,
        fromHeader,
        subjectHeader,
        bodyText: text,
        bodyHtml: html,
        receivedDate: dateHeader,
      });

      let programId = null;
      if (parsed.isLoyaltyStatement && parsed.loyaltyData) {
        const persist = await persistLoyaltyResult(
          account.user_id, parsed, fromHeader, subjectHeader,
          new Date(dateHeader), preview, 'gmail', account.id
        );
        if (persist.added) programsAdded += 1;
        if (persist.updated) programsUpdated += 1;
        programId = persist.program?.id || null;
        detectedAccounts.push({
          from: fromHeader,
          domain: extractDomain(fromHeader),
          subject: subjectHeader,
          receivedAt: new Date(dateHeader),
          preview,
          ...parsed.loyaltyData,
        });
      }

      if (parsed.isCoupon && parsed.couponData) {
        const inserted = await persistCouponResult(account.user_id, parsed.couponData, programId);
        if (inserted) {
          couponsInserted += 1;
          extractedCoupons.push(parsed.couponData);
        }
      }

      processed += 1;
    } catch (msgErr) {
      console.error(`Error parsing message ${msg.id}:`, msgErr.message);
    }
  }

  const profile = await gmail.users.getProfile({ userId: 'me' }).catch(() => null);
  const nextHistoryId = profile?.data?.historyId || historyId || account.history_id;

  await EmailSyncRepo.updateScanMeta({
    accountId: account.id,
    programsFound: detectedAccounts.length,
    historyId: nextHistoryId,
  });

  return {
    scanned: messages.length,
    processed,
    programsAdded,
    programsUpdated,
    couponsInserted,
    accounts: detectedAccounts,
    coupons: extractedCoupons,
  };
}

async function runScanJob(jobId, account) {
  try {
    await EmailSyncRepo.markJobFetching(jobId);
    const result = await scanGmailMessages(account);
    await EmailSyncRepo.markJobCompleted(jobId, {
      scanned: result.scanned,
      processed: result.processed,
      couponsInserted: result.couponsInserted,
      programsUpdated: result.programsAdded + result.programsUpdated,
    });
    return result;
  } catch (err) {
    await EmailSyncRepo.markJobFailed(jobId, err.message);
    throw err;
  }
}

// ─── High-level operations (used by the controller) ──────────────

export const gmailService = {
  generateAuthUrl(userId) {
    const oAuth2Client = createOAuthClient();
    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: signOAuthState(userId),
      prompt: 'consent',
      include_granted_scopes: true,
    });
  },

  /** Exchange the OAuth code, persist encrypted tokens, return the email. */
  async exchangeCode(code, userId) {
    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;
    const accessEnc = encryptToken(tokens.access_token);
    const refreshEnc = encryptToken(tokens.refresh_token || '');

    await EmailSyncRepo.upsertGmailOAuth({
      userId,
      email,
      tokens,
      accessEnc,
      refreshEnc,
      historyId: profile.data.historyId || null,
    });

    return email;
  },

  /** Run a scan now (wait=true) or queue it in the background. */
  async scan(userId, provider, wait) {
    const account = await EmailSyncRepo.findConnected(userId, provider);
    if (!account) {
      return {
        status: 400,
        body: {
          error: 'No connected Gmail account found. Please connect your Gmail first.',
        },
      };
    }

    const job = await EmailSyncRepo.createJob(userId, provider);

    if (!wait) {
      setImmediate(() => {
        runScanJob(job.id, account).catch((err) =>
          console.error('Background scan failed:', err.message)
        );
      });
      return {
        status: 202,
        body: {
          jobId: job.id,
          status: 'queued',
          message: 'Scan started. Poll GET /api/email-sync/jobs/:id for progress.',
        },
      };
    }

    const result = await runScanJob(job.id, account);
    const [linked, coupons] = await Promise.all([
      EmailSyncRepo.linkedAccountsWithPrograms(userId),
      EmailSyncRepo.recentCoupons(userId, 50),
    ]);

    return {
      status: 200,
      body: {
        jobId: job.id,
        scanned: result.scanned,
        processed: result.processed,
        added: result.programsAdded,
        updated: result.programsUpdated,
        couponsExtracted: result.couponsInserted,
        accounts: linked,
        coupons,
      },
    };
  },

  getJob(jobId, userId) {
    return EmailSyncRepo.getJob(jobId, userId);
  },

  listAccounts(userId) {
    return EmailSyncRepo.listForUser(userId);
  },

  disconnect(userId, provider) {
    return EmailSyncRepo.disconnect(userId, provider);
  },

  /** Enable Gmail watch push notifications for the connected account. */
  async enableWatch(userId) {
    const account = await EmailSyncRepo.findConnected(userId, 'gmail');
    if (!account) {
      return {
        status: 400,
        body: { error: 'Connect Gmail before enabling watch.' },
      };
    }

    const oAuth2Client = createOAuthClient();
    const refreshPlaintext = decryptToken(
      account.oauth_refresh_token,
      account.refresh_encryption_iv ?? null,
      account.refresh_encryption_tag ?? null
    );
    oAuth2Client.setCredentials({
      access_token: decryptToken(account.oauth_token, account.encryption_iv, account.encryption_tag),
      refresh_token: refreshPlaintext || undefined,
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const watchRes = await gmail.users.watch({
      userId: 'me',
      requestBody: { topicName: GOOGLE_PUBSUB_TOPIC, labelIds: ['INBOX'] },
    });

    await EmailSyncRepo.updateWatch({
      accountId: account.id,
      expiration: watchRes.data.expiration
        ? new Date(parseInt(watchRes.data.expiration, 10))
        : null,
      resourceId: watchRes.data.historyId || null,
      historyId: watchRes.data.historyId || null,
    });

    return {
      status: 200,
      body: {
        success: true,
        expiration: watchRes.data.expiration,
        historyId: watchRes.data.historyId,
      },
    };
  },

  /** Handle an inbound Pub/Sub push: find the account and queue a scan. */
  async handleWebhook(payload) {
    const message = payload?.message;
    if (!message?.data) return;

    const dataString = Buffer.from(message.data, 'base64').toString('utf-8');
    const { emailAddress, historyId } = JSON.parse(dataString);
    if (!emailAddress) return;

    const account = await EmailSyncRepo.findByEmail(emailAddress);
    if (!account) return;

    const job = await EmailSyncRepo.createJob(account.user_id, 'gmail');
    await runScanJob(job.id, {
      ...account,
      history_id: historyId || account.history_id,
    });
  },
};
