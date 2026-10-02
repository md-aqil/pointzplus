// server/services/gmail.service.js – Gmail OAuth + scan pipeline business logic.
// Extracted from routes/emailSync.js (route → controller → service → repository).
import crypto from 'crypto';
import { google } from 'googleapis';
import { JWT_SECRET } from '../middleware/auth.js';
import { encryptToken, decryptToken } from '../crypto.js';
import { StatementParser } from './statementParser.js';
import { AIStatementParser } from './aiStatementParser.service.js';
import { EmailSyncRepo } from '../repositories/emailSync.repo.js';
import { notifyJobQueued } from '../lib/workerBus.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/email-sync/google/callback';
const GOOGLE_PUBSUB_TOPIC = process.env.GOOGLE_PUBSUB_TOPIC;

// How often a running scan reports per-message progress to sync_jobs.
const PROGRESS_UPDATE_EVERY = 5;

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

// Universal Loyalty & Statement Search Intent (Domain-Agnostic across Entire Mailbox)
// Discovers all statements, reward summaries, coin updates, e-statements, points, miles,
// frequent flyer balances, club programs, and receipts with rewards from ANY sender and across all time.
export const UNIVERSAL_LOYALTY_QUERY = [
  'subject:(points OR miles OR reward OR rewards OR statement OR balance OR cashback OR coin OR coins OR supercoins OR neucoins OR loyalty OR membership OR "frequent flyer" OR "e-statement" OR "account update" OR summary OR "points statement" OR "miles statement" OR "reward summary" OR "points balance" OR "tier status" OR "privilege" OR "rewards club")',
  '(points OR miles OR rewards OR SuperCoins OR NeuCoins OR "reward points" OR "points balance" OR "available balance" OR "miles balance" OR "current balance" OR "loyalty points" OR "cashback balance" OR "points earned" OR "membership no" OR "member number" OR "frequent flyer number" OR "membership id" OR "account summary")',
].join(' OR ');

export function buildLoyaltySearchQuery(domains = [], lookbackDays = null) {
  let query = `(${UNIVERSAL_LOYALTY_QUERY})`;
  if (domains && domains.length > 0) {
    const domainPart = domains.slice(0, 40).map((d) => `from:${d}`).join(' OR ');
    query = `(${UNIVERSAL_LOYALTY_QUERY} OR (${domainPart}))`;
  }
  if (lookbackDays && Number.isFinite(lookbackDays)) {
    query += ` newer_than:${lookbackDays}d`;
  }
  return query;
}

export function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Redacts personal identifiers, OTP codes, card numbers, and phone numbers from diagnostic text.
 */
export function redactSensitiveText(str = '') {
  if (!str || typeof str !== 'string') return '';
  return str
    // Redact 13-19 digit card numbers or spaced/dashed card chunks
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]')
    // Redact 4-8 digit OTP codes / PINs / security tokens
    .replace(/\b(?:otp|code|pin|verification|password|secret)\s*(?:is|:)?\s*[a-zA-Z0-9]{4,8}\b/gi, '[REDACTED_CODE]')
    // Redact email addresses (mask user part: j***e@domain.com)
    .replace(/[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (match, domain) => {
      const parts = match.split('@');
      const user = parts[0];
      const masked = user.length > 2 ? `${user[0]}***${user.slice(-1)}` : '***';
      return `${masked}@${domain}`;
    })
    // Redact phone numbers
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]')
    // Redact bank account numbers (e.g., A/c XX1234, Account No: ...)
    .replace(/\b(?:a\/c|account|acct)\s*(?:no\.?|number)?\s*[:#-]?\s*[a-zA-Z0-9*_-]{4,20}\b/gi, '[REDACTED_ACCOUNT]')
    .trim();
}

/**
 * Minimizes and sanitizes rejected email diagnostic metadata before DB persistence.
 */
export function sanitizeRejectedEmail({ messageId, fromHeader, subjectHeader, dateHeader, preview, parsed, hasAttachments }) {
  const domain = extractDomain(fromHeader);
  const senderRedacted = redactSensitiveText(fromHeader).slice(0, 100);
  const subjectRedacted = redactSensitiveText(subjectHeader || '(No Subject)').slice(0, 150);
  const previewRedacted = redactSensitiveText(preview || '').slice(0, 120);

  return {
    messageId: messageId ? crypto.createHash('sha256').update(messageId).digest('hex').slice(0, 16) : undefined,
    from: senderRedacted,
    domain: domain || 'unknown',
    subject: subjectRedacted,
    receivedAt: new Date(dateHeader).toISOString(),
    preview: previewRedacted,
    reason: parsed?.rejectionReason || 'NO_REWARD_SIGNALS',
    aiNotes: (parsed?.aiNotes || 'No loyalty program or active point balance detected.').slice(0, 200),
    hasAttachments: Boolean(hasAttachments),
  };
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

export function findPdfAttachments(payload) {
  const attachments = [];
  function traverse(part) {
    if (!part) return;
    const filename = (part.filename || '').toLowerCase();
    const mime = (part.mimeType || '').toLowerCase();
    const isPdf = mime === 'application/pdf' || filename.endsWith('.pdf');

    if (isPdf && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename || 'statement.pdf',
        mimeType: 'application/pdf',
        attachmentId: part.body.attachmentId,
        size: part.body.size || 0,
        isPdf: true,
        isImage: false,
      });
    }
    if (part.parts) {
      for (const p of part.parts) traverse(p);
    }
  }
  traverse(payload);
  return attachments;
}

export function findImageAttachments(payload) {
  const attachments = [];
  function traverse(part) {
    if (!part) return;
    const filename = (part.filename || '').toLowerCase();
    const mime = (part.mimeType || '').toLowerCase();
    const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(filename);

    if (isImage && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename || 'banner.png',
        mimeType: mime.startsWith('image/') ? mime : 'image/jpeg',
        attachmentId: part.body.attachmentId,
        size: part.body.size || 0,
        isPdf: false,
        isImage: true,
      });
    }
    if (part.parts) {
      for (const p of part.parts) traverse(p);
    }
  }
  traverse(payload);
  return attachments;
}

export function findDocumentAndImageAttachments(payload) {
  const attachments = [];
  function traverse(part) {
    if (!part) return;
    const filename = (part.filename || '').toLowerCase();
    const mime = (part.mimeType || '').toLowerCase();
    const isPdf = mime === 'application/pdf' || filename.endsWith('.pdf');
    const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(filename);

    if ((isPdf || isImage) && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename || (isPdf ? 'statement.pdf' : 'banner.png'),
        mimeType: isPdf ? 'application/pdf' : (mime.startsWith('image/') ? mime : 'image/jpeg'),
        attachmentId: part.body.attachmentId,
        size: part.body.size || 0,
        isPdf,
        isImage,
      });
    }
    if (part.parts) {
      for (const p of part.parts) traverse(p);
    }
  }
  traverse(payload);
  return attachments;
}

async function fetchAttachmentData(gmail, messageId, attachmentId) {
  try {
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    const rawData = res.data?.data;
    if (!rawData) return null;
    return rawData.replace(/-/g, '+').replace(/_/g, '/');
  } catch (err) {
    console.warn(`[GmailService] Attachment fetch failed for ${attachmentId}:`, err.message);
    return null;
  }
}

// ─── Persistence (via repository) ────────────────────────────────

async function persistLoyaltyResult(userId, parsed, fromHeader, subjectHeader, receivedAt, preview, provider, syncAccountId) {
  const detected = parsed.loyaltyData;
  const { effectiveFrom } = StatementParser.unwrapForwardedEmail(fromHeader, subjectHeader);
  const domain = extractDomain(effectiveFrom || fromHeader);
  const program = await EmailSyncRepo.findOrCreateProgramForStatement(domain, detected);
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
    // Which engine produced this value, so a balance can be audited or re-run.
    parsed.source === 'ai_extractor' ? 'ai_extractor' : 'rule_parser',
  ]);

  return { added, updated, accountId, program };
}

// ─── Scan pipeline ───────────────────────────────────────────────


const FETCH_DELAY_MS = Math.max(0, Number.parseInt(process.env.SYNC_FETCH_DELAY_MS || '40', 10) || 40);
const QUOTA_MAX_RETRIES = 4;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch one message with pacing + exponential backoff.
 * A deep lookback pulls 100+ full messages, which trips Gmail's per-minute
 * `Total Query Cost` quota; without backoff every remaining message fails and
 * the scan silently records 0 programs.
 */
async function fetchMessageWithBackoff(gmail, id) {
  let lastErr;
  for (let attempt = 0; attempt <= QUOTA_MAX_RETRIES; attempt++) {
    try {
      if (FETCH_DELAY_MS) await sleep(FETCH_DELAY_MS);
      return await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    } catch (err) {
      lastErr = err;
      const isQuota = /quota|rateLimit|rate limit|429|403/i.test(err.message || '');
      if (!isQuota || attempt === QUOTA_MAX_RETRIES) break;
      // 1s, 2s, 4s, 8s — enough headroom for the quota window to reopen.
      await sleep(1000 * 2 ** attempt);
      console.warn(`Gmail quota hit on message ${id}; retry ${attempt + 1}/${QUOTA_MAX_RETRIES}`);
    }
  }
  throw lastErr;
}

// Maximum matching messages to scan across entire mailbox history (up to 10,000 statements).
// Can be customized via SYNC_MAX_RESULTS if needed.
const DEFAULT_MAX_RESULTS = 10000;

function resolveMaxResults() {
  const override = Number.parseInt(process.env.SYNC_MAX_RESULTS || '', 10);
  if (Number.isFinite(override) && override > 0) return override;
  return DEFAULT_MAX_RESULTS;
}

async function scanGmailMessages(account, { maxResults = null, historyId = null, jobId = null } = {}) {
  const cap = maxResults || resolveMaxResults();
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
  const domains = await EmailSyncRepo.searchDomains();
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
      // Universal Intent Discovery: Search across the entire mailbox for all statement/points emails
      const seen = new Set();
      let pageToken = undefined;

      do {
        const pageSize = Math.min(500, cap - messages.length);
        if (pageSize <= 0) break;

        const listRes = await gmail.users.messages.list({
          userId: 'me',
          q: searchQuery,
          maxResults: pageSize,
          pageToken,
        });

        const rawMessages = listRes.data?.messages || [];
        for (const m of rawMessages) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            messages.push(m);
          }
        }

        pageToken = listRes.data?.nextPageToken;
        if (!pageToken || messages.length >= cap) break;
      } while (pageToken);

      // Sort oldest-to-newest so the latest statement is parsed last and reflects the true current balance.
      messages.reverse();
    }
  } catch (searchErr) {
    console.warn('Gmail search fallback:', searchErr.message);
    const seenFallback = new Set();
    let fallbackToken = undefined;
    try {
      do {
        const pageSize = Math.min(500, cap - messages.length);
        if (pageSize <= 0) break;
        const fallbackRes = await gmail.users.messages.list({
          userId: 'me',
          q: `points OR miles OR reward OR rewards OR statement OR balance OR "reward points" OR "points balance" OR supercoins OR neucoins OR membership`,
          maxResults: pageSize,
          pageToken: fallbackToken,
        });
        const rawFallback = fallbackRes.data?.messages || [];
        for (const m of rawFallback) {
          if (!seenFallback.has(m.id)) {
            seenFallback.add(m.id);
            messages.push(m);
          }
        }
        fallbackToken = fallbackRes.data?.nextPageToken;
        if (!fallbackToken || messages.length >= cap) break;
      } while (fallbackToken);
      messages.reverse();
    } catch (fbErr) {
      console.error('Fallback search error:', fbErr.message);
    }
  }

  // Fetching is done. Publish the parse phase and the real match count so the
  // app's progress bar reflects actual work instead of a guessed animation.
  if (jobId) {
    await EmailSyncRepo.markJobParsing(jobId, messages.length);
  }

/**
 * Executes async worker tasks with bounded concurrency.
 */
async function mapConcurrent(items, concurrency, fn) {
  let index = 0;
  const results = new Array(items.length);
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        console.error(`[GmailService] Worker error at index ${i}:`, err.message);
        results[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

  const concurrency = Math.max(1, Math.min(12, Number.parseInt(process.env.SYNC_CONCURRENCY || '6', 10) || 6));
  const detectedAccounts = [];
  const rejectedEmails = [];
  let programsAdded = 0;
  let programsUpdated = 0;
  let processed = 0;

  await mapConcurrent(messages, concurrency, async (msg) => {
    try {
      const detail = await fetchMessageWithBackoff(gmail, msg.id);
      if (!detail?.data?.payload) {
        processed += 1;
        return;
      }

      const headers = detail.data.payload.headers || [];
      const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date();
      const { text, html } = extractBodyParts(detail.data.payload);
      const preview = (text || html.replace(/<[^>]+>/g, ' ')).substring(0, 200);

      const attachmentMetaList = findDocumentAndImageAttachments(detail.data.payload);
      const attachments = [];

      // Download attached statement PDFs and promotional banners (up to 2 per message, max 10MB each)
      if (attachmentMetaList.length > 0) {
        for (const meta of attachmentMetaList.slice(0, 2)) {
          if (meta.size && meta.size > 10 * 1024 * 1024) continue;
          const base64Data = await fetchAttachmentData(gmail, msg.id, meta.attachmentId);
          if (base64Data) {
            attachments.push({
              filename: meta.filename,
              mimeType: meta.mimeType,
              base64Data,
              isPdf: meta.isPdf,
              isImage: meta.isImage,
            });
          }
        }
      }

      const parsed = await AIStatementParser.parseEmail({
        messageId: msg.id,
        fromHeader,
        subjectHeader,
        bodyText: text,
        bodyHtml: html,
        receivedDate: dateHeader,
        pdfAttachments: attachments,
        attachments,
      });

      if (parsed.isLoyaltyStatement && parsed.loyaltyData) {
        const persist = await persistLoyaltyResult(
          account.user_id, parsed, fromHeader, subjectHeader,
          new Date(dateHeader), preview, 'gmail', account.id
        );
        if (persist.added) programsAdded += 1;
        if (persist.updated) programsUpdated += 1;
        const detectionObj = {
          from: fromHeader,
          domain: extractDomain(fromHeader),
          subject: subjectHeader,
          receivedAt: new Date(dateHeader),
          preview,
          programName: persist.program?.name || parsed.loyaltyData.programName || extractDomain(fromHeader),
          category: persist.program?.category || 'other',
          balance: parsed.loyaltyData.balance ?? 0,
          accountNumber: parsed.loyaltyData.accountNumber || null,
          foundAt: new Date().toISOString(),
          ...parsed.loyaltyData,
        };
        detectedAccounts.push(detectionObj);

        processed += 1;
        // Stream newly discovered points immediately to sync_jobs.live_detections for the live dopamine feed!
        if (jobId) {
          await EmailSyncRepo.recordLiveDetection(jobId, {
            programName: detectionObj.programName,
            category: detectionObj.category,
            balance: detectionObj.balance,
            accountNumber: detectionObj.accountNumber,
            foundAt: detectionObj.foundAt,
          }, processed);
        }
      } else {
        const rejectedObj = sanitizeRejectedEmail({
          messageId: msg.id,
          fromHeader,
          subjectHeader,
          dateHeader,
          preview,
          parsed,
          hasAttachments: attachments.length > 0,
        });
        rejectedEmails.push(rejectedObj);

        processed += 1;
        // Stream sanitized rejected diagnostic to sync_jobs (capped at 100 entries)
        if (jobId && rejectedEmails.length <= 100) {
          await EmailSyncRepo.recordRejectedEmail(jobId, rejectedObj, processed);
        } else if (jobId && processed % PROGRESS_UPDATE_EVERY === 0) {
          await EmailSyncRepo.updateJobProgress(jobId, processed);
        }
      }
    } catch (msgErr) {
      processed += 1;
      console.error(`Error parsing message ${msg.id}:`, msgErr.message);
      if (jobId && processed % PROGRESS_UPDATE_EVERY === 0) {
        await EmailSyncRepo.updateJobProgress(jobId, processed);
      }
    }
  });

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
    accounts: detectedAccounts,
    rejectedEmails,
  };
}

/**
 * Execute one already-claimed sync job. Invoked by the background worker.
 * The connected account is loaded here rather than captured when the job was
 * queued, so the job survives an API restart between queueing and execution.
 */
export async function processSyncJob(job) {
  // Prefer the mailbox this job was queued for; fall back to the first connected
  // account so jobs created before the column existed still run.
  const account = job.email_sync_account_id
    ? await EmailSyncRepo.findById(job.user_id, job.email_sync_account_id)
    : await EmailSyncRepo.findConnected(job.user_id, job.provider);

  if (!account || account.status !== 'connected') {
    await EmailSyncRepo.markJobFailed(
      job.id,
      `No connected ${job.provider} account found. Reconnect it in the app.`
    );
    throw new Error('no connected sync account');
  }

  try {
    const result = await scanGmailMessages(account, { jobId: job.id });
    await EmailSyncRepo.markJobCompleted(job.id, {
      scanned: result.scanned,
      processed: result.processed,
      programsUpdated: result.programsAdded + result.programsUpdated,
    });
    return result;
  } catch (err) {
    let friendlyError = err.message || 'Gmail sync failed';
    if (
      friendlyError.includes('Insufficient Permission') ||
      friendlyError.includes('insufficient authentication scopes')
    ) {
      friendlyError =
        'Permission Needed: You must check the box for "View your email messages and settings" during Google Sign-In so PointzPlus can find your statements. Please remove this mailbox and reconnect.';
    }
    await EmailSyncRepo.markJobFailed(job.id, friendlyError);
    throw new Error(friendlyError);
  }
}

// `wait=true` exists for scripts and tests. It waits on the job row in the
// database rather than doing the work inside the request.
const SYNC_WAIT_POLL_MS = 1000;
const SYNC_WAIT_TIMEOUT_MS = 5 * 60 * 1000;

async function waitForJob(jobId, userId, timeoutMs = SYNC_WAIT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await EmailSyncRepo.getJob(jobId, userId);
    if (!job) return null;
    if (job.status === 'completed') return job;
    if (job.status === 'failed') {
      throw Object.assign(new Error(job.error_details || 'Gmail sync failed.'), {
        statusCode: 502,
      });
    }
    await sleep(SYNC_WAIT_POLL_MS);
  }
  throw Object.assign(
    new Error('Gmail sync is still running and will finish in the background.'),
    { statusCode: 504 }
  );
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

    // Verify scope granted
    const grantedScopes = (tokens.scope || '').toLowerCase();
    const hasGmailRead =
      grantedScopes.includes('gmail.readonly') ||
      grantedScopes.includes('https://www.googleapis.com/auth/gmail.readonly');

    // Fetch user email via OAuth2 userinfo
    let email = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
      const userinfo = await oauth2.userinfo.get();
      email = userinfo.data?.email;
    } catch {
      // Fallback if userinfo is unavailable
    }

    let historyId = null;
    try {
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      if (!email) email = profile.data?.emailAddress;
      historyId = profile.data?.historyId || null;
    } catch (err) {
      console.warn('Gmail getProfile note:', err.message);
      if (!hasGmailRead || err.message?.includes('Insufficient Permission') || err.message?.includes('insufficient authentication scopes')) {
        throw new Error(
          'Permission Needed: You must check the box for "View your email messages and settings" during Google Sign-In so PointzPlus can find your statements.'
        );
      }
    }

    if (!hasGmailRead) {
      throw new Error(
        'Permission Needed: You must check the box for "View your email messages and settings" during Google Sign-In so PointzPlus can find your statements.'
      );
    }

    if (!email) {
      throw new Error('Could not determine Google account email.');
    }

    const accessEnc = encryptToken(tokens.access_token);
    const refreshEnc = encryptToken(tokens.refresh_token || '');

    await EmailSyncRepo.upsertGmailOAuth({
      userId,
      email,
      tokens,
      accessEnc,
      refreshEnc,
      historyId,
    });

    return email;
  },

  /**
   * Queue a mailbox scan. The work always happens in the background worker, so
   * the response returns as soon as the job row exists.
   * `wait=true` is for scripts/tests: it then waits on the job row instead.
   */
  async scan(userId, provider, wait) {
    const accounts = await EmailSyncRepo.findAllConnected(userId, provider);
    if (accounts.length === 0) {
      return {
        status: 400,
        body: {
          error: 'No connected Gmail account found. Please connect your Gmail first.',
        },
      };
    }

    // One job per mailbox so every connected inbox is scanned, not just the
    // first. If a job is already in progress, reuse it instead of creating duplicates.
    const jobs = [];
    for (const account of accounts) {
      const active = await EmailSyncRepo.findActiveJob(userId, account.id);
      if (active) {
        jobs.push(active);
      } else {
        jobs.push(await EmailSyncRepo.createJob(userId, provider, account.id));
      }
    }
    // A worker claims these. Nudging the bus only removes the poll latency.
    notifyJobQueued();

    if (!wait) {
      return {
        status: 202,
        body: {
          jobId: jobs[0].id,
          jobIds: jobs.map((j) => j.id),
          accountsScanning: accounts.length,
          status: 'queued',
          message: `Scan started for ${accounts.length} mailbox(es). Poll GET /api/email-sync/jobs/:id for progress.`,
        },
      };
    }

    // Wait for every queued job, not just the first.
    const finished = [];
    for (const job of jobs) {
      try {
        finished.push(await waitForJob(job.id, userId));
      } catch (err) {
        return {
          status: err.statusCode || 500,
          body: { error: err.message, jobId: job.id },
        };
      }
    }

    const linked = await EmailSyncRepo.linkedAccountsWithPrograms(userId);
    const sum = (key) => finished.reduce((acc, j) => acc + (Number(j[key]) || 0), 0);

    return {
      status: 200,
      body: {
        jobId: jobs[0].id,
        jobIds: jobs.map((j) => j.id),
        status: finished.every((j) => j.status === 'completed') ? 'completed' : 'partial',
        accountsScanning: accounts.length,
        scanned: sum('total_messages_found'),
        processed: sum('messages_processed'),
        programsUpdated: sum('programs_updated'),
        accounts: linked,
      },
    };
  },

  getJob(jobId, userId) {
    return EmailSyncRepo.getJob(jobId, userId);
  },

  listAccounts(userId) {
    return EmailSyncRepo.listForUser(userId);
  },

  /**
   * Disconnect one mailbox. `accountId` identifies exactly which row to remove —
   * a user may have several connected, so provider alone is not enough.
   */
  async disconnect(userId, accountId) {
    if (!accountId) {
      return {
        status: 400,
        body: { error: 'An accountId is required to disconnect a mailbox.' },
      };
    }

    const account = await EmailSyncRepo.findById(userId, accountId);
    if (!account) {
      return {
        status: 404,
        body: { error: 'No such connected mailbox.' },
      };
    }

    await EmailSyncRepo.disconnect(userId, accountId);
    return {
      status: 200,
      body: { message: 'Disconnected successfully', email: account.email_address },
    };
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

    // Persist the Pub/Sub cursor before queueing so the worker resumes
    // incrementally instead of rescanning the whole inbox.
    if (historyId) {
      await EmailSyncRepo.updateHistoryId(account.id, historyId);
    }

    const job = await EmailSyncRepo.createJob(account.user_id, 'gmail');
    notifyJobQueued();
  },
};
