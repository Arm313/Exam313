const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

// ✅ 1. Ընդհանուր հղում ստեղծել (առանց ուսանողի տվյալների)
router.post('/generate-general', requireAdmin, async (req, res) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'Առարկան պարտադիր է' });

    // ✅ Ստուգում ենք, որ առարկան պատկանում է այս դասախոսին (կամ նա super է)
    const subjRes = await db.query('SELECT * FROM subjects WHERE id = $1', [subjectId]);
    if (subjRes.rows.length === 0) return res.status(404).json({ error: 'Առարկան չի գտնվել' });
    
    const subject = subjRes.rows[0];
    const ownerId = subject.teacherid || subject.teacherId;
    if (req.user.role !== 'super' && ownerId !== req.user.adminId) {
      return res.status(403).json({ error: 'Այս առարկան ձերը չէ' });
    }

    const id = 'lnk-gen-' + Date.now() + Math.random().toString(36).slice(2, 6);
    await db.query(
      'INSERT INTO exam_links (id, "subjectId", "studentName", "studentGroup", "teacherId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
      [id, subjectId, null, null, req.user.adminId, new Date().toISOString()]
    );

    res.json({ linkId: id });
  } catch (e) { 
    console.error("❌ General Link Error:", e);
    res.status(500).json({ error: e.message }); 
  }
});

// ✅ 2. Անհատական հղում
router.post('/generate-individual', requireAdmin, async (req, res) => {
  try {
    const { subjectId, studentName, studentGroup } = req.body;
    if (!subjectId || !studentName || !studentGroup) {
      return res.status(400).json({ error: 'Բոլոր դաշտերը պարտադիր են' });
    }

    // ✅ Ստուգում ենք, որ առարկան պատկանում է այս դասախոսին
    const subjRes = await db.query('SELECT * FROM subjects WHERE id = $1', [subjectId]);
    if (subjRes.rows.length === 0) return res.status(404).json({ error: 'Առարկան չի գտնվել' });
    
    const subject = subjRes.rows[0];
    const ownerId = subject.teacherid || subject.teacherId;
    if (req.user.role !== 'super' && ownerId !== req.user.adminId) {
      return res.status(403).json({ error: 'Այս առարկան ձերը չէ' });
    }

    const id = 'lnk-ind-' + Date.now() + Math.random().toString(36).slice(2, 6);
    await db.query(
      'INSERT INTO exam_links (id, "subjectId", "studentName", "studentGroup", "teacherId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
      [id, subjectId, studentName, studentGroup, req.user.adminId, new Date().toISOString()]
    );

    res.json({ linkId: id });
  } catch (e) { 
    console.error("❌ Individual Link Error:", e);
    res.status(500).json({ error: e.message }); 
  }
});

// ✅ 3. Հղման ինֆո
router.get('/:linkId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM exam_links WHERE id = $1', [req.params.linkId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Հղումը վավեր չէ' });

    const link = result.rows[0];
    const subjRes = await db.query('SELECT * FROM subjects WHERE id = $1', [link.subjectId]);
    if (subjRes.rows.length === 0) return res.status(404).json({ error: 'Առարկան չի գտնվել' });

    res.json({
      valid: true,
      linkData: {
        subjectId: link.subjectId,
        subjectName: subjRes.rows[0].name,
        studentName: link.studentName || '',
        studentGroup: link.studentGroup || '',
        isGeneral: !link.studentName
      }
    });
  } catch (e) { 
    console.error("❌ Link Get Error:", e);
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;