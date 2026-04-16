// backend/controllers/complaintController.js
const { query, queryOne } = require('../config/db');
const { aiCategorize, detectSpam, getEstimatedHours } = require('../utils/ai');
const { sendComplaintConfirmationEmail } = require('../utils/email');

// ── GET /api/complaints ───────────────────────────────────────
const getComplaints = async (req, res) => {
  try {
    const {
      status, category, priority, search,
      page = 1, limit = 20, myComplaints, sortBy = 'created_at', order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['c.is_spam = FALSE'];
    const params = [];

    // Non-admins only see non-rejected complaints
    if (req.user.role === 'student') {
      conditions.push('(c.user_id = ? OR c.status != "Rejected")');
      params.push(req.user.id);
    }
    if (myComplaints === 'true') {
      conditions.push('c.user_id = ?');
      params.push(req.user.id);
    }
    if (status) { conditions.push('c.status = ?'); params.push(status); }
    if (category) { conditions.push('c.category = ?'); params.push(category); }
    if (priority) { conditions.push('c.priority = ?'); params.push(priority); }
    if (search) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSorts = ['created_at', 'votes', 'priority', 'status'];
    const sortColumn = validSorts.includes(sortBy) ? sortBy : 'created_at';

    const sql = `
      SELECT c.*,
        u.name AS user_name, u.email AS user_email, u.roll_number,
        COUNT(DISTINCT uv.id) AS votes,
        COUNT(DISTINCT cm.id) AS comment_count,
        r.stars AS rating,
        EXISTS(SELECT 1 FROM upvotes WHERE complaint_id = c.id AND user_id = ?) AS user_voted
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN upvotes uv ON uv.complaint_id = c.id
      LEFT JOIN comments cm ON cm.complaint_id = c.id
      LEFT JOIN ratings r ON r.complaint_id = c.id
      ${whereClause}
      GROUP BY c.id, r.stars
      ORDER BY ${sortColumn === 'votes' ? 'votes' : `c.${sortColumn}`} ${order}
      LIMIT ? OFFSET ?
    `;
    params.unshift(req.user.id); // for user_voted
    params.push(parseInt(limit), offset);

    const [complaints, countResult] = await Promise.all([
      query(sql, params),
      query(`SELECT COUNT(*) AS total FROM complaints c ${whereClause}`, params.slice(1, -2)),
    ]);

    res.json({
      complaints,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getComplaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// ── GET /api/complaints/:id ───────────────────────────────────
const getComplaintById = async (req, res) => {
  try {
    const complaint = await queryOne(`
      SELECT c.*,
        u.name AS user_name, u.email AS user_email, u.roll_number,
        COUNT(DISTINCT uv.id) AS votes,
        r.stars AS rating, r.feedback AS rating_feedback,
        EXISTS(SELECT 1 FROM upvotes WHERE complaint_id = c.id AND user_id = ?) AS user_voted
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN upvotes uv ON uv.complaint_id = c.id
      LEFT JOIN ratings r ON r.complaint_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, r.stars, r.feedback`,
      [req.user.id, req.params.id]
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Fetch comments
    const comments = await query(`
      SELECT cm.*, u.name AS user_name, u.role AS user_role
      FROM comments cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.complaint_id = ?
      ORDER BY cm.created_at ASC`,
      [req.params.id]
    );

    // Fetch status history
    const history = await query(`
      SELECT sh.*, u.name AS changed_by_name
      FROM status_history sh
      JOIN users u ON sh.changed_by = u.id
      WHERE sh.complaint_id = ?
      ORDER BY sh.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...complaint, comments, history });
  } catch (err) {
    console.error('getComplaintById error:', err);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
};

// ── POST /api/complaints ──────────────────────────────────────
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, location, block, roomNumber, latitude, longitude } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Spam detection
    const { isSpam, score: spamScore } = detectSpam(title, description);
    if (isSpam) {
      return res.status(400).json({ error: 'Your complaint appears to be spam. Please write a genuine complaint.' });
    }

    // AI categorization
    const { category: aiCategory } = await aiCategorize(title, description);
    const finalCategory = category || aiCategory;

    // Image handling
    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      imageUrl = req.file.path || `/uploads/${req.file.filename}`;
      imagePublicId = req.file.filename || req.file.public_id;
    }

    const estimatedHours = getEstimatedHours(priority || 'Medium');

    const result = await query(`
      INSERT INTO complaints
        (user_id, title, description, category, priority, location, block, room_number,
         image_url, image_public_id, ai_category, spam_score, estimated_hours, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, title, description,
        finalCategory, priority || 'Medium',
        location || null, block || null, roomNumber || null,
        imageUrl, imagePublicId, aiCategory, spamScore,
        estimatedHours, latitude || null, longitude || null,
      ]
    );

    const newComplaint = await queryOne('SELECT * FROM complaints WHERE id = ?', [result.insertId]);

    // Send confirmation email (non-blocking)
    sendComplaintConfirmationEmail(req.user.email, req.user.name, newComplaint).catch(console.error);

    // Create notification for admins
    await query(`
      INSERT INTO notifications (user_id, type, complaint_id, title, message)
      SELECT id, 'status_update', ?, 'New Complaint', ?
      FROM users WHERE role IN ('admin', 'staff')`,
      [result.insertId, `New ${priority || 'Medium'} priority complaint: ${title}`]
    );

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: { ...newComplaint, aiSuggestedCategory: aiCategory },
    });
  } catch (err) {
    console.error('createComplaint error:', err);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
};

// ── POST /api/complaints/:id/upvote ──────────────────────────
const upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await queryOne('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const existing = await queryOne(
      'SELECT * FROM upvotes WHERE complaint_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing) {
      await query('DELETE FROM upvotes WHERE complaint_id = ? AND user_id = ?', [id, req.user.id]);
      return res.json({ message: 'Upvote removed', action: 'removed' });
    }

    await query('INSERT INTO upvotes (complaint_id, user_id) VALUES (?, ?)', [id, req.user.id]);

    // Notify complaint owner
    if (complaint.user_id !== req.user.id) {
      await query(`
        INSERT INTO notifications (user_id, type, complaint_id, title, message)
        VALUES (?, 'upvote', ?, 'New upvote', ?)`,
        [complaint.user_id, id, `${req.user.name} upvoted your complaint: ${complaint.title}`]
      );
    }

    const countResult = await queryOne(
      'SELECT COUNT(*) AS count FROM upvotes WHERE complaint_id = ?', [id]
    );
    res.json({ message: 'Upvoted successfully', action: 'added', votes: countResult.count });
  } catch (err) {
    console.error('upvoteComplaint error:', err);
    res.status(500).json({ error: 'Failed to process upvote' });
  }
};

// ── POST /api/complaints/:id/comments ────────────────────────
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });

    const complaint = await queryOne('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const isOfficial = ['admin', 'staff'].includes(req.user.role);
    const result = await query(`
      INSERT INTO comments (complaint_id, user_id, content, is_official, parent_id)
      VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.id, content.trim(), isOfficial, parentId || null]
    );

    // Notify complaint owner
    if (complaint.user_id !== req.user.id) {
      await query(`
        INSERT INTO notifications (user_id, type, complaint_id, title, message)
        VALUES (?, 'comment', ?, 'New comment', ?)`,
        [complaint.user_id, id, `${req.user.name} commented: "${content.slice(0, 60)}..."`]
      );
    }

    const comment = await queryOne(`
      SELECT cm.*, u.name AS user_name, u.role AS user_role
      FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.id = ?`,
      [result.insertId]
    );
    res.status(201).json(comment);
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// ── POST /api/complaints/:id/rating ──────────────────────────
const rateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { stars, feedback } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const complaint = await queryOne('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ error: 'Can only rate resolved complaints' });
    }
    if (complaint.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only rate your own complaints' });
    }

    await query(`
      INSERT INTO ratings (complaint_id, user_id, stars, feedback)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE stars = ?, feedback = ?`,
      [id, req.user.id, stars, feedback || null, stars, feedback || null]
    );

    res.json({ message: 'Rating submitted. Thank you for your feedback!' });
  } catch (err) {
    console.error('rateComplaint error:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

module.exports = { getComplaints, getComplaintById, createComplaint, upvoteComplaint, addComment, rateComplaint };
