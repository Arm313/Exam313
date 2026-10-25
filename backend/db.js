const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, "passwordHash" TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', "createdAt" TEXT NOT NULL, "createdBy" TEXT
      );
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, "timerMinutes" INTEGER DEFAULT 15, "passMarkPercent" INTEGER DEFAULT 60, 
        "shuffleQuestions" INTEGER DEFAULT 0, "showAnswersAfter" INTEGER DEFAULT 1, "allowRetake" INTEGER DEFAULT 1, 
        "maxAttempts" INTEGER DEFAULT 0, "startTime" TEXT, "endTime" TEXT, "questionsCount" INTEGER DEFAULT 0, "isActive" INTEGER DEFAULT 0,
        "allowedGroups" TEXT DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY, "subjectId" TEXT NOT NULL, type TEXT DEFAULT 'multiple_choice', text TEXT NOT NULL, options TEXT, correct INTEGER, points INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY, "studentName" TEXT NOT NULL, "studentGroup" TEXT NOT NULL, "subjectId" TEXT, "subjectName" TEXT NOT NULL, score TEXT NOT NULL, percentage INTEGER NOT NULL, passed INTEGER NOT NULL, violations INTEGER DEFAULT 0, "submissionReason" TEXT, answers TEXT, "questionIds" TEXT, date TEXT NOT NULL, "needsGrading" INTEGER DEFAULT 0, "isArchived" INTEGER DEFAULT 0, "studentEmail" TEXT
      );
      CREATE TABLE IF NOT EXISTS global_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);

    const adminRes = await pool.query("SELECT COUNT(*) as c FROM admins WHERE role = 'super'");
    if (parseInt(adminRes.rows[0].c) === 0) {
      const initialPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = bcrypt.hashSync(initialPassword, 10);
      await pool.query(
        'INSERT INTO admins (id, username, "passwordHash", role, "createdAt", "createdBy") VALUES ($1, $2, $3, $4, $5, $6)',
        ['admin-super-1', 'admin', hash, 'super', new Date().toISOString(), 'system']
      );
      console.log(`✅ Super admin created — username: "admin", password: "${initialPassword}"`);
    }

    const settingsDefaults = { violationLimit: '3', fullscreenRequired: '1', emailNotifications: '0', allowCopy: '0', warningMinutes: '5', blockTabSwitch: '1', siteName: 'EduExam Pro', allowExports: '1', emailRecipients: 'student', teacherEmail: '', notifyOnViolations: '0' };
    for (const [key, value] of Object.entries(settingsDefaults)) {
      const stRes = await pool.query('SELECT key FROM global_settings WHERE key = $1', [key]);
      if (stRes.rows.length === 0) {
        await pool.query('INSERT INTO global_settings (key, value) VALUES ($1, $2)', [key, value]);
      }
    }
    console.log('✅ Neon PostgreSQL Database Connected.');
  } catch (error) {
    console.error('❌ Database init error:', error);
  }
};

initDB();
module.exports = pool;