const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Չթույլատրված' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'super') {
      return res.status(403).json({ error: 'Միայն ադմինի համար' });
    }
    next();
  });
}

function requireSuper(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'super') {
      return res.status(403).json({ error: 'Միայն գլխավոր ադմինի համար' });
    }
    next();
  });
}

module.exports = { signToken, verifyToken, requireAuth, requireAdmin, requireSuper };