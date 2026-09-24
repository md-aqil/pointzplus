// server/lib/rateLimit.js – In-memory fixed-window rate limiter.
// Single-instance modular monolith: no Redis needed (per brief).

export function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 30,
  keyPrefix = 'rl',
  message = 'Too many requests. Please try again later.',
} = {}) {
  const buckets = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  if (sweep.unref) sweep.unref();

  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, max - bucket.count))
    );

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res
        .status(429)
        .json({ error: message, code: 'RATE_LIMITED' });
    }
    next();
  };
}
