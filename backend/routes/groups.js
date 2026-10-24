const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

router.get('/', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM groups ORDER BY name ASC').all());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  try {
    const id = 'grp-' + Date.now();
    db.prepare('INSERT INTO groups (id, name) VALUES (?, ?)').run(id, name.trim());
    res.json({ id, name: name.trim() });
  } catch (e) {
    res.status(400).json({ error: 'Այս խումբը արդեն գոյություն ունի' });
  }
});

// ✅ Թարմացված PUT հարցումը
router.put('/:id', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });

  try {
    // 1. Գտնում ենք հին խումբը
    const oldGroup = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
    if (!oldGroup) return res.status(404).json({ error: 'Խումբը չի գտնվել' });

    // 2. Ստուգում ենք՝ արդյոք նոր անունը չի կրկնվում ուրիշ խմբի հետ
    const existing = db.prepare('SELECT * FROM groups WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
    if (existing) {
      return res.status(400).json({ error: 'Այս անունով խումբ արդեն գոյություն ունի' });
    }

    // 3. Փոխում ենք խմբի անունը
    db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name.trim(), req.params.id);

    // 4. ✅ Թարմացնում ենք բոլոր արդյունքները (results) հին անունից նոր անվան
    if (oldGroup.name !== name.trim()) {
      db.prepare('UPDATE results SET studentGroup = ? WHERE studentGroup = ?').run(name.trim(), oldGroup.name);
    }

    res.json({ id: req.params.id, name: name.trim() });
  } catch (e) {
    console.error("Group update error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;