// server/lib/pagination.js – Keyset (cursor) pagination helpers.

export function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    );
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/** Parse ?limit= & ?cursor= from a query object with sane bounds. */
export function parsePagination(query = {}, { def = 20, max = 100 } = {}) {
  const raw = Number.parseInt(String(query.limit ?? ''), 10);
  const limit = Number.isFinite(raw)
    ? Math.min(Math.max(raw, 1), max)
    : def;
  return { limit, cursor: decodeCursor(query.cursor) };
}

/**
 * Build a { items, nextCursor } envelope from rows fetched with limit + 1.
 * `mapRow` is applied to each row before returning.
 */
export function paginated(rows, limit, encodeKey, mapRow = (r) => r) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapRow);
  const last = hasMore ? rows[limit - 1] : null;
  return {
    items,
    nextCursor: last ? encodeCursor(encodeKey(last)) : null,
  };
}
