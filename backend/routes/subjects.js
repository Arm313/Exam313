const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM subjects');
    
    const formatted = result.rows.map(r => {
      let groups = [];
      try {
        const raw = r.allowedGroups !== undefined ? r.allowedGroups : r.allowedgroups;
        if (raw) groups = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) { groups = []; }

      return {
        ...r,
        timerMinutes: r.timerMinutes ?? r.timerminutes ?? 15,
        passMarkPercent: r.passMarkPercent ?? r.passmarkpercent ?? 60,
        allowRetake: r.allowRetake ?? r.allowretake ?? 1,
        startTime: r.startTime ?? r.starttime ?? null,
        endTime: r.endTime ?? r.endtime ?? null,
        questionsCount: r.questionsCount ?? r.questionscount ?? 0,
        isActive: 1, // Միշտ ակտիվ
        allowedGroups: Array.isArray(groups) ? groups : []
      };
    });
    
    res.json(formatted);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, timerMinutes = 15, passMarkPercent = 60 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Անունը պարտադիր է' });
  try {
    const id = 'sub-' + Date.now();
    await db.query(
      'INSERT INTO subjects (id, name, "timerMinutes", "passMarkPercent", "isActive", "allowedGroups") VALUES ($1, $2, $3, $4, 1, $5)', 
      [id, name.trim(), timerMinutes, passMarkPercent, '[]']
    );
    const result = await db.query('SELECT * FROM subjects WHERE id = $1', [id]);
    res.json({ ...result.rows[0], isActive: 1, allowedGroups: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const existingRes = await db.query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
    if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Չի գտնվել' });
    const existing = existingRes.rows[0];

    const { name, timerMinutes, passMarkPercent, allowRetake, startTime, endTime, questionsCount, allowedGroups } = req.body;
    
    let groupsStr = existing.allowedGroups || existing.allowedgroups;
    if (allowedGroups !== undefined) {
      groupsStr = Array.isArray(allowedGroups) ? JSON.stringify(allowedGroups) : JSON.stringify([]);
    }

    await db.query(`UPDATE subjects SET 
      name = $1, "timerMinutes" = $2, "passMarkPercent" = $3, 
      "allowRetake" = $4, "startTime" = $5, 
      "endTime" = $6, "questionsCount" = $7, "isActive" = 1, "allowedGroups" = $8
      WHERE id = $9`, [
      name ?? existing.name, 
      timerMinutes ?? existing.timerMinutes, 
      passMarkPercent ?? existing.passMarkPercent,
      allowRetake ?? existing.allowRetake, 
      startTime !== undefined ? startTime : existing.startTime, 
      endTime !== undefined ? endTime : existing.endTime,
      questionsCount !== undefined ? questionsCount : existing.questionsCount,
      groupsStr,
      req.params.id
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM questions WHERE "subjectId" = $1', [req.params.id]);
    await db.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;