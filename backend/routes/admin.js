// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { getAdminComplaints, updateStatus, getAnalytics, getUsers, updateUserRole, markSpam } = require('../controllers/adminController');
const { authenticate, requireStaff, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/analytics', requireStaff, getAnalytics);
router.get('/complaints', requireStaff, getAdminComplaints);
router.get('/users', requireAdmin, getUsers);
router.patch('/users/:id/role', requireAdmin, updateUserRole);
router.patch('/complaints/:id/status', requireStaff, updateStatus);
router.patch('/complaints/:id/spam', requireAdmin, markSpam);

module.exports = router;
