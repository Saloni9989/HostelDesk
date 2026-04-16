// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/db');
const { sendOTPEmail } = require('../utils/email');

// Generate 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ── POST /api/auth/send-otp ───────────────────────────────────
const sendOTP = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    // Check if user already exists; if not, create one (first login = auto-register)
    let user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const insertResult = await query(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [name || email.split('@')[0], email]
      );
      user = { id: insertResult.insertId, email, name: name || email.split('@')[0] };
    }

    // Invalidate old OTPs for this email
    await query('UPDATE otp_tokens SET used = 1 WHERE email = ? AND used = 0', [email]);

    // Create new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await query(
      'INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    // Send email (skip in dev if email not configured)
    const isDev = process.env.NODE_ENV !== 'production';
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your@gmail.com';

    if (emailConfigured) {
      await sendOTPEmail(email, otp, user.name);
    } else if (isDev) {
      console.log(`\n📧 [DEV MODE] OTP for ${email}: ${otp}\n`);
    } else {
      await sendOTPEmail(email, otp, user.name); // will throw in prod if not configured
    }

    res.json({
      message: 'OTP sent successfully',
      email,
      // expose OTP in dev when email is not configured
      ...(isDev && !emailConfigured && { otp, devNote: 'Email not configured — OTP returned for dev use' }),
    });
  } catch (err) {
    console.error('sendOTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    // Find valid OTP
    const tokenRecord = await queryOne(
      `SELECT * FROM otp_tokens 
       WHERE email = ? AND used = 0 AND expires_at > UTC_TIMESTAMP()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (!tokenRecord) {
      return res.status(400).json({ error: 'OTP expired or invalid. Please request a new one.' });
    }

    // Increment attempts
    await query('UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ?', [tokenRecord.id]);

    if (tokenRecord.attempts >= 5) {
      await query('UPDATE otp_tokens SET used = 1 WHERE id = ?', [tokenRecord.id]);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (tokenRecord.otp !== otp) {
      const remaining = 5 - tokenRecord.attempts - 1;
      return res.status(400).json({ error: `Incorrect OTP. ${remaining} attempts remaining.` });
    }

    // Mark OTP as used
    await query('UPDATE otp_tokens SET used = 1 WHERE id = ?', [tokenRecord.id]);

    // Get user
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.roll_number,
        roomNumber: user.room_number,
        block: user.block,
      },
    });
  } catch (err) {
    console.error('verifyOTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, name, email, role, roll_number, room_number, block, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ── PATCH /api/auth/profile ───────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, rollNumber, roomNumber, block, phone } = req.body;
    await query(
      'UPDATE users SET name=?, roll_number=?, room_number=?, block=?, phone=? WHERE id=?',
      [name, rollNumber, roomNumber, block, phone, req.user.id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = { sendOTP, verifyOTP, getMe, updateProfile };
