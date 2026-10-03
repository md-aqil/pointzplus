// server/repositories/users.repo.js – users table access.
import { query } from '../db.js';

export const UsersRepo = {
  findByEmail(email) {
    return query('SELECT * FROM users WHERE email = $1', [email]).then(
      (r) => r.rows[0] || null
    );
  },

  findById(id) {
    return query(
      'SELECT id, email, full_name, phone_number, avatar_url, created_at FROM users WHERE id = $1',
      [id]
    ).then((r) => r.rows[0] || null);
  },

  create({ email, passwordHash, fullName, phoneNumber }) {
    return query(
      `INSERT INTO users (email, password_hash, full_name, phone_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone_number, created_at`,
      [email, passwordHash, fullName || null, phoneNumber || null]
    ).then((r) => r.rows[0]);
  },

  updateProfile(id, { fullName, phoneNumber, avatarUrl }) {
    return query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, full_name, phone_number, avatar_url`,
      [fullName, phoneNumber, avatarUrl, id]
    ).then((r) => r.rows[0] || null);
  },

  remove(id) {
    return query('DELETE FROM users WHERE id = $1 RETURNING id', [id]).then(
      (r) => r.rows[0] || null
    );
  },

  getTokenVersion(id) {
    return query('SELECT token_version FROM users WHERE id = $1', [id]).then(
      (r) => (r.rows[0] ? r.rows[0].token_version : null)
    );
  },

  // Bumps token_version; all previously issued JWTs become invalid.
  // Returns the new version, or null if the user does not exist (caller -> 404).
  bumpTokenVersion(id) {
    return query(
      `UPDATE users SET token_version = token_version + 1
       WHERE id = $1
       RETURNING token_version`,
      [id]
    ).then((r) => (r.rows[0] ? r.rows[0].token_version : null));
  },
};
