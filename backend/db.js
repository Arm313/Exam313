const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'eduexam.db');
const db = new Database(dbPath);

try {
  const cols = db.prepare('PRAGMA table_info(subjects)').all().map((c) => c.name);
  if (cols.length > 0 && !cols.includes('allowedGroups')) {
    console.log('⚠️ Old schema detected. Recreating tables...');
    db.exec(`DROP TABLE IF EXISTS results; DROP TABLE IF EXISTS questions; DROP TABLE IF EXISTS subjects;`);
  }
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', createdAt TEXT NOT NULL, createdBy TEXT
  );
  
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, timerMinutes INTEGER DEFAULT 15, passMarkPercent INTEGER DEFAULT 60, 
    shuffleQuestions INTEGER DEFAULT 0, showAnswersAfter INTEGER DEFAULT 1, allowRetake INTEGER DEFAULT 1, 
    maxAttempts INTEGER DEFAULT 0, startTime TEXT, endTime TEXT, questionsCount INTEGER DEFAULT 0, isActive INTEGER DEFAULT 0,
    allowedGroups TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY, subjectId TEXT NOT NULL, type TEXT DEFAULT 'multiple_choice', text TEXT NOT NULL, options TEXT, correct INTEGER, points INTEGER DEFAULT 1, FOREIGN KEY(subjectId) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY, studentName TEXT NOT NULL, studentGroup TEXT NOT NULL, subjectId TEXT, subjectName TEXT NOT NULL, score TEXT NOT NULL, percentage INTEGER NOT NULL, passed INTEGER NOT NULL, violations INTEGER DEFAULT 0, submissionReason TEXT, answers TEXT, questionIds TEXT, date TEXT NOT NULL, needsGrading INTEGER DEFAULT 0, isArchived INTEGER DEFAULT 0, studentEmail TEXT
  );

  CREATE TABLE IF NOT EXISTS global_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const adminCount = db.prepare("SELECT COUNT(*) as c FROM admins WHERE role = 'super'").get().c;
if (adminCount === 0) {
  const initialPassword = process.env.ADMIN_PASSWORD || 'admin123';
  db.prepare('INSERT INTO admins (id, username, passwordHash, role, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)').run('admin-super-1', 'admin', bcrypt.hashSync(initialPassword, 10), 'super', new Date().toISOString(), 'system');
}

const settingsDefaults = { violationLimit: '3', fullscreenRequired: '1', emailNotifications: '0', allowCopy: '0', warningMinutes: '5', blockTabSwitch: '1', siteName: 'EduExam Pro', allowExports: '1', emailRecipients: 'student', teacherEmail: '', notifyOnViolations: '0' };
for (const [key, value] of Object.entries(settingsDefaults)) {
  if (!db.prepare('SELECT key FROM global_settings WHERE key = ?').get(key)) db.prepare('INSERT INTO global_settings (key, value) VALUES (?, ?)').run(key, value);
}

console.log('✅ DB initialized.');
module.exports = db;