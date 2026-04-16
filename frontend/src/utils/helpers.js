// frontend/src/utils/helpers.js

export const CATEGORIES = ['Water', 'WiFi', 'Mess', 'Electricity', 'Maintenance', 'Sanitation', 'Security', 'Other'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const STATUSES   = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

export const CATEGORY_ICONS = {
  Water: '💧', WiFi: '📶', Mess: '🍽️', Electricity: '⚡',
  Maintenance: '🔧', Sanitation: '🧹', Security: '🔒', Other: '📌',
};

export const STATUS_COLORS = {
  Pending:     'badge-pending',
  'In Progress': 'badge-progress',
  Resolved:    'badge-resolved',
  Rejected:    'badge-rejected',
  Withdrawn:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const PRIORITY_COLORS = {
  Low:    'badge-low',
  Medium: 'badge-medium',
  High:   'badge-high',
  Urgent: 'badge-urgent',
};

export const ETA_MAP = {
  Low: '5–7 days', Medium: '2–4 days', High: '1–2 days', Urgent: '< 24 hrs',
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

export const formatRelative = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return formatDate(dateStr);
};

export const truncate = (str, len = 100) =>
  str && str.length > len ? str.slice(0, len) + '…' : str;

export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
