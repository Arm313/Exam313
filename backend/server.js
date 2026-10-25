require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./db');

const app = express();
// app.use(cors());

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://eduexam-pro.vercel.app' // <--- Այստեղ դիր Vercel-ի քո իրական հասցեն
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/results', require('./routes/results'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/bulk', require('./routes/bulk'));
app.use('/api/groups', require('./routes/groups'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend http://localhost:${PORT}`));