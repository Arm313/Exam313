const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

router.post('/questions', requireAdmin, (req, res) => {
  const { subjectId, questions } = req.body;
  if (!subjectId || !Array.isArray(questions)) return res.status(400).json({ error: 'Սխալ ֆորմատ' });

  const insert = db.prepare('INSERT INTO questions (id, subjectId, type, text, options, correct, points) VALUES (?, ?, ?, ?, ?, ?, ?)');
  let added = 0;

  const insertMany = db.transaction((qs) => {
    for (const q of qs) {
      const id = 'q-' + Date.now() + Math.random().toString(36).slice(2, 6);
      const type = q.type === 'text' ? 'text' : 'multiple_choice';
      const opts = type === 'multiple_choice' ? JSON.stringify(q.options) : null;
      insert.run(id, subjectId, type, q.text, opts, q.correct, q.points || 1);
      added++;
    }
  });

  try {
    insertMany(questions);
    res.json({ added });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;