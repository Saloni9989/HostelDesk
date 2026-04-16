// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, getMe, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);

module.exports = router;
