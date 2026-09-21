// server/routes/programs.js – Loyalty Programs Catalog
import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Get all programs
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let sql = 'SELECT * FROM loyalty_programs';
    const params = [];
    
    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }
    
    sql += ' ORDER BY category, name';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

// Get program by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM loyalty_programs WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch program' });
  }
});

// Get programs by category
router.get('/category/:category', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM loyalty_programs WHERE category = $1 ORDER BY name',
      [req.params.category]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

// Search programs
router.get('/search/:term', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM loyalty_programs 
       WHERE name ILIKE $1 OR category ILIKE $1
       ORDER BY name LIMIT 20`,
      [`%${req.params.term}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get all categories
router.get('/meta/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT category, COUNT(*) as program_count 
      FROM loyalty_programs 
      GROUP BY category 
      ORDER BY category
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;