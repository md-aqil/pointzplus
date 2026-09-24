// server/routes/emailSync.js – Gmail-only OAuth, encrypted tokens, async scan & Pub/Sub webhooks
import express from 'express';
import crypto from 'crypto';
import { google } from 'googleapis';
import { query } from '../db.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import { encryptToken, decryptToken } from '../crypto.js';
import { StatementAndCouponParser } from '../services/statementAndCouponParser.js';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/email-sync/google/callback';
const GOOGLE_PUBSUB_TOPIC = process.env.GOOGLE_PUBSUB_TOPIC;
const APP_DEEP_LINK = process.env.APP_DEEP_LINK || 'pointzplus://email-sync/success?provider=google';
const WEB_RETURN_URL = process.env.WEB_RETURN_URL || 'http://localhost:8081/email-sync';

function createOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

// ─── OAuth state (CSRF protection) ───────────────────────────────────────────
// Signed, expiring HMAC payload instead of a raw userId, so an attacker cannot
// forge a state that binds the victim's session to their own OAuth consent.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function signOAuthState(userId) {
  const exp = Date.now() + OAUTH_STATE_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyOAuthState(state) {
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

// ─── Pub/Sub push authentication ─────────────────────────────────────────────
// Two supported mechanisms (checked in order):
//   1. PUBSUB_WEBHOOK_SECRET  → shared secret sent as "Authorization: Bearer <secret>"
//   2. Google-issued OIDC JWT → signature verified against Google's public certs
// Requests with neither are rejected (no more unauthenticated DoS vector).
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
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  if (header.alg !== 'RS256') return false;

  const iss = String(payload.iss || '');
  const validIssuer =
    iss === 'https://accounts.google.com' || iss.startsWith('https://pubsub.googleapis.com/');
  if (!validIssuer) return false;

  if (payload.aud && process.env.PUBSUB_WEBHOOK_AUDIENCE && payload.aud !== process.env.PUBSUB_WEBHOOK_AUDIENCE) {
    return false;
  }
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const keys = await fetchGoogleCerts();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return false;

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'));
}

async function isAuthorizedPubSubRequest(req) {
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

function buildLoyaltySearchQuery(domains = []) {
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

function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
}

function extractBodyParts(payload) {
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

async function persistLoyaltyResult(userId, parsed, fromHeader, subjectHeader, receivedAt, preview, provider, syncAccountId) {
  const detected = parsed.loyaltyData;
  const programResult = await query(
    `SELECT id, name FROM loyalty_programs
     WHERE seller_domain = $1 OR LOWER(name) LIKE LOWER($2)
     LIMIT 1`,
    [extractDomain(fromHeader), `%${detected.programName || detected.programId || ''}%`]
  );

  if (programResult.rows.length === 0) return { added: false, updated: false };

  const program = programResult.rows[0];
  const existing = await query(
    `SELECT id, current_balance FROM linked_accounts WHERE user_id = $1 AND program_id = $2`,
    [userId, program.id]
  );

  let accountId;
  let added = false;
  let updated = false;

  if (existing.rows.length === 0) {
    const insertResult = await query(
      `INSERT INTO linked_accounts (
         user_id, program_id, account_number_masked,
         current_balance, expiring_points, expiry_date,
         sync_method, sync_source, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, 'email_parser', $7, true)
       RETURNING *`,
      [
        userId,
        program.id,
        detected.accountNumber,
        detected.balance,
        detected.expiringPoints || 0,
        detected.expiryDate,
        provider,
      ]
    );
    accountId = insertResult.rows[0].id;
    added = true;
    await query(
      `INSERT INTO points_transactions (account_id, type, points, description, source, transaction_date)
       VALUES ($1, 'credit', $2, $3, 'email_parser', NOW())`,
      [accountId, detected.balance, `Statement from ${fromHeader}`]
    );
  } else {
    accountId = existing.rows[0].id;
    await query(
      `UPDATE linked_accounts
       SET current_balance = $1, expiring_points = $2, expiry_date = $3, last_synced_at = NOW()
       WHERE id = $4`,
      [detected.balance, detected.expiringPoints || 0, detected.expiryDate, accountId]
    );
    updated = true;
  }

  await query(
    `INSERT INTO email_statements (
       user_id, email_sync_account_id, from_email, subject, received_at,
       matched_program_id, extracted_balance, extracted_account_number,
       extracted_expiry_date, parser_confidence, parsed_successfully, raw_text_preview
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
    [
      userId,
      syncAccountId,
      fromHeader,
      subjectHeader,
      receivedAt || new Date(),
      program.id,
      detected.balance,
      detected.accountNumber,
      detected.expiryDate,
      detected.confidence || 0.95,
      preview || null,
    ]
  );

  return { added, updated, accountId, program };
}

async function persistCouponResult(userId, couponData, programId = null) {
  if (!couponData?.couponCode) return false;
  try {
    const result = await query(
      `INSERT INTO extracted_coupons (
         user_id, program_id, merchant_name, category, coupon_code, coupon_type,
         title, description, discount_value, minimum_spend_inr, expiry_date,
         email_message_id_hash, source_email_subject, source_sender, confidence_score
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (user_id, coupon_code, email_message_id_hash) DO NOTHING
       RETURNING id`,
      [
        userId,
        programId,
        couponData.merchantName,
        couponData.category || 'shopping',
        couponData.couponCode,
        couponData.couponType || 'discount_code',
        couponData.title,
        couponData.description || null,
        couponData.discountValue,
        couponData.minimumSpendINR || 0,
        couponData.expiryDate,
        couponData.emailMessageIdHash,
        couponData.sourceEmailSubject,
        couponData.sourceSender,
        couponData.confidenceScore || 0.95,
      ]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('Persist coupon error:', err.message);
    return false;
  }
}

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
    await query(
      `UPDATE email_sync_accounts
       SET oauth_token = $1, oauth_refresh_token = $2, encryption_iv = $3, encryption_tag = $4,
           refresh_encryption_iv = $5, refresh_encryption_tag = $6,
           token_expires_at = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        encrypted.ciphertext,
        refreshCiphertext,
        encrypted.iv,
        encrypted.tag,
        refreshIv,
        refreshTag,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        account.id,
      ]
    );
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const progRes = await query('SELECT seller_domain, name FROM loyalty_programs WHERE seller_domain IS NOT NULL');
  const domains = progRes.rows.map((r) => r.seller_domain).filter(Boolean);
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
          account.user_id,
          parsed,
          fromHeader,
          subjectHeader,
          new Date(dateHeader),
          preview,
          'gmail',
          account.id
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

  await query(
    `UPDATE email_sync_accounts
     SET last_synced_at = NOW(), programs_found = $1, history_id = $2, updated_at = NOW()
     WHERE id = $3`,
    [detectedAccounts.length, nextHistoryId || null, account.id]
  );

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
    await query(
      `UPDATE sync_jobs SET status = 'fetching', started_at = NOW() WHERE id = $1`,
      [jobId]
    );
    const result = await scanGmailMessages(account);
    await query(
      `UPDATE sync_jobs
       SET status = 'completed',
           total_messages_found = $1,
           messages_processed = $2,
           coupons_extracted = $3,
           programs_updated = $4,
           completed_at = NOW()
       WHERE id = $5`,
      [result.scanned, result.processed, result.couponsInserted, result.programsAdded + result.programsUpdated, jobId]
    );
    return result;
  } catch (err) {
    await query(
      `UPDATE sync_jobs SET status = 'failed', error_details = $1, completed_at = NOW() WHERE id = $2`,
      [err.message, jobId]
    );
    throw err;
  }
}

router.get('/google/url', authenticate, (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured in server/.env' });
  }

  const oAuth2Client = createOAuthClient();
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: signOAuthState(req.userId),
    prompt: 'consent',
    include_granted_scopes: true,
  });

  res.json({ url });
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const userId = verifyOAuthState(req.query.state);
    if (!code) return res.status(400).send('Authorization code missing');
    if (!userId) return res.status(400).send('Invalid or expired OAuth state. Please reconnect from the app.');

    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;
    const accessEnc = encryptToken(tokens.access_token);
    const refreshEnc = encryptToken(tokens.refresh_token || '');

    await query(
      `INSERT INTO email_sync_accounts (
         user_id, provider, email_address, oauth_token, oauth_refresh_token,
         token_expires_at, status, encryption_iv, encryption_tag, history_id,
         refresh_encryption_iv, refresh_encryption_tag
       ) VALUES ($1, 'gmail', $2, $3, $4, $5, 'connected', $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         oauth_token = $3,
         oauth_refresh_token = $4,
         token_expires_at = $5,
         encryption_iv = $6,
         encryption_tag = $7,
         history_id = $8,
         refresh_encryption_iv = $9,
         refresh_encryption_tag = $10,
         email_address = $2,
         status = 'connected',
         updated_at = NOW()`,
      [
        userId,
        email,
        accessEnc.ciphertext,
        refreshEnc.ciphertext,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accessEnc.iv,
        accessEnc.tag,
        profile.data.historyId || null,
        refreshEnc.iv,
        refreshEnc.tag,
      ]
    );

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Connected - PointzPlus</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5FEFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 10px 30px rgba(1, 162, 251, 0.1); text-align: center; max-width: 360px; }
            h2 { color: #070617; margin: 16px 0 8px; }
            p { color: #6A6A74; font-size: 14px; margin-bottom: 24px; }
            .btn { background: #01A2FB; color: white; padding: 14px 24px; border-radius: 14px; text-decoration: none; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 48px;">✅</div>
            <h2>Gmail Connected!</h2>
            <p>Your Gmail account (${email}) has been securely linked. Return to PointzPlus to scan your points & coupons.</p>
            <a href="${WEB_RETURN_URL}" class="btn">Return to PointzPlus</a>
          </div>
          <script>
            window.location.href = "${APP_DEEP_LINK}";
            setTimeout(() => { window.location.href = "${WEB_RETURN_URL}"; }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Google callback error:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

router.post('/scan', authenticate, async (req, res) => {
  try {
    const { provider = 'gmail', wait = true } = req.body;
    const accountResult = await query(
      `SELECT * FROM email_sync_accounts WHERE user_id = $1 AND provider = $2 AND status = 'connected'`,
      [req.userId, provider]
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No connected Gmail account found. Please connect your Gmail first.',
      });
    }

    const account = accountResult.rows[0];
    const jobInsert = await query(
      `INSERT INTO sync_jobs (user_id, provider, status)
       VALUES ($1, $2, 'queued')
       RETURNING *`,
      [req.userId, provider]
    );
    const job = jobInsert.rows[0];

    if (wait === false) {
      setImmediate(() => {
        runScanJob(job.id, account).catch((err) => console.error('Background scan failed:', err.message));
      });
      return res.status(202).json({
        jobId: job.id,
        status: 'queued',
        message: 'Scan started. Poll GET /api/email-sync/jobs/:id for progress.',
      });
    }

    const result = await runScanJob(job.id, account);
    const linked = await query(
      `SELECT la.*, lp.name as program_name, lp.slug as program_slug, lp.category, lp.logo_initial, lp.accent_color, lp.point_value_inr
       FROM linked_accounts la
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE la.user_id = $1 AND la.is_active = true
       ORDER BY la.last_synced_at DESC NULLS LAST`,
      [req.userId]
    );
    const coupons = await query(
      `SELECT * FROM extracted_coupons
       WHERE user_id = $1 AND is_used = false
       ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );

    res.json({
      jobId: job.id,
      scanned: result.scanned,
      processed: result.processed,
      added: result.programsAdded,
      updated: result.programsUpdated,
      couponsExtracted: result.couponsInserted,
      accounts: linked.rows,
      coupons: coupons.rows,
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Scan failed: ' + err.message });
  }
});

router.get('/jobs/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM sync_jobs WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.get('/accounts', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, provider, email_address, status, programs_found, last_synced_at, created_at, watch_expiration
       FROM email_sync_accounts WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.delete('/accounts/:provider', authenticate, async (req, res) => {
  try {
    await query(`DELETE FROM email_sync_accounts WHERE user_id = $1 AND provider = $2`, [
      req.userId,
      req.params.provider,
    ]);
    res.json({ message: 'Disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

router.post('/google/watch', authenticate, async (req, res) => {
  try {
    if (!GOOGLE_PUBSUB_TOPIC) {
      return res.status(400).json({
        error: 'GOOGLE_PUBSUB_TOPIC is not configured. Set it to projects/<project>/topics/<topic>.',
      });
    }

    const accountResult = await query(
      `SELECT * FROM email_sync_accounts WHERE user_id = $1 AND provider = 'gmail' AND status = 'connected'`,
      [req.userId]
    );
    if (accountResult.rows.length === 0) {
      return res.status(400).json({ error: 'Connect Gmail before enabling watch.' });
    }

    const account = accountResult.rows[0];
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
      requestBody: {
        topicName: GOOGLE_PUBSUB_TOPIC,
        labelIds: ['INBOX'],
      },
    });

    await query(
      `UPDATE email_sync_accounts
       SET watch_expiration = $1, watch_resource_id = $2, history_id = COALESCE($3, history_id), updated_at = NOW()
       WHERE id = $4`,
      [
        watchRes.data.expiration ? new Date(parseInt(watchRes.data.expiration, 10)) : null,
        watchRes.data.historyId || null,
        watchRes.data.historyId || null,
        account.id,
      ]
    );

    res.json({
      success: true,
      expiration: watchRes.data.expiration,
      historyId: watchRes.data.historyId,
    });
  } catch (err) {
    console.error('Gmail watch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Google Cloud Pub/Sub push — no user JWT; payload is base64 JSON { emailAddress, historyId }
router.post('/google/webhook', async (req, res) => {
  const authorized = await isAuthorizedPubSubRequest(req).catch(() => false);
  if (!authorized) {
    return res.status(401).json({
      error:
        'Unauthorized. Set PUBSUB_WEBHOOK_SECRET in server/.env and send it as "Authorization: Bearer <secret>", or configure an OIDC token on the Pub/Sub push subscription.',
    });
  }

  res.status(200).send('OK');
  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const dataString = Buffer.from(message.data, 'base64').toString('utf-8');
    const { emailAddress, historyId } = JSON.parse(dataString);
    if (!emailAddress) return;

    const accountResult = await query(
      `SELECT * FROM email_sync_accounts WHERE email_address = $1 AND provider = 'gmail' AND status = 'connected' LIMIT 1`,
      [emailAddress]
    );
    if (accountResult.rows.length === 0) return;

    const account = accountResult.rows[0];
    const jobInsert = await query(
      `INSERT INTO sync_jobs (user_id, provider, status) VALUES ($1, 'gmail', 'queued') RETURNING id`,
      [account.user_id]
    );
    await runScanJob(jobInsert.rows[0].id, { ...account, history_id: historyId || account.history_id });
  } catch (err) {
    console.error('Gmail webhook error:', err.message);
  }
});

export { JWT_SECRET };
export default router;
