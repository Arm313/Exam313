const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

// ✅ ՀԱՆՐԱՅԻՆ — ուսանողի համար (ԱՌԱՆՑ TOKEN-Ի)
router.get('/public', async (req, res) => {
  try {
    const { subjectId } = req.query;
    let query = 'SELECT * FROM questions';
    let params = [];
    let conditions = [];

    if (subjectId) {
      conditions.push(`"subjectId" = $${params.length + 1}`);
      params.push(subjectId);
    }

    // Ակտիվ հարցերը միայն (առանց արխիվացվածների)
    conditions.push(`"isArchived" = 0`);

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await db.query(query, params);
    const qs = rows.rows.map(r => ({ ...r, options: r.options ? JSON.parse(r.options) : [] }));
    
    // ✅ Թաքցնում ենք ճիշտ պատասխանները ուսանողից
    res.json(qs.map(({ correct, ...rest }) => rest));
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// ✅ ԱԴՄԻՆԻ — պահանջում է token
router.get('/', requireAuth, async (req, res) => {
  try {
    const { subjectId } = req.query;
    let query = 'SELECT * FROM questions';
    let params = [];
    let conditions = [];

    if (subjectId) {
      conditions.push(`"subjectId" = $${params.length + 1}`);
      params.push(subjectId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await db.query(query, params);
    res.json(rows.rows.map(r => ({ ...r, options: r.options ? JSON.parse(r.options) : [] })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { subjectId, type = 'multiple_choice', text, options, correct, points = 1 } = req.body;
    if (!subjectId || !text?.trim()) return res.status(400).json({ error: 'Անվավեր տվյալներ' });
    const id = 'q-' + Date.now() + Math.floor(Math.random()*100);
    const optionsJson = type === 'text' ? null : JSON.stringify(options);
    const correctVal = type === 'text' ? null : correct;
    
    await db.query('INSERT INTO questions (id, "subjectId", type, text, options, correct, points) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
      [id, subjectId, type, text.trim(), optionsJson, correctVal, +points]);
    
    const result = await db.query('SELECT * FROM questions WHERE id = $1', [id]);
    res.json({ ...result.rows[0], options: optionsJson ? JSON.parse(optionsJson) : [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/archive', requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE questions SET "isArchived" = 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/restore', requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE questions SET "isArchived" = 0 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const existingRes = await db.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
    if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Չի գտնվել' });
    const existing = existingRes.rows[0];

    const { type, text, options, correct, points } = req.body;
    const newType = type ?? existing.type;
    const optionsJson = newType === 'text' ? null : (options !== undefined ? JSON.stringify(options) : existing.options);
    const correctVal = newType === 'text' ? null : (correct !== undefined ? correct : existing.correct);

    await db.query('UPDATE questions SET type = $1, text = $2, options = $3, correct = $4, points = $5 WHERE id = $6', 
      [newType, text?.trim() ?? existing.text, optionsJson, correctVal, points ?? existing.points, req.params.id]);
    
    const result = await db.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
    res.json({ ...result.rows[0], options: result.rows[0].options ? JSON.parse(result.rows[0].options) : [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;