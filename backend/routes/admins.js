const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireSuper } = require('../auth');

router.get('/', requireSuper, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, role, "createdAt", "createdBy" FROM admins ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireSuper, async (req, res) => {
  try {
    const { username, password, role = 'admin' } = req.body;
    if (!username?.trim() || !password || password.length < 4) {
      return res.status(400).json({ error: 'Մուտքանուն և գաղտնաբառ (min 4 նիշ) պարտադիր են' });
    }
    const exists = await db.query('SELECT id FROM admins WHERE username = $1', [username.trim()]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Այս մուտքանունը զբաղված է' });

    const id = 'admin-' + Date.now();
    const hash = bcrypt.hashSync(password, 10);
    await db.query(
      'INSERT INTO admins (id, username, "passwordHash", role, "createdAt", "createdBy") VALUES ($1, $2, $3, $4, $5, $6)',
      [id, username.trim(), hash, role, new Date().toISOString(), req.user.username]
    );
    res.json({ id, username: username.trim(), role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/password', requireSuper, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: 'Գաղտնաբառը min 4 նիշ' });
    const hash = bcrypt.hashSync(password, 10);
    await db.query('UPDATE admins SET "passwordHash" = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireSuper, async (req, res) => {
  try {
    const targetRes = await db.query('SELECT * FROM admins WHERE id = $1', [req.params.id]);
    if (targetRes.rows.length === 0) return res.status(404).json({ error: 'Ադմին չի գտնվել' });
    const target = targetRes.rows[0];
    if (target.id === req.user.adminId) return res.status(400).json({ error: 'Չեք կարող ջնջել ինքներդ ձեզ' });
    await db.query('DELETE FROM admins WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;