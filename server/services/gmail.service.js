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

// ─── Gmail search & body helpers ─────────────────────────────────

// How far back a scan looks. Overridable so a deliberate deep rescan can
// recover older statements (e.g. SYNC_LOOKBACK_DAYS=1825 for ~5 years)
// without editing code. Defaults to the normal 60-day window.
const SYNC_LOOKBACK_DAYS = Math.max(
  1,
  Number.parseInt(process.env.SYNC_LOOKBACK_DAYS || '60', 10) || 60
);

// Share of each scan's message cap reserved for the keyword search, so a
// statement from an uncatalogued sender is still reachable. The floor is 5.
const KEYWORD_BUDGET_RATIO = 0.3;

// Broad terms used to find loyalty mail whose sender is not in the catalogue.
// Kept as a standalone constant so the keyword-only phase can reuse it.
const KEYWORD_TERMS =
  'points OR miles OR "reward points" OR SuperCoins OR statement OR "reward balance" OR "points balance" OR "loyalty statement" OR "points statement"';

export function buildLoyaltySearchQuery(domains = [], lookbackDays = SYNC_LOOKBACK_DAYS) {
  const unique = [...new Set(domains.filter(Boolean))];
  const domainFilters = unique.slice(0, 25).map((d) => `from:${d}`).join(' OR ');
  const dateFilter = `newer_than:${lookbackDays}d`;
  if (domainFilters) {
    return `((${domainFilters}) OR (${KEYWORD_TERMS})) ${dateFilter}`;
  }
  return `(${KEYWORD_TERMS}) ${dateFilter}`;
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
  const domain = extractDomain(fromHeader);
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


const FETCH_DELAY_MS = Math.max(0, Number.parseInt(process.env.SYNC_FETCH_DELAY_MS || '120', 10) || 120);
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

// Cap on messages fetched per scan. A deep lookback needs headroom, so the
// cap scales with SYNC_LOOKBACK_DAYS (60d -> 40, ~5y -> 200).
const DEFAULT_MAX_RESULTS = 40;

function resolveMaxResults() {
  const override = Number.parseInt(process.env.SYNC_MAX_RESULTS || '', 10);
  if (Number.isFinite(override) && override > 0) return override;
  return Math.min(200, Math.round(DEFAULT_MAX_RESULTS * (SYNC_LOOKBACK_DAYS / 60)));
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
      // Two-phase search. A single combined query returns the *newest* N
      // matches, and the broad keyword branch (points/statement) is
      // dominated by newsletters — so loyalty mail beyond the cap is never
      // seen. Phase 1 queries each program domain directly (these are
      // unambiguous), phase 2 tops up with the keyword search using whatever
      // budget is left. A deep lookback therefore actually reaches old mail.
      const perDomain = Math.max(
        1,
        Math.ceil(cap / Math.max(1, domains.length))
      );
      const domainQueries = domains.map((d) => `from:${d} newer_than:${SYNC_LOOKBACK_DAYS}d`);

      const domainResults = await Promise.all(
        domainQueries.map((q) =>
          gmail.users
            .messages
            .list({ userId: 'me', q, maxResults: perDomain })
            .then((r) => r.data.messages || [])
            .catch((e) => {
              console.warn(`Gmail domain search failed (${q}):`, e.message);
              return [];
            })
        )
      );

      const seen = new Set();
      for (const list of domainResults) {
        for (const m of list) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            messages.push(m);
          }
        }
      }

      // Top up with keyword matches. A slice of the budget is always reserved:
      // when every program domain is well represented the domain pass alone can
      // fill the cap, and a statement from a sender the catalogue does not know
      // (so no `from:` filter would match) could never be found at all.
      const keywordBudget = Math.max(
        5,
        Math.floor(cap * KEYWORD_BUDGET_RATIO),
        0
      );
      const domainBudget = Math.max(0, cap - keywordBudget);
      const remaining = Math.min(keywordBudget, Math.max(0, domainBudget - messages.length));

      if (remaining > 0) {
        // Keyword-only here (not the combined query): any `from:` clause would
        // just re-return the domain matches already collected in phase 1.
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          q: `(${KEYWORD_TERMS}) newer_than:${SYNC_LOOKBACK_DAYS}d`,
          maxResults: remaining,
        });
        for (const m of listRes.data.messages || []) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            messages.push(m);
          }
        }
      }

      // Newest first so the capped set reflects current balances.
      messages.sort((a, b) => (Number(b.internalDate) || b.id?.length || 0) - (Number(a.internalDate) || a.id?.length || 0));
    }
  } catch (searchErr) {
    console.warn('Gmail search fallback:', searchErr.message);
    const fallbackRes = await gmail.users.messages.list({
      userId: 'me',
      q: `(points OR miles OR "reward points" OR "points balance" OR statement) newer_than:${SYNC_LOOKBACK_DAYS}d`,
      maxResults: Math.min(20, cap),
    });
    messages = fallbackRes.data.messages || [];
  }

  // Fetching is done. Publish the parse phase and the real match count so the
  // app's progress bar reflects actual work instead of a guessed animation.
  if (jobId) {
    await EmailSyncRepo.markJobParsing(jobId, messages.length);
  }

  const detectedAccounts = [];
  let programsAdded = 0;
  let programsUpdated = 0;
  let processed = 0;

  for (const msg of messages) {
    try {
      const detail = await fetchMessageWithBackoff(gmail, msg.id);

      const headers = detail.data.payload?.headers || [];
      const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date();
      const { text, html } = extractBodyParts(detail.data.payload);
      const preview = (text || html.replace(/<[^>]+>/g, ' ')).substring(0, 200);

      const parsed = await AIStatementParser.parseEmail({
        messageId: msg.id,
        fromHeader,
        subjectHeader,
        bodyText: text,
        bodyHtml: html,
        receivedDate: dateHeader,
      });

      if (parsed.isLoyaltyStatement && parsed.loyaltyData) {
        const persist = await persistLoyaltyResult(
          account.user_id, parsed, fromHeader, subjectHeader,
          new Date(dateHeader), preview, 'gmail', account.id
        );
        if (persist.added) programsAdded += 1;
        if (persist.updated) programsUpdated += 1;
        detectedAccounts.push({
          from: fromHeader,
          domain: extractDomain(fromHeader),
          subject: subjectHeader,
          receivedAt: new Date(dateHeader),
          preview,
          ...parsed.loyaltyData,
        });
      }

      processed += 1;
      // Batched heartbeat: cheap enough to stay responsive, not so chatty that
      // it doubles the query count on a large inbox.
      if (jobId && processed % PROGRESS_UPDATE_EVERY === 0) {
        await EmailSyncRepo.updateJobProgress(jobId, processed);
      }
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
    accounts: detectedAccounts,
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
    await EmailSyncRepo.markJobFailed(job.id, err.message);
    throw err;
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
      if (!email) {
        throw new Error(
          'Insufficient Permission: Make sure "Gmail API" is enabled in Google Cloud Console and that the Gmail read-only checkbox was allowed during sign-in.'
        );
      }
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
    // first. They run sequentially in the worker via SKIP LOCKED claiming.
    const jobs = [];
    for (const account of accounts) {
      jobs.push(await EmailSyncRepo.createJob(userId, provider, account.id));
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
