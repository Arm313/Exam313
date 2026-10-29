require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./db');

const app = express();
// ✅ Թույլատրում ենք Vercel-ի և լոկալ դոմենները
const allowedOrigins = [
  'https://exam313.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Թույլատրում ենք, եթե origin-ը կա ցանկում կամ բացակայում է (Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS-ը թույլ չի տալիս այս աղբյուրից'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Կարևոր է preflight (OPTIONS) հարցումների համար
app.options('*', cors())
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/results', require('./routes/results'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/bulk', require('./routes/bulk'));
app.use('/api/groups', require('./routes/groups'));

// ✅ ՍԱՆՔ ԱՄԵՆԱԿԱՐԵՎՈՐՆ Է
app.use('/api/links', require('./routes/links'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend http://localhost:${PORT}`));