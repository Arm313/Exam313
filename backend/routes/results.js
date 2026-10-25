const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

router.get('/attempts/:subjectId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.json({ count: 0 });
    const result = await db.query('SELECT COUNT(*) as c FROM results WHERE "studentName" = $1 AND "studentGroup" = $2 AND "subjectId" = $3', 
      [req.user.name, req.user.group, req.params.subjectId]);
    res.json({ count: parseInt(result.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ✅ ՆՈՐ. ԵԶԱԿԻ ՈՒՍԱՆՈՂՆԵՐԻ ՔԱՆԱԿԸ
router.get('/students-count', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(DISTINCT "studentName") as c FROM results');
    res.json({ count: parseInt(result.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { subjectId, violations, submissionReason, answers, questionIds } = req.body;
    const subjRes = await db.query('SELECT * FROM subjects WHERE id = $1', [subjectId]);
    const subject = subjRes.rows[0];
    if (!subject) return res.status(404).json({ error: 'Առարկան չկա' });

    const displayIds = questionIds || [];
    if (displayIds.length === 0) return res.status(400).json({ error: 'Հարցեր չեն գտնվել' });

    const placeholders = displayIds.map((_, i) => `$${i + 1}`).join(',');
    const qRes = await db.query(`SELECT * FROM questions WHERE id IN (${placeholders})`, displayIds);
    const questions = qRes.rows.map(q => ({...q, options: q.options ? JSON.parse(q.options) : []}));

    let gained = 0, total = 0, needsGrading = false;
    const questionResults = questions.map(q => {
      total += q.points;
      const selected = answers ? answers[q.id] : undefined;
      let isCorrect = null;
      if (q.type === 'multiple_choice') {
        isCorrect = selected === q.correct;
        if (isCorrect) gained += q.points;
      } else {
        needsGrading = true;
      }
      return { questionId: q.id, type: q.type, text: q.text, options: q.options, correct: q.correct, selected: selected ?? null, isCorrect, points: q.points, earnedPoints: q.type === 'multiple_choice' ? (isCorrect ? q.points : 0) : null };
    });

    const percentage = total > 0 ? Math.round((gained / total) * 100) : 0;
    const passMark = subject.passMarkPercent || subject.passmarkpercent || 60;
    const passed = !needsGrading && percentage >= passMark;
    
    const id = 'res-' + Date.now();
    const studentEmail = req.user.email || null;

    await db.query(`INSERT INTO results (id, "studentName", "studentGroup", "subjectId", "subjectName", score, percentage, passed, violations, "submissionReason", answers, "questionIds", date, "needsGrading", "isArchived", "studentEmail") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15)`,
      [id, req.user.name, req.user.group, subjectId, subject.name, `${gained}/${total}`, percentage, passed ? 1 : 0, +violations || 0, submissionReason || '', JSON.stringify(questionResults), JSON.stringify(questions.map(q => q.id)), new Date().toISOString(), needsGrading ? 1 : 0, studentEmail]);

    res.json({ id, success: true });
  } catch (e) { 
    console.error("❌ ERROR POST /results:", e); 
    res.status(500).json({ error: e.message }); 
  }
});

router.put('/:id/grade', requireAdmin, async (req, res) => {
  try {
    const resultRes = await db.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
    if (resultRes.rows.length === 0) return res.status(404).json({ error: 'Չկա' });
    const result = resultRes.rows[0];
    const { questionId, earnedPoints } = req.body; 
    const subjRes = await db.query('SELECT * FROM subjects WHERE id = $1', [result.subjectId]);
    const subject = subjRes.rows[0];
    
    let answersArray = JSON.parse(result.answers);
    answersArray = answersArray.map(a => {
      if (a.questionId === questionId) {
        let safePoints = Math.min(Number(earnedPoints), a.points);
        if (safePoints < 0) safePoints = 0;
        return { ...a, earnedPoints: safePoints, isCorrect: safePoints >= a.points };
      }
      return a;
    });

    let gained = 0, total = 0;
    answersArray.forEach(a => {
      total += a.points;
      if (a.earnedPoints !== undefined && a.earnedPoints !== null) gained += a.earnedPoints;
      else if (a.isCorrect) gained += a.points;
    });

    const percentage = total > 0 ? Math.round((gained / total) * 100) : 0;
    const passMark = subject.passMarkPercent || subject.passmarkpercent || 60;
    const passed = percentage >= passMark;
    const stillNeedsGrading = answersArray.some(a => a.type === 'text' && (a.earnedPoints === undefined || a.earnedPoints === null));

    await db.query('UPDATE results SET score = $1, percentage = $2, passed = $3, answers = $4, "needsGrading" = $5 WHERE id = $6', 
      [`${gained}/${total}`, percentage, passed ? 1 : 0, JSON.stringify(answersArray), stillNeedsGrading ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/archive', requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE results SET "isArchived" = $1 WHERE id = $2', [req.body.isArchived ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    let query = 'SELECT * FROM results';
    let params = [];
    if (req.user.role === 'student') {
      query += ' WHERE "studentName" = $1 AND "studentGroup" = $2 AND "isArchived" = 0 ORDER BY date DESC';
      params = [req.user.name, req.user.group];
    } else {
      query += ' ORDER BY date DESC';
    }
    const rows = await db.query(query, params);
    
    res.json(rows.rows.map(r => ({
      ...r, 
      studentEmail: r.studentEmail ?? r.studentemail,
      passed: r.passed === 1 || r.passed === true, 
      needsGrading: r.needsGrading === 1 || r.needsgrading === 1, 
      isArchived: r.isArchived === 1 || r.isarchived === 1,
      answers: r.answers ? JSON.parse(r.answers) : null, 
      questionIds: r.questionids ? JSON.parse(r.questionids) : (r.questionIds ? JSON.parse(r.questionIds) : null)
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const rowRes = await db.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
    if (rowRes.rows.length === 0) return res.status(404).json({ error: 'Չկա' });
    const row = rowRes.rows[0];
    res.json({
      ...row, 
      studentEmail: row.studentEmail ?? row.studentemail,
      passed: row.passed === 1 || row.passed === true, 
      needsGrading: row.needsGrading === 1 || row.needsgrading === 1, 
      isArchived: row.isArchived === 1 || row.isarchived === 1,
      answers: row.answers ? JSON.parse(row.answers) : null
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM results WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM results');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;