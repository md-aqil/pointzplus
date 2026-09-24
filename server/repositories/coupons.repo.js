// server/repositories/coupons.repo.js – extracted_coupons data access.
import { query } from '../db.js';

export function mapCoupon(row) {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    category: row.category,
    couponCode: row.coupon_code,
    couponType: row.coupon_type,
    title: row.title,
    description: row.description,
    discountValue: row.discount_value,
    minimumSpendINR: row.minimum_spend_inr
      ? Number(row.minimum_spend_inr)
      : 0,
    expiryDate: row.expiry_date,
    barcodeData: row.barcode_data,
    qrCodeUrl: row.qr_code_url,
    redemptionUrl: row.redemption_url,
    isUsed: row.is_used,
    usedAt: row.used_at,
    sourceEmailSubject: row.source_email_subject,
    sourceSender: row.source_sender,
    confidenceScore: row.confidence_score
      ? Number(row.confidence_score)
      : 0.95,
    createdAt: row.created_at,
  };
}

export const CouponsRepo = {
  /** Filtered + keyset-paginated listing (is_used, expiry_date, created_at ordering). */
  list(userId, { used, category, active, limit, cursor }) {
    const params = [userId];
    const clauses = ['user_id = $1'];

    if (used === true || used === false) {
      params.push(used);
      clauses.push(`is_used = $${params.length}`);
    }
    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (active === true) {
      clauses.push(
        `is_used = false AND (expiry_date IS NULL OR expiry_date > NOW())`
      );
    }

    // Keyset cursor over the (is_used, expiry_date, created_at) sort key.
    if (
      cursor &&
      typeof cursor.used === 'boolean' &&
      cursor.expiry !== undefined &&
      cursor.createdAt
    ) {
      params.push(cursor.used, cursor.expiry, cursor.createdAt);
      const u = params.length - 2;
      const e = params.length - 1;
      const c = params.length;
      clauses.push(
        `(CASE WHEN is_used THEN 1 ELSE 0 END, COALESCE(expiry_date, 'infinity'), created_at) ` +
          `> ($${u}::int, $${e}::timestamptz, $${c}::timestamptz)`
      );
    }

    params.push(limit + 1);
    return query(
      `SELECT * FROM extracted_coupons
       WHERE ${clauses.join(' AND ')}
       ORDER BY
         CASE WHEN is_used THEN 1 ELSE 0 END,
         expiry_date ASC NULLS LAST,
         created_at DESC
       LIMIT $${params.length}`,
      params
    ).then((r) => r.rows);
  },

  expiring(userId, days = 14) {
    return query(
      `SELECT * FROM extracted_coupons
       WHERE user_id = $1
         AND is_used = false
         AND expiry_date IS NOT NULL
         AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '1 day' * $2
       ORDER BY expiry_date ASC`,
      [userId, days]
    ).then((r) => r.rows);
  },

  summary(userId) {
    return query(
      `SELECT
         COUNT(*) FILTER (WHERE is_used = false AND (expiry_date IS NULL OR expiry_date > NOW())) AS active,
         COUNT(*) FILTER (WHERE is_used = true) AS used,
         COUNT(*) FILTER (
           WHERE is_used = false
             AND expiry_date IS NOT NULL
             AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
         ) AS expiring_soon
       FROM extracted_coupons
       WHERE user_id = $1`,
      [userId]
    ).then((r) => {
      const row = r.rows[0] || {};
      return {
        active: Number(row.active || 0),
        used: Number(row.used || 0),
        expiringSoon: Number(row.expiring_soon || 0),
      };
    });
  },

  setUsed(userId, id, isUsed) {
    return query(
      `UPDATE extracted_coupons
       SET is_used = $1,
           used_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isUsed, id, userId]
    ).then((r) => r.rows[0] || null);
  },

  remove(userId, id) {
    return query(
      `DELETE FROM extracted_coupons WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    ).then((r) => r.rows[0] || null);
  },
};
