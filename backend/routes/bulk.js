const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

router.post('/questions', requireAdmin, async (req, res) => {
  try {
    const { subjectId, questions } = req.body;
    if (!subjectId || !Array.isArray(questions)) return res.status(400).json({ error: 'Սխալ ֆորմատ' });
    let added = 0;
    for (const q of questions) {
      const id = 'q-' + Date.now() + Math.random().toString(36).slice(2, 6);
      const type = q.type === 'text' ? 'text' : 'multiple_choice';
      const opts = type === 'multiple_choice' ? JSON.stringify(q.options) : null;
      await db.query('INSERT INTO questions (id, "subjectId", type, text, options, correct, points) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
        [id, subjectId, type, q.text, opts, q.correct, q.points || 1]);
      added++;
    }
    res.json({ added });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;