// server/routes/coupons.js – Extracted coupon & promo-token wallet
import express from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function mapCoupon(row) {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    category: row.category,
    couponCode: row.coupon_code,
    couponType: row.coupon_type,
    title: row.title,
    description: row.description,
    discountValue: row.discount_value,
    minimumSpendINR: row.minimum_spend_inr ? Number(row.minimum_spend_inr) : 0,
    expiryDate: row.expiry_date,
    barcodeData: row.barcode_data,
    qrCodeUrl: row.qr_code_url,
    redemptionUrl: row.redemption_url,
    isUsed: row.is_used,
    usedAt: row.used_at,
    sourceEmailSubject: row.source_email_subject,
    sourceSender: row.source_sender,
    confidenceScore: row.confidence_score ? Number(row.confidence_score) : 0.95,
    createdAt: row.created_at,
  };
}

// List coupons
router.get('/', authenticate, async (req, res) => {
  try {
    const { used, category, active } = req.query;
    const params = [req.userId];
    const clauses = ['user_id = $1'];

    if (used === 'true' || used === 'false') {
      params.push(used === 'true');
      clauses.push(`is_used = $${params.length}`);
    }

    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }

    if (active === 'true') {
      clauses.push(`is_used = false AND (expiry_date IS NULL OR expiry_date > NOW())`);
    }

    const result = await query(
      `SELECT * FROM extracted_coupons
       WHERE ${clauses.join(' AND ')}
       ORDER BY
         CASE WHEN is_used THEN 1 ELSE 0 END,
         expiry_date ASC NULLS LAST,
         created_at DESC`,
      params
    );

    res.json(result.rows.map(mapCoupon));
  } catch (err) {
    console.error('List coupons error:', err);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Expiring soon (next 14 days)
router.get('/expiring', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM extracted_coupons
       WHERE user_id = $1
         AND is_used = false
         AND expiry_date IS NOT NULL
         AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
       ORDER BY expiry_date ASC`,
      [req.userId]
    );
    res.json(result.rows.map(mapCoupon));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expiring coupons' });
  }
});

// Summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const result = await query(
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
      [req.userId]
    );
    const row = result.rows[0] || {};
    res.json({
      active: Number(row.active || 0),
      used: Number(row.used || 0),
      expiringSoon: Number(row.expiring_soon || 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupon summary' });
  }
});

// Mark used / unused
router.put('/:id/use', authenticate, async (req, res) => {
  try {
    const isUsed = req.body.isUsed !== false;
    const result = await query(
      `UPDATE extracted_coupons
       SET is_used = $1,
           used_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isUsed, req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json(mapCoupon(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Delete
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM extracted_coupons WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
