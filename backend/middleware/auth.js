// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await queryOne('SELECT * FROM users WHERE id = ? AND is_active = TRUE', [decoded.userId]);
    if (!user) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const requireStaff = (req, res, next) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireStaff };
