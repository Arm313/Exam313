const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM subjects').all());
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  const id = 'sub-' + Date.now();
  db.prepare('INSERT INTO subjects (id, name, isActive, allowedGroups) VALUES (?, ?, 0, ?)').run(id, name.trim(), JSON.stringify([]));
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id));
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Չի գտնվել' });

  const {
    name, timerMinutes, passMarkPercent, shuffleQuestions, showAnswersAfter, 
    allowRetake, maxAttempts, startTime, endTime, questionsCount, isActive, allowedGroups
  } = req.body;

  db.prepare(`UPDATE subjects SET 
    name = ?, timerMinutes = ?, passMarkPercent = ?, shuffleQuestions = ?, 
    showAnswersAfter = ?, allowRetake = ?, maxAttempts = ?, startTime = ?, 
    endTime = ?, questionsCount = ?, isActive = ?, allowedGroups = ?
    WHERE id = ?`).run(
    name ?? existing.name, timerMinutes ?? existing.timerMinutes, passMarkPercent ?? existing.passMarkPercent,
    shuffleQuestions ?? existing.shuffleQuestions, showAnswersAfter ?? existing.showAnswersAfter,
    allowRetake ?? existing.allowRetake, maxAttempts ?? existing.maxAttempts,
    startTime !== undefined ? startTime : existing.startTime, 
    endTime !== undefined ? endTime : existing.endTime,
    questionsCount !== undefined ? questionsCount : existing.questionsCount,
    isActive !== undefined ? isActive : existing.isActive,
    allowedGroups !== undefined ? JSON.stringify(allowedGroups) : existing.allowedGroups,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM questions WHERE subjectId = ?').run(req.params.id);
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;