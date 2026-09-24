// server/services/coupons.service.js – coupon wallet business logic.
import { ApiError } from '../lib/errors.js';
import { CouponsRepo, mapCoupon } from '../repositories/coupons.repo.js';
import { paginated } from '../lib/pagination.js';

export const couponsService = {
  async list(userId, { used, category, active, limit, cursor }) {
    const rows = await CouponsRepo.list(userId, {
      used,
      category,
      active,
      limit,
      cursor,
    });
    return paginated(
      rows,
      limit,
      (row) => ({
        used: row.is_used ? 1 : 0,
        expiry: row.expiry_date
          ? new Date(row.expiry_date).toISOString()
          : '9999-12-31T00:00:00.000Z',
        createdAt: new Date(row.created_at).toISOString(),
      }),
      mapCoupon
    );
  },

  async expiring(userId) {
    const rows = await CouponsRepo.expiring(userId);
    return rows.map(mapCoupon);
  },

  summary(userId) {
    return CouponsRepo.summary(userId);
  },

  async setUsed(userId, id, isUsed) {
    const coupon = await CouponsRepo.setUsed(userId, id, isUsed);
    if (!coupon) throw ApiError.notFound('Coupon not found');
    return mapCoupon(coupon);
  },

  async remove(userId, id) {
    const removed = await CouponsRepo.remove(userId, id);
    if (!removed) throw ApiError.notFound('Coupon not found');
    return { message: 'Coupon deleted' };
  },
};
