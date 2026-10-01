// server/repositories/emailSync.repo.js – email_sync_accounts, sync_jobs,
// statement persistence for the Gmail pipeline.
import { query } from '../db.js';
import { STATEMENT_RULES } from '../services/statementParser.js';

// Sibling/alias sender domains → the parser rule that owns them. The catalogue
// only stores one primary `seller_domain` per program, but statements routinely

/** Value used for dynamically registered programs; see the INSERT below. */
const DEFAULT_POINT_VALUE_INR = 0.25;

// arrive from another brand in the same group (Flipkart SuperCoins → myntra.com).
const DOMAIN_TO_RULE_PROGRAM = new Map();
for (const rule of STATEMENT_RULES) {
  for (const d of rule.domains || []) {
    if (!DOMAIN_TO_RULE_PROGRAM.has(d)) {
      DOMAIN_TO_RULE_PROGRAM.set(d, rule.programId);
    }
  }
}

const domainRuleProgramId = (domain) =>
  (domain ? DOMAIN_TO_RULE_PROGRAM.get(String(domain).toLowerCase()) : undefined) || null;

/**
 * True when the sender domain is one we already recognise — either a catalogue
 * `seller_domain` or a known parser alias. Only these may fall through to a fuzzy
 * name match; an unknown sender must never borrow an existing programme.
 */
async function isTrustedSenderDomain(domain) {
  if (DOMAIN_TO_RULE_PROGRAM.has(String(domain).toLowerCase())) return true;
  const row = await query(
    'SELECT 1 FROM loyalty_programs WHERE seller_domain = $1 LIMIT 1',
    [domain]
  ).then((r) => r.rows[0] || null);
  return Boolean(row);
}

export const EmailSyncRepo = {
  // ── email_sync_accounts ────────────────────────────────────────
  /** First connected account for a provider (used when no specific one is given). */
  findConnected(userId, provider) {
    return query(
      `SELECT * FROM email_sync_accounts
       WHERE user_id = $1 AND provider = $2 AND status = 'connected'
       ORDER BY created_at ASC LIMIT 1`,
      [userId, provider]
    ).then((r) => r.rows[0] || null);
  },

  /** Every connected mailbox for a provider, oldest first. */
  findAllConnected(userId, provider) {
    return query(
      `SELECT * FROM email_sync_accounts
       WHERE user_id = $1 AND provider = $2 AND status = 'connected'
       ORDER BY created_at ASC`,
      [userId, provider]
    ).then((r) => r.rows);
  },

  findById(userId, id) {
    return query(
      `SELECT * FROM email_sync_accounts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    ).then((r) => r.rows[0] || null);
  },

  findByEmail(email) {
    return query(
      `SELECT * FROM email_sync_accounts
       WHERE email_address = $1 AND provider = 'gmail' AND status = 'connected'
       LIMIT 1`,
      [email]
    ).then((r) => r.rows[0] || null);
  },

  /** True when this user has already connected this exact mailbox. */
  isEmailConnected(userId, emailAddress, provider = 'gmail') {
    return query(
      `SELECT 1 FROM email_sync_accounts
       WHERE user_id = $1 AND provider = $2 AND email_address = $3
         AND status = 'connected'
       LIMIT 1`,
      [userId, provider, emailAddress]
    ).then((r) => Boolean(r.rows[0]));
  },

  listForUser(userId) {
    return query(
      `SELECT id, provider, email_address, status, programs_found, last_synced_at, created_at, watch_expiration
       FROM email_sync_accounts WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    ).then((r) => r.rows);
  },

  upsertGmailOAuth({ userId, email, tokens, accessEnc, refreshEnc, historyId }) {
    return query(
      `INSERT INTO email_sync_accounts (
         user_id, provider, email_address, oauth_token, oauth_refresh_token,
         token_expires_at, status, encryption_iv, encryption_tag, history_id,
         refresh_encryption_iv, refresh_encryption_tag
       ) VALUES ($1, 'gmail', $2, $3, $4, $5, 'connected', $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, provider, email_address)
       DO UPDATE SET
         oauth_token = $3, oauth_refresh_token = $4, token_expires_at = $5,
         encryption_iv = $6, encryption_tag = $7, history_id = $8,
         refresh_encryption_iv = $9, refresh_encryption_tag = $10,
         status = 'connected', updated_at = NOW()
       RETURNING *`,
      [
        userId, email, accessEnc.ciphertext, refreshEnc.ciphertext,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accessEnc.iv, accessEnc.tag, historyId || null, refreshEnc.iv, refreshEnc.tag,
      ]
    ).then((r) => r.rows[0]);
  },

  updateTokens({ accountId, accessEnc, refreshCiphertext, refreshIv, refreshTag, expiryDate }) {
    return query(
      `UPDATE email_sync_accounts
       SET oauth_token = $1, oauth_refresh_token = $2, encryption_iv = $3, encryption_tag = $4,
           refresh_encryption_iv = $5, refresh_encryption_tag = $6,
           token_expires_at = $7, updated_at = NOW()
       WHERE id = $8`,
      [accessEnc.ciphertext, refreshCiphertext, accessEnc.iv, accessEnc.tag,
       refreshIv, refreshTag, expiryDate, accountId]
    );
  },

  updateScanMeta({ accountId, programsFound, historyId }) {
    return query(
      `UPDATE email_sync_accounts
       SET last_synced_at = NOW(), programs_found = $1, history_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [programsFound, historyId || null, accountId]
    );
  },

  updateWatch({ accountId, expiration, resourceId, historyId }) {
    return query(
      `UPDATE email_sync_accounts
       SET watch_expiration = $1, watch_resource_id = $2, history_id = COALESCE($3, history_id), updated_at = NOW()
       WHERE id = $4`,
      [expiration, resourceId, historyId, accountId]
    );
  },

  /** Advance only the Gmail history cursor (used by the Pub/Sub webhook). */
  updateHistoryId(accountId, historyId) {
    return query(
      `UPDATE email_sync_accounts
       SET history_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [accountId, historyId]
    );
  },

  /**
   * Disconnect one specific mailbox. `accountId` is required so removing a
   * second mailbox can never delete the user's first one.
   */
  disconnect(userId, accountId) {
    if (!accountId) {
      // Legacy call without an id: refuse rather than delete every mailbox.
      return Promise.reject(new Error('accountId is required to disconnect'));
    }
    return query(
      `DELETE FROM email_sync_accounts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [accountId, userId]
    );
  },

  // ── sync_jobs ──────────────────────────────────────────────────
  /** A job is bound to one mailbox so several connections scan independently. */
  createJob(userId, provider, accountId = null) {
    return query(
      `INSERT INTO sync_jobs (user_id, provider, email_sync_account_id, status)
       VALUES ($1, $2, $3, 'queued') RETURNING *`,
      [userId, provider, accountId]
    ).then((r) => r.rows[0]);
  },

  getJob(id, userId) {
    return query(`SELECT * FROM sync_jobs WHERE id = $1 AND user_id = $2`, [id, userId]).then(
      (r) => r.rows[0] || null
    );
  },

  findActiveJob(userId, accountId) {
    return query(
      `SELECT * FROM sync_jobs
       WHERE user_id = $1 AND email_sync_account_id = $2
         AND status IN ('queued', 'fetching', 'parsing')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, accountId]
    ).then((r) => r.rows[0] || null);
  },

  /**
   * Atomically claim the oldest queued job for this worker.
   * FOR UPDATE SKIP LOCKED makes this safe with several API instances running
   * workers at once: each claims a disjoint row, never the same one twice.
   */
  claimNextJob(workerId) {
    return query(
      `UPDATE sync_jobs
       SET status = 'fetching',
           worker_id = $1,
           locked_at = NOW(),
           started_at = COALESCE(started_at, NOW()),
           attempt_count = attempt_count + 1
       WHERE id = (
         SELECT id FROM sync_jobs
         WHERE status = 'queued'
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *`,
      [workerId]
    ).then((r) => r.rows[0] || null);
  },

  /** Fetching is done; move to parsing and record how many messages matched. */
  markJobParsing(jobId, totalMessages) {
    return query(
      `UPDATE sync_jobs
       SET status = 'parsing', total_messages_found = $2, locked_at = NOW()
       WHERE id = $1`,
      [jobId, totalMessages]
    );
  },

  /** Heartbeat + live per-message progress for the mobile progress bar. */
  updateJobProgress(jobId, processed) {
    return query(
      `UPDATE sync_jobs SET messages_processed = $2, locked_at = NOW() WHERE id = $1`,
      [jobId, processed]
    );
  },

  /** Stream newly detected loyalty discovery immediately for live client dopamine feed. */
  recordLiveDetection(jobId, detection, processed) {
    return query(
      `UPDATE sync_jobs
       SET live_detections = COALESCE(live_detections, '[]'::jsonb) || $2::jsonb,
           programs_updated = programs_updated + 1,
           messages_processed = $3,
           locked_at = NOW()
       WHERE id = $1`,
      [jobId, JSON.stringify([detection]), processed]
    );
  },

  /**
   * Recover jobs abandoned by a crashed or restarted worker.
   * In-flight rows whose heartbeat is older than the cutoff go back to 'queued'
   * until they exhaust their attempts, then are marked failed so a poison
   * message can never spin forever.
   */
  requeueStaleJobs(staleAfterMinutes = 5) {
    return query(
      `UPDATE sync_jobs
       SET status = CASE
                      WHEN attempt_count >= 3 THEN 'failed'::sync_job_status
                      ELSE 'queued'::sync_job_status
                    END,
           worker_id = NULL,
           locked_at = NULL,
           last_error = 'Worker stopped before this scan finished.',
           error_details = CASE
                              WHEN attempt_count >= 3
                                THEN 'Sync failed after repeated worker interruptions.'
                              ELSE error_details
                            END,
           completed_at = CASE WHEN attempt_count >= 3 THEN NOW() ELSE NULL END
       WHERE status IN ('fetching', 'parsing')
         AND locked_at IS NOT NULL
         AND locked_at < NOW() - ($1 || ' minutes')::interval
       RETURNING id`,
      [String(staleAfterMinutes)]
    ).then((r) => r.rowCount);
  },

  markJobCompleted(jobId, stats) {
    return query(
      `UPDATE sync_jobs
       SET status = 'completed', total_messages_found = $1, messages_processed = $2,
           programs_updated = $3,
           worker_id = NULL, locked_at = NULL, completed_at = NOW()
       WHERE id = $4`,
      [stats.scanned, stats.processed, stats.programsUpdated, jobId]
    );
  },

  markJobFailed(jobId, errorMessage) {
    return query(
      `UPDATE sync_jobs
       SET status = 'failed', error_details = $1, last_error = $1,
           worker_id = NULL, locked_at = NULL, completed_at = NOW()
       WHERE id = $2`,
      [errorMessage, jobId]
    );
  },

  // ── statement persistence ──────────────────────────────────────
  findProgramForStatement(domain, nameLike) {
    return query(
      `SELECT id, name FROM loyalty_programs
       WHERE seller_domain = $1 OR LOWER(name) LIKE LOWER($2)
       LIMIT 1`,
      [domain, nameLike]
    ).then((r) => r.rows[0] || null);
  },

  async findOrCreateProgramForStatement(domain, detected) {
    const brandName = detected.brandName || detected.programName || 'Loyalty Program';
    const programName = detected.programName || detected.brandName || brandName;
    const category = detected.category || 'shopping';
    const slug = (detected.programId || brandName.toLowerCase().replace(/[^a-z0-9]+/g, '_')).slice(0, 50);

    // 1. Prefer unambiguous matches: sender domain, then exact slug/name. A
    //    name collision can never pick the wrong program here.
    const exact = await query(
      `SELECT id, name, category, point_value_inr, slug FROM loyalty_programs
       WHERE (seller_domain IS NOT NULL AND seller_domain = $1)
          OR slug = $2
          OR LOWER(name) = LOWER($3)
       ORDER BY CASE
         WHEN seller_domain IS NOT NULL AND seller_domain = $1 THEN 1
         WHEN slug = $2 THEN 2
         ELSE 3
       END
       LIMIT 1`,
      [domain, slug, programName]
    ).then((r) => r.rows[0] || null);

    if (exact) return exact;

    // 2. Resolve the sender through the parser's own domain map. A program often
    //    mails from a sibling brand (Flipkart SuperCoins arrives from
    //    myntra.com), and that alias is only known to STATEMENT_RULES — not to
    //    loyalty_programs.seller_domain. Matching on it keeps those statements
    //    attached to the existing program instead of creating a duplicate.
    const ruleProgramId = domainRuleProgramId(domain);
    if (ruleProgramId) {
      const viaRule = await query(
        `SELECT id, name, category, point_value_inr, slug FROM loyalty_programs
         WHERE slug = $1
         LIMIT 1`,
        [ruleProgramId]
      ).then((r) => r.rows[0] || null);

      if (viaRule) return viaRule;
    }

    // 3. Fuzzy name match, but ONLY when the sender is a domain we already
    //    trust (a catalogue seller_domain or a known parser alias). The AI
    //    extractor emits short generic names ("Rewards", "Points", "Miles"), so
    //    a bare LIKE on an untrusted sender matches whichever catalogue row
    //    sorts first and silently overwrites an unrelated account's balance.
    if (domain && (await isTrustedSenderDomain(domain))) {
      const fuzzy = await query(
        `SELECT id, name, category, point_value_inr, slug FROM loyalty_programs
         WHERE LOWER(name) LIKE LOWER($1)
           AND LENGTH(name) - LENGTH(REPLACE(LOWER(name), LOWER($2), ''))
               >= LENGTH($2)
         ORDER BY CHAR_LENGTH(name) ASC
         LIMIT 1`,
        [`%${programName}%`, programName]
      ).then((r) => r.rows[0] || null);

      if (fuzzy) return fuzzy;
    }

    // 4. Not in the static catalogue: register it dynamically so the user's
    //    points are still tracked.
    try {
      const created = await query(
        `INSERT INTO loyalty_programs (
           name, category, logo_initial, accent_color, point_value_inr, seller_domain, slug, email_parser_enabled
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (name, category) DO UPDATE SET email_parser_enabled = true
         RETURNING id, name, category, point_value_inr, slug`,
        [
          programName,
          category,
          programName.substring(0, 2).toUpperCase(),
          detected.accentColor || '#01A2FB',
          // Always the conservative default, never a caller-supplied value.
          // point_value_inr feeds the portfolio value shown to the user, and a
          // fabricated estimate (e.g. from the AI extractor) would silently
          // corrupt it. A human can correct this row later.
          DEFAULT_POINT_VALUE_INR,
          domain || null,
          slug,
        ]
      ).then((r) => r.rows[0]);
      return created;
    } catch (err) {
      // If conflict on slug or other constraint, fetch fallback
      const fallback = await query(
        `SELECT id, name, category, point_value_inr, slug FROM loyalty_programs
         WHERE LOWER(name) = LOWER($1) OR slug = $2
         LIMIT 1`,
        [programName, slug]
      ).then((r) => r.rows[0] || null);
      return fallback;
    }
  },

  findStatementAccount(userId, programId) {
    return query(
      `SELECT id, current_balance FROM linked_accounts WHERE user_id = $1 AND program_id = $2`,
      [userId, programId]
    ).then((r) => r.rows[0] || null);
  },

  insertStatementAccount({ userId, programId, detected, provider }) {
    return query(
      `INSERT INTO linked_accounts (
         user_id, program_id, account_number_masked,
         current_balance, expiring_points, expiry_date,
         sync_method, sync_source, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, 'email_parser', $7, true)
       RETURNING *`,
      [userId, programId, detected.accountNumber, detected.balance,
       detected.expiringPoints || 0, detected.expiryDate, provider]
    ).then((r) => r.rows[0]);
  },

  updateStatementBalance({ programId, userId, detected }) {
    return query(
      `UPDATE linked_accounts
       SET current_balance = $1, expiring_points = $2, expiry_date = $3, last_synced_at = NOW()
       WHERE user_id = $4 AND program_id = $5`,
      [detected.balance, detected.expiringPoints || 0, detected.expiryDate, userId, programId]
    );
  },

  insertStatementTransaction({ accountId, points, description }) {
    return query(
      `INSERT INTO points_transactions (account_id, type, points, description, source, transaction_date)
       VALUES ($1, 'credit', $2, $3, 'email_parser', NOW())`,
      [accountId, points, description]
    );
  },

  insertEmailStatement(fields) {
    return query(
      `INSERT INTO email_statements (
         user_id, email_sync_account_id, from_email, subject, received_at,
         matched_program_id, extracted_balance, extracted_account_number,
         extracted_expiry_date, parser_confidence, parsed_successfully, raw_text_preview,
         extraction_source
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12)`,
      fields
    );
  },

  // ── scan result reads ──────────────────────────────────────────
  /**
   * Every domain a scan should search, not just each program's primary
   * `seller_domain`. Programs routinely mail from a sibling brand (Flipkart
   * SuperCoins statements arrive from myntra.com), and those statements are
   * only discoverable if their real sender domain is searched. Mirrors the
   * `domains` lists in the parser's STATEMENT_RULES.
   */
  searchDomains() {
    return query(
      `SELECT seller_domain, name FROM loyalty_programs WHERE seller_domain IS NOT NULL`
    ).then((r) => {
      const primary = r.rows.map((x) => x.seller_domain).filter(Boolean);
      return [...new Set([...primary, ...STATEMENT_RULES.flatMap((rule) => rule.domains)])];
    });
  },

  /** Primary (catalogue) domains only — used for the program lookup. */
  sellerDomains() {
    return query(
      'SELECT seller_domain, name FROM loyalty_programs WHERE seller_domain IS NOT NULL'
    ).then((r) => r.rows.map((x) => x.seller_domain).filter(Boolean));
  },

  linkedAccountsWithPrograms(userId) {
    return query(
      `SELECT la.*, lp.name as program_name, lp.slug as program_slug, lp.category, lp.logo_initial, lp.accent_color, lp.point_value_inr
       FROM linked_accounts la
       JOIN loyalty_programs lp ON la.program_id = lp.id
       WHERE la.user_id = $1 AND la.is_active = true
       ORDER BY la.last_synced_at DESC NULLS LAST`,
      [userId]
    ).then((r) => r.rows);
  },
};
