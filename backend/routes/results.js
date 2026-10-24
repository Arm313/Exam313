const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

function rowToObj(r) {
  return {
    ...r, passed: !!r.passed, needsGrading: !!r.needsGrading, isArchived: !!r.isArchived,
    answers: r.answers ? JSON.parse(r.answers) : null,
    questionIds: r.questionIds ? JSON.parse(r.questionIds) : null,
  };
}

router.get('/attempts/:subjectId', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'student') return res.json({ count: 0 });
    const row = db.prepare(
      'SELECT COUNT(*) as c FROM results WHERE studentName = ? AND studentGroup = ? AND subjectId = ?'
    ).get(req.user.name, req.user.group, req.params.subjectId);
    res.json({ count: row.c || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { subjectId, violations, submissionReason, answers, questionIds } = req.body;
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId);
    if (!subject) return res.status(404).json({ error: 'Առարկան չկա' });

    const displayIds = questionIds || [];
    if (displayIds.length === 0) return res.status(400).json({ error: 'Հարցեր չեն գտնվել' });

    const placeholders = displayIds.map(() => '?').join(',');
    const questions = db.prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`)
      .all(...displayIds)
      .map(q => ({...q, options: q.options ? JSON.parse(q.options) : []}));

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

      return { 
        questionId: q.id, type: q.type, text: q.text, options: q.options, 
        correct: q.correct, selected: selected ?? null, isCorrect, points: q.points,
        earnedPoints: q.type === 'multiple_choice' ? (isCorrect ? q.points : 0) : null
      };
    });

    const percentage = total > 0 ? Math.round((gained / total) * 100) : 0;
    const passed = !needsGrading && percentage >= subject.passMarkPercent;
    const id = 'res-' + Date.now();

    // Պահպանում ենք նաև ուսանողի email-ը (եթե կա)
    const studentEmail = req.user.email || null;

    db.prepare(`INSERT INTO results (id, studentName, studentGroup, subjectId, subjectName, score, percentage, passed, violations, submissionReason, answers, questionIds, date, needsGrading, isArchived, studentEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
      .run(
        id, req.user.name, req.user.group, subjectId, subject.name, 
        `${gained}/${total}`, percentage, passed ? 1 : 0, +violations || 0, 
        submissionReason || '', JSON.stringify(questionResults), 
        JSON.stringify(questions.map(q => q.id)), new Date().toISOString(), needsGrading ? 1 : 0,
        studentEmail
      );

    const fullResult = rowToObj(db.prepare('SELECT * FROM results WHERE id = ?').get(id));
    fullResult.showAnswersAfter = !!subject.showAnswersAfter;
    fullResult.passMarkPercent = subject.passMarkPercent;

    res.json(fullResult);
  } catch (error) {
    console.error("POST /results error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/grade', requireAdmin, (req, res) => {
  try {
    const result = db.prepare('SELECT * FROM results WHERE id = ?').get(req.params.id);
    if (!result) return res.status(404).json({ error: 'Չկա' });
    
    const { questionId, earnedPoints } = req.body; 
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(result.subjectId);
    
    let answersArray = JSON.parse(result.answers);
    
    answersArray = answersArray.map(a => {
      if (a.questionId === questionId) {
        // ✅ ՍՏՈՒԳՈՒՄ ԵՆՔ, ՈՐ ՄԻԱՎՈՐԸ ՉԳԵՐԱԶԱՆՑԻ ԱՌԱՎԵԼԱԳՈՒՅՆԸ
        let safePoints = Number(earnedPoints);
        if (safePoints > a.points) safePoints = a.points;
        if (safePoints < 0) safePoints = 0;

        const isFullyCorrect = safePoints >= a.points;
        return { ...a, earnedPoints: safePoints, isCorrect: isFullyCorrect };
      }
      return a;
    });

    let gained = 0, total = 0;
    answersArray.forEach(a => {
      total += a.points;
      if (a.earnedPoints !== undefined && a.earnedPoints !== null) {
        gained += a.earnedPoints;
      } else if (a.isCorrect) {
        gained += a.points;
      }
    });

    const percentage = total > 0 ? Math.round((gained / total) * 100) : 0;
    const passed = percentage >= subject.passMarkPercent;
    const stillNeedsGrading = answersArray.some(a => a.type === 'text' && (a.earnedPoints === undefined || a.earnedPoints === null));

    db.prepare('UPDATE results SET score = ?, percentage = ?, passed = ?, answers = ?, needsGrading = ? WHERE id = ?')
      .run(`${gained}/${total}`, percentage, passed ? 1 : 0, JSON.stringify(answersArray), stillNeedsGrading ? 1 : 0, req.params.id);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/archive', requireAdmin, (req, res) => {
  const { isArchived } = req.body;
  db.prepare('UPDATE results SET isArchived = ? WHERE id = ?').run(isArchived ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.get('/', requireAuth, (req, res) => {
  if (req.user.role === 'student') {
    const rows = db.prepare('SELECT * FROM results WHERE studentName = ? AND studentGroup = ? AND isArchived = 0 ORDER BY date DESC').all(req.user.name, req.user.group);
    return res.json(rows.map(rowToObj));
  }
  res.json(db.prepare('SELECT * FROM results ORDER BY date DESC').all().map(rowToObj));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM results WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Չկա' });
  const fullResult = rowToObj(row);
  const subject = db.prepare('SELECT showAnswersAfter, passMarkPercent FROM subjects WHERE id = ?').get(row.subjectId);
  if (subject) {
    fullResult.showAnswersAfter = !!subject.showAnswersAfter;
    fullResult.passMarkPercent = subject.passMarkPercent;
  }
  res.json(fullResult);
});

// ✅ Ավելացվել է կոնկրետ արդյունքը ջնջելու հնարավորություն
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM results WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM results').run();
  res.json({ ok: true });
});

module.exports = router;