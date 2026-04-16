// backend/controllers/adminController.js
const { query, queryOne } = require('../config/db');
const { sendStatusUpdateEmail } = require('../utils/email');

// ── PATCH /api/admin/complaints/:id/status ────────────────────
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, assignedTo, rejectionReason } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Duplicate'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const complaint = await queryOne(
      'SELECT c.*, u.name AS user_name, u.email AS user_email FROM complaints c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [id]
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const oldStatus = complaint.status;

    // Update complaint
    const updates = {
      status,
      assigned_to: assignedTo || complaint.assigned_to,
      rejection_reason: rejectionReason || null,
    };
    if (status === 'Resolved') updates.resolved_at = new Date();

    await query(
      'UPDATE complaints SET status=?, assigned_to=?, rejection_reason=?, resolved_at=? WHERE id=?',
      [updates.status, updates.assigned_to, updates.rejection_reason, updates.resolved_at || null, id]
    );

    // Log status history
    await query(
      'INSERT INTO status_history (complaint_id, changed_by, old_status, new_status, note) VALUES (?,?,?,?,?)',
      [id, req.user.id, oldStatus, status, note || null]
    );

    // Create notification for complaint owner
    await query(`
      INSERT INTO notifications (user_id, type, complaint_id, title, message)
      VALUES (?, 'status_update', ?, ?, ?)`,
      [
        complaint.user_id, id,
        `Complaint #${id} status updated`,
        `Your complaint "${complaint.title}" is now ${status}.${note ? ` Note: ${note}` : ''}`,
      ]
    );

    // Send email notification (non-blocking)
    sendStatusUpdateEmail(
      complaint.user_email,
      complaint.user_name,
      complaint,
      status,
      note
    ).catch(console.error);

    res.json({ message: 'Status updated successfully', oldStatus, newStatus: status });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// ── GET /api/admin/analytics ──────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const [
      overview,
      byCategory,
      byPriority,
      byStatus,
      trend7Days,
      avgRating,
      topComplaints,
      resolutionTime,
    ] = await Promise.all([
      // Overview counts
      query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'Pending') AS pending,
          SUM(status = 'In Progress') AS in_progress,
          SUM(status = 'Resolved') AS resolved,
          SUM(status = 'Rejected') AS rejected,
          SUM(is_spam = TRUE) AS spam_detected
        FROM complaints`),

      // By category
      query(`
        SELECT category, COUNT(*) AS count,
          SUM(status = 'Resolved') AS resolved,
          AVG(CASE WHEN status='Resolved' THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) END) AS avg_resolution_hours
        FROM complaints GROUP BY category ORDER BY count DESC`),

      // By priority
      query(`SELECT priority, COUNT(*) AS count FROM complaints GROUP BY priority ORDER BY count DESC`),

      // By status
      query(`SELECT status, COUNT(*) AS count FROM complaints GROUP BY status`),

      // 7-day trend
      query(`
        SELECT DATE(created_at) AS date,
          COUNT(*) AS raised,
          SUM(status = 'Resolved') AS resolved
        FROM complaints
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC`),

      // Avg rating
      query(`SELECT AVG(stars) AS avg_rating, COUNT(*) AS total_ratings FROM ratings`),

      // Top upvoted complaints
      query(`
        SELECT c.id, c.title, c.category, c.priority, c.status,
          COUNT(uv.id) AS votes
        FROM complaints c
        LEFT JOIN upvotes uv ON uv.complaint_id = c.id
        GROUP BY c.id
        ORDER BY votes DESC LIMIT 5`),

      // Avg resolution time by category
      query(`
        SELECT category,
          AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) AS avg_hours
        FROM complaints
        WHERE status = 'Resolved' AND resolved_at IS NOT NULL
        GROUP BY category`),
    ]);

    res.json({
      overview: overview[0],
      byCategory,
      byPriority,
      byStatus,
      trend7Days,
      avgRating: avgRating[0],
      topComplaints,
      resolutionTime,
    });
  } catch (err) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// ── GET /api/admin/users ──────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    if (search) { conditions.push('(name LIKE ? OR email LIKE ? OR roll_number LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (role) { conditions.push('role = ?'); params.push(role); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const users = await query(`
      SELECT u.id, u.name, u.email, u.role, u.roll_number, u.room_number, u.block, u.is_active, u.created_at,
        COUNT(DISTINCT c.id) AS complaint_count
      FROM users u
      LEFT JOIN complaints c ON c.user_id = u.id
      ${where}
      GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ── PATCH /api/admin/users/:id/role ───────────────────────────
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['student', 'staff', 'admin'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    await query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// ── PATCH /api/admin/complaints/:id/spam ─────────────────────
const markSpam = async (req, res) => {
  try {
    const { isSpam } = req.body;
    await query('UPDATE complaints SET is_spam = ? WHERE id = ?', [isSpam, req.params.id]);
    res.json({ message: `Complaint marked as ${isSpam ? 'spam' : 'not spam'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update spam status' });
  }
};

module.exports = { updateStatus, getAnalytics, getUsers, updateUserRole, markSpam };
