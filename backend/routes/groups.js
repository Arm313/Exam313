const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM groups ORDER BY name ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  try {
    const id = 'grp-' + Date.now();
    await db.query('INSERT INTO groups (id, name) VALUES ($1, $2)', [id, name.trim()]);
    res.json({ id, name: name.trim() });
  } catch (e) { res.status(400).json({ error: 'Այս խումբը արդեն գոյություն ունի' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  try {
    const oldGroupRes = await db.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (oldGroupRes.rows.length === 0) return res.status(404).json({ error: 'Խումբը չի գտնվել' });

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
    await db.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;