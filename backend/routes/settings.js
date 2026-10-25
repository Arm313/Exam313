const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM global_settings');
    const obj = {};
    rows.rows.forEach((r) => (obj[r.key] = r.value));
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const exists = await db.query('SELECT key FROM global_settings WHERE key = $1', [key]);
      if (exists.rows.length > 0) {
        await db.query('UPDATE global_settings SET value = $1 WHERE key = $2', [String(value), key]);
      } else {
        await db.query('INSERT INTO global_settings (key, value) VALUES ($1, $2)', [key, String(value)]);
      }
    }
    const rows = await db.query('SELECT * FROM global_settings');
    const obj = {};
    rows.rows.forEach((r) => (obj[r.key] = r.value));
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;