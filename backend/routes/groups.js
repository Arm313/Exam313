const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireAuth } = require('../auth');

// ✅ Հանրային — ուսանողի լոգինի էջի համար (առանց token)
router.get('/public', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM groups ORDER BY name ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ✅ Ադմինի — տեսնում է միայն իրենը (super-ը՝ բոլորը)
router.get('/', requireAdmin, async (req, res) => {
  try {
    let query = 'SELECT * FROM groups';
    let params = [];
    if (req.user.role !== 'super') {
      query += ' WHERE "teacherId" = $1';
      params = [req.user.adminId];
    }
    const result = await db.query(query + ' ORDER BY name ASC', params);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  try {
    const id = 'grp-' + Date.now();
    await db.query('INSERT INTO groups (id, name, "teacherId") VALUES ($1, $2, $3)', [id, name.trim(), req.user.adminId]);
    res.json({ id, name: name.trim(), teacherId: req.user.adminId });
  } catch (e) { res.status(400).json({ error: 'Այս խումբը արդեն գոյություն ունի' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  try {
    const oldGroupRes = await db.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (oldGroupRes.rows.length === 0) return res.status(404).json({ error: 'Խումբը չի գտնվել' });
    if (req.user.role !== 'super' && oldGroupRes.rows[0].teacherId !== req.user.adminId) {
      return res.status(403).json({ error: 'Դուք չեք կարող խմբագրել ուրիշի խումբը' });
    }
    const existing = await db.query('SELECT * FROM groups WHERE name = $1 AND id != $2', [name.trim(), req.params.id]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Այս անունով խումբ արդեն կա' });
    await db.query('UPDATE groups SET name = $1 WHERE id = $2', [name.trim(), req.params.id]);
    if (oldGroupRes.rows[0].name !== name.trim()) {
      await db.query('UPDATE results SET "studentGroup" = $1 WHERE "studentGroup" = $2', [name.trim(), oldGroupRes.rows[0].name]);
    }
    res.json({ id: req.params.id, name: name.trim() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const grp = await db.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (grp.rows.length === 0) return res.status(404).json({ error: 'Չի գտնվել' });
    if (req.user.role !== 'super' && grp.rows[0].teacherId !== req.user.adminId) {
      return res.status(403).json({ error: 'Դուք չեք կարող ջնջել ուրիշի խումբը' });
    }
    await db.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;