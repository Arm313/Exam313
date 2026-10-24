const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireSuper } = require('../auth');

router.get('/', requireSuper, (req, res) => {
  const rows = db
    .prepare('SELECT id, username, role, createdAt, createdBy FROM admins ORDER BY createdAt DESC')
    .all();
  res.json(rows);
});

router.post('/', requireSuper, (req, res) => {
  const { username, password, role = 'admin' } = req.body;
  if (!username?.trim() || !password || password.length < 4) {
    return res.status(400).json({ error: 'Մուտքանուն և գաղտնաբառ (min 4 նիշ) պարտադիր են' });
  }
  if (role !== 'admin' && role !== 'super') {
    return res.status(400).json({ error: 'Անվավեր role' });
  }
  const exists = db.prepare('SELECT id FROM admins WHERE username = ?').get(username.trim());
  if (exists) return res.status(409).json({ error: 'Այս մուտքանունը զբաղված է' });

  const id = 'admin-' + Date.now();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO admins (id, username, passwordHash, role, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username.trim(), hash, role, new Date().toISOString(), req.user.username);

  res.json({ id, username: username.trim(), role, createdAt: new Date().toISOString() });
});

router.put('/:id/password', requireSuper, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Գաղտնաբառը min 4 նիշ' });
  }
  const target = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Ադմին չի գտնվել' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE admins SET passwordHash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireSuper, (req, res) => {
  const target = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Ադմին չի գտնվել' });
  if (target.id === req.user.adminId) {
    return res.status(400).json({ error: 'Չեք կարող ջնջել ինքներդ ձեզ' });
  }
  if (target.role === 'super') {
    const superCount = db.prepare("SELECT COUNT(*) as c FROM admins WHERE role = 'super'").get().c;
    if (superCount <= 1) {
      return res.status(400).json({ error: 'Չի կարելի ջնջել վերջին գլխավոր ադմինին' });
    }
  }
  db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;