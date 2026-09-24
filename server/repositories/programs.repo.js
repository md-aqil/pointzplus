// server/repositories/programs.repo.js – loyalty_programs catalog access.
import { query } from '../db.js';

export const ProgramsRepo = {
  list(category) {
    if (category) {
      return query(
        'SELECT * FROM loyalty_programs WHERE category = $1 ORDER BY category, name',
        [category]
      ).then((r) => r.rows);
    }
    return query('SELECT * FROM loyalty_programs ORDER BY category, name').then(
      (r) => r.rows
    );
  },

  findById(id) {
    return query('SELECT * FROM loyalty_programs WHERE id = $1', [id]).then(
      (r) => r.rows[0] || null
    );
  },

  findByCategory(category) {
    return query(
      'SELECT * FROM loyalty_programs WHERE category = $1 ORDER BY name',
      [category]
    ).then((r) => r.rows);
  },

  search(term) {
    return query(
      `SELECT * FROM loyalty_programs
       WHERE name ILIKE $1 OR category ILIKE $1
       ORDER BY name LIMIT 20`,
      [`%${term}%`]
    ).then((r) => r.rows);
  },

  categoryCounts() {
    return query(`
      SELECT category, COUNT(*) as program_count
      FROM loyalty_programs
      GROUP BY category
      ORDER BY category
    `).then((r) => r.rows);
  },
};
