const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendExamResultEmail({ to, studentName, subjectName, score, percentage, passed }) {
  const subject = `EduExam Pro — ${subjectName} արդյունք`;
  const text = `
Բարև ${studentName},

Ձեր "${subjectName}" քննության արդյունքը պատրաստ է:

Միավոր: ${score}
Տոկոս: ${percentage}%
Կարգավիճակ: ${passed ? 'ԱՆՑԱԾ ✅' : 'ՉԱՆՑԱԾ ❌'}

EduExam Pro
  `;

  if (!transporter) {
    console.log('\n📧 [SIMULATED EMAIL]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(text);
    return { simulated: true };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@eduexam.local',
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (e) {
    console.error('Email send error:', e.message);
    return { error: e.message };
  }
}

module.exports = { sendExamResultEmail };