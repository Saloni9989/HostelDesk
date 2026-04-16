// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query, queryOne } = require('../config/db');

router.use(authenticate);

// GET /api/notifications — list user notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/count — unread count
router.get('/count', async (req, res) => {
  try {
    const result = await queryOne(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

module.exports = router;
