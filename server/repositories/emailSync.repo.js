// server/repositories/emailSync.repo.js – email_sync_accounts, sync_jobs,
// statement/coupon persistence for the Gmail pipeline.
import { query } from '../db.js';

export const EmailSyncRepo = {
  // ── email_sync_accounts ────────────────────────────────────────
  findConnected(userId, provider) {
    return query(
      `SELECT * FROM email_sync_accounts
       WHERE user_id = $1 AND provider = $2 AND status = 'connected'`,
      [userId, provider]
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

  listForUser(userId) {
    return query(
      `SELECT id, provider, email_address, status, programs_found, last_synced_at, created_at, watch_expiration
       FROM email_sync_accounts WHERE user_id = $1`,
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
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         oauth_token = $3, oauth_refresh_token = $4, token_expires_at = $5,
         encryption_iv = $6, encryption_tag = $7, history_id = $8,
         refresh_encryption_iv = $9, refresh_encryption_tag = $10,
         email_address = $2, status = 'connected', updated_at = NOW()`,
      [
        userId, email, accessEnc.ciphertext, refreshEnc.ciphertext,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accessEnc.iv, accessEnc.tag, historyId || null, refreshEnc.iv, refreshEnc.tag,
      ]
    );
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

  disconnect(userId, provider) {
    return query(
      `DELETE FROM email_sync_accounts WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );
  },

  // ── sync_jobs ──────────────────────────────────────────────────
  createJob(userId, provider) {
    return query(
      `INSERT INTO sync_jobs (user_id, provider, status)
       VALUES ($1, $2, 'queued') RETURNING *`,
      [userId, provider]
    ).then((r) => r.rows[0]);
  },

  getJob(id, userId) {
    return query(`SELECT * FROM sync_jobs WHERE id = $1 AND user_id = $2`, [id, userId]).then(
      (r) => r.rows[0] || null
    );
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
           coupons_extracted = $3, programs_updated = $4,
           worker_id = NULL, locked_at = NULL, completed_at = NOW()
       WHERE id = $5`,
      [stats.scanned, stats.processed, stats.couponsInserted, stats.programsUpdated, jobId]
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
         extracted_expiry_date, parser_confidence, parsed_successfully, raw_text_preview
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
      fields
    );
  },

  insertCoupon(fields) {
    return query(
      `INSERT INTO extracted_coupons (
         user_id, program_id, merchant_name, category, coupon_code, coupon_type,
         title, description, discount_value, minimum_spend_inr, expiry_date,
         email_message_id_hash, source_email_subject, source_sender, confidence_score
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (user_id, coupon_code, email_message_id_hash) DO NOTHING
       RETURNING id`,
      fields
    );
  },

  // ── scan result reads ──────────────────────────────────────────
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

  recentCoupons(userId, limit = 50) {
    return query(
      `SELECT * FROM extracted_coupons
       WHERE user_id = $1 AND is_used = false
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    ).then((r) => r.rows);
  },
};
