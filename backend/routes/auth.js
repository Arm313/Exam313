const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, verifyToken } = require('../auth');

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Մուտքանուն և գաղտնաբառ պարտադիր են' });
    
    const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
    const admin = result.rows[0];
    
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      return res.status(401).json({ error: 'Սխալ մուտքանուն կամ գաղտնաբառ' });
    }
    const token = signToken({ role: admin.role, username: admin.username, adminId: admin.id, name: admin.username });
    res.json({ token, role: admin.role, username: admin.username, name: admin.username });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/student/login', async (req, res) => {
  try {
    const { name, group, email } = req.body;
    if (!name?.trim() || !group?.trim()) return res.status(400).json({ error: 'Անուն և խումբը պարտադիր են' });
    const token = signToken({ role: 'student', name: name.trim(), group: group.trim(), email: email?.trim() || null });
    res.json({ token, role: 'student', name: name.trim(), group: group.trim(), email: email?.trim() || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(user);
});

module.exports = router;