require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./db');

const app = express();

// ✅ CORS կարգավորում
const allowedOrigins = [
  'https://exam313.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
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

// ✅ Preflight հարցումների համար (Express 5-ի համար)
app.options(/.*/, cors());

app.use(express.json());

// ✅ Բաց route-ներ (առանց token-ի)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/bulk', require('./routes/bulk'));

// ✅ Պաշտպանված route-ներ (token-ով)
app.use('/api/admins', require('./routes/admins'));
app.use('/api/results', require('./routes/results'));

// ⚠️ links route-ը միայն եթե ֆայլը գոյություն ունի
try {
  app.use('/api/links', require('./routes/links'));
} catch (e) {
  console.log('⚠️ links.js չկա — շարունակում ենք առանց դրա');
}

// ✅ Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ✅ 404 handler (եթե route չկա)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Backend http://localhost:${PORT}`));