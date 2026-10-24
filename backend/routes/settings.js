const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

// ✅ GET /settings - հասանելի է բոլորին
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM global_settings').all();
    const obj = {};
    rows.forEach((r) => (obj[r.key] = r.value));
    res.json(obj);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /settings - միայն ադմինին
router.put('/', requireAdmin, (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    const exists = db.prepare('SELECT key FROM global_settings WHERE key = ?').get(key);
    if (exists) {
      db.prepare('UPDATE global_settings SET value = ? WHERE key = ?').run(String(value), key);
    } else {
      db.prepare('INSERT INTO global_settings (key, value) VALUES (?, ?)').run(key, String(value));
    }
  }
  const rows = db.prepare('SELECT * FROM global_settings').all();
  const obj = {};
  rows.forEach((r) => (obj[r.key] = r.value));
  res.json(obj);
});

module.exports = router;