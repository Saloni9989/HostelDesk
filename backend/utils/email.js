// backend/utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// ── OTP email ─────────────────────────────────────────────────
const sendOTPEmail = async (to, otp, name = 'Student') => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e9ecef">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">📋</div>
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600">HostelDesk</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Smart Complaint Management</p>
      </div>
      <div style="padding:32px">
        <h2 style="font-size:18px;color:#1a1a2e;margin:0 0 8px">Hello, ${name}!</h2>
        <p style="color:#6c757d;font-size:14px;line-height:1.6;margin:0 0 24px">
          Use the OTP below to log in to HostelDesk. This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="background:#f8f9fa;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;border:2px dashed #e9ecef">
          <div style="letter-spacing:12px;font-size:36px;font-weight:700;color:#6366f1;font-family:monospace">${otp}</div>
          <p style="color:#6c757d;font-size:12px;margin:8px 0 0">One-Time Password</p>
        </div>
        <div style="background:#fff3cd;border-radius:8px;padding:12px 16px;font-size:13px;color:#856404">
          ⚠️ Never share this OTP with anyone. HostelDesk staff will never ask for it.
        </div>
      </div>
      <div style="background:#f8f9fa;padding:16px 32px;text-align:center;font-size:12px;color:#6c757d">
        © ${new Date().getFullYear()} HostelDesk • If you didn't request this, ignore this email.
      </div>
    </div>
  </body>
  </html>`;

  return transporter.sendMail({
    from: `"HostelDesk" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your HostelDesk login OTP`,
    html,
  });
};

// ── Status update email ───────────────────────────────────────
const sendStatusUpdateEmail = async (to, name, complaint, newStatus, adminNote = '') => {
  const statusColor = {
    Pending: '#f59e0b',
    'In Progress': '#3b82f6',
    Resolved: '#10b981',
    Rejected: '#ef4444',
  }[newStatus] || '#6366f1';

  const statusEmoji = {
    Pending: '⏳', 'In Progress': '🔧', Resolved: '✅', Rejected: '❌',
  }[newStatus] || '📋';

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e9ecef">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:18px">📋 HostelDesk Update</h1>
      </div>
      <div style="padding:24px 32px">
        <p style="color:#1a1a2e;font-size:15px;margin:0 0 16px">Hi <strong>${name}</strong>,</p>
        <p style="color:#6c757d;font-size:14px;margin:0 0 20px">
          Your complaint has been updated. Here are the details:
        </p>
        <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="font-size:13px;color:#6c757d;margin-bottom:4px">Complaint</div>
          <div style="font-size:15px;font-weight:500;color:#1a1a2e">${complaint.title}</div>
          <div style="font-size:12px;color:#6c757d;margin-top:4px">#${complaint.id} • ${complaint.category}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="width:44px;height:44px;border-radius:50%;background:${statusColor}22;display:flex;align-items:center;justify-content:center;font-size:20px">${statusEmoji}</div>
          <div>
            <div style="font-size:12px;color:#6c757d">New Status</div>
            <div style="font-size:16px;font-weight:600;color:${statusColor}">${newStatus}</div>
          </div>
        </div>
        ${adminNote ? `
        <div style="background:#e8f4f8;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px">
          <div style="font-size:12px;color:#3b82f6;font-weight:500;margin-bottom:4px">Admin Note</div>
          <div style="font-size:14px;color:#1a1a2e">${adminNote}</div>
        </div>` : ''}
        <a href="${process.env.FRONTEND_URL}/complaints/${complaint.id}" 
           style="display:block;text-align:center;background:#6366f1;color:#fff;text-decoration:none;padding:12px;border-radius:8px;font-size:14px;font-weight:500">
          View Complaint →
        </a>
      </div>
      <div style="background:#f8f9fa;padding:12px 32px;text-align:center;font-size:12px;color:#6c757d">
        © ${new Date().getFullYear()} HostelDesk
      </div>
    </div>
  </body>
  </html>`;

  return transporter.sendMail({
    from: `"HostelDesk" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${statusEmoji} Complaint #${complaint.id} is now ${newStatus}`,
    html,
  });
};

// ── Complaint submitted confirmation ─────────────────────────
const sendComplaintConfirmationEmail = async (to, name, complaint) => {
  const etaMap = { Low: '5-7 days', Medium: '2-4 days', High: '1-2 days', Urgent: 'within 24 hours' };

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e9ecef">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:18px">✅ Complaint Received</h1>
      </div>
      <div style="padding:24px 32px">
        <p style="color:#1a1a2e;font-size:15px;margin:0 0 16px">Hi <strong>${name}</strong>,</p>
        <p style="color:#6c757d;font-size:14px;line-height:1.6;margin:0 0 20px">
          We've received your complaint and will address it as soon as possible.
        </p>
        <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:16px">
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="color:#6c757d;padding:4px 0">Complaint ID</td><td style="font-weight:500;text-align:right">#${complaint.id}</td></tr>
            <tr><td style="color:#6c757d;padding:4px 0">Title</td><td style="font-weight:500;text-align:right">${complaint.title}</td></tr>
            <tr><td style="color:#6c757d;padding:4px 0">Category</td><td style="font-weight:500;text-align:right">${complaint.category}</td></tr>
            <tr><td style="color:#6c757d;padding:4px 0">Priority</td><td style="font-weight:500;text-align:right">${complaint.priority}</td></tr>
            <tr><td style="color:#6c757d;padding:4px 0">Estimated Resolution</td><td style="font-weight:500;text-align:right;color:#6366f1">${etaMap[complaint.priority]}</td></tr>
          </table>
        </div>
      </div>
    </div>
  </body>
  </html>`;

  return transporter.sendMail({
    from: `"HostelDesk" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Complaint #${complaint.id} submitted — ${complaint.title}`,
    html,
  });
};

module.exports = { sendOTPEmail, sendStatusUpdateEmail, sendComplaintConfirmationEmail };
