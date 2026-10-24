const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireAdmin } = require("../auth");

function parseQ(row) {
  if (!row) return null;
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : [],
    type: row.type || "multiple_choice",
  };
}

router.get("/", requireAuth, (req, res) => {
  try {
    const { subjectId } = req.query;
    const rows = subjectId
      ? db.prepare("SELECT * FROM questions WHERE subjectId = ?").all(subjectId)
      : db.prepare("SELECT * FROM questions").all();

    if (req.user.role === "student" && subjectId) {
      const subject = db
        .prepare("SELECT * FROM subjects WHERE id = ?")
        .get(subjectId);
      // ✅ Ստուգում ենք ակտիվությունը
      if (!subject || subject.isActive === 0) {
        return res.status(403).json({ error: "Այս քննությունը ակտիվ չէ:" });
      }
    }

    if (req.user.role === "student") {
      const subject = subjectId
        ? db.prepare("SELECT * FROM subjects WHERE id = ?").get(subjectId)
        : null;
      let qs = rows.map(parseQ);

      if (subject && subject.questionsCount > 0) {
        qs = qs.sort(() => Math.random() - 0.5);
        qs = qs.slice(0, subject.questionsCount);
      } else if (subject?.shuffleQuestions) {
        qs = qs.sort(() => Math.random() - 0.5);
      }

      return res.json(qs.map(({ correct, ...rest }) => rest));
    }
    res.json(rows.map(parseQ));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAdmin, (req, res) => {
  try {
    const {
      subjectId,
      type = "multiple_choice",
      text,
      options,
      correct,
      points = 1,
    } = req.body;
    if (!subjectId || !text?.trim())
      return res.status(400).json({ error: "Անվավեր տվյալներ" });

    const id = "q-" + Date.now() + Math.floor(Math.random() * 100);
    const optionsJson = type === "text" ? null : JSON.stringify(options);
    const correctVal = type === "text" ? null : correct;

    db.prepare(
      "INSERT INTO questions (id, subjectId, type, text, options, correct, points) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, subjectId, type, text.trim(), optionsJson, correctVal, +points);

    res.json(
      parseQ(db.prepare("SELECT * FROM questions WHERE id = ?").get(id)),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", requireAdmin, (req, res) => {
  try {
    const existing = db
      .prepare("SELECT * FROM questions WHERE id = ?")
      .get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Չի գտնվել" });

    const { type, text, options, correct, points } = req.body;
    const newType = type ?? existing.type;
    const optionsJson =
      newType === "text"
        ? null
        : options !== undefined
          ? JSON.stringify(options)
          : existing.options;
    const correctVal =
      newType === "text"
        ? null
        : correct !== undefined
          ? correct
          : existing.correct;

    db.prepare(
      "UPDATE questions SET type = ?, text = ?, options = ?, correct = ?, points = ? WHERE id = ?",
    ).run(
      newType,
      text?.trim() ?? existing.text,
      optionsJson,
      correctVal,
      points ?? existing.points,
      req.params.id,
    );
    res.json(
      parseQ(
        db.prepare("SELECT * FROM questions WHERE id = ?").get(req.params.id),
      ),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
