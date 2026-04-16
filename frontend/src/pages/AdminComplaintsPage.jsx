// frontend/src/pages/AdminComplaintsPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../utils/api';
import {
  CATEGORIES, PRIORITIES, STATUSES,
  CATEGORY_ICONS, STATUS_COLORS, PRIORITY_COLORS,
  formatDate, formatRelative, truncate,
} from '../utils/helpers';
import Spinner from '../components/shared/Spinner';

const ALL_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Duplicate', 'Withdrawn'];

// ── Inline status update modal ────────────────────────────────
function StatusModal({ complaint, onClose, onSave }) {
  const [status, setStatus]           = useState(complaint.status);
  const [note, setNote]               = useState('');
  const [rejectionReason, setRejReason] = useState('');
  const [saving, setSaving]           = useState(false);

  const handleSave = async () => {
    if (!status) return;
    setSaving(true);
    try {
      await onSave(complaint.id, status, note, rejectionReason);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    Pending:      'bg-amber-50 border-amber-300 text-amber-700',
    'In Progress':'bg-blue-50 border-blue-300 text-blue-700',
    Resolved:     'bg-green-50 border-green-300 text-green-700',
    Rejected:     'bg-red-50 border-red-300 text-red-700',
    Duplicate:    'bg-gray-50 border-gray-300 text-gray-700',
    Withdrawn:    'bg-gray-50 border-gray-300 text-gray-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Update Status</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
        </div>

        {/* Complaint info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">#{complaint.id} — {complaint.title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{complaint.user_email}</div>
        </div>

        {/* Status selector */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Status</label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all
                  ${status === s
                    ? statusColors[s] + ' ring-2 ring-offset-1 ring-current'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Rejection reason */}
        {status === 'Rejected' && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Explain why this complaint is being rejected…"
              value={rejectionReason}
              onChange={e => setRejReason(e.target.value)}
            />
          </div>
        )}

        {/* Note */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Note to student <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="e.g. Technician will visit tomorrow morning…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !status || (status === 'Rejected' && !rejectionReason.trim())}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminComplaintsPage() {
  const qc = useQueryClient();
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status,   setStatus]   = useState('');
  const [sortBy,   setSortBy]   = useState('created_at');
  const [page,     setPage]     = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);

  const params = {
    search: search || undefined,
    category: category || undefined,
    priority: priority || undefined,
    status: status || undefined,
    sortBy, page, limit: 15,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-complaints', params],
    queryFn: () => adminApi.complaints(params).then(r => r.data),
    keepPreviousData: true,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, note, rejectionReason }) =>
      adminApi.updateStatus(id, status, note, rejectionReason),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['admin-complaints']);
      qc.invalidateQueries(['admin-analytics']);
      toast.success(`Status updated to ${vars.status}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const complaints = data?.complaints ?? [];
  const pagination = data?.pagination ?? {};

  const handleStatusSave = async (id, status, note, rejectionReason) => {
    await statusMutation.mutateAsync({ id, status, note, rejectionReason });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Complaints</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.total ?? '…'} total
            {isFetching && <Spinner size="sm" className="inline-block ml-2" />}
          </p>
        </div>
        {/* Quick status filter pills */}
        <div className="hidden md:flex gap-1.5">
          {['', 'Pending', 'In Progress', 'Resolved', 'Rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                ${status === s
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 py-2"
              placeholder="Search by title, user name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`btn-secondary gap-1.5 ${showFilters ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 border-primary-300' : ''}`}
          >
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input text-sm py-2">
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }} className="input text-sm py-2">
                  <option value="">All priorities</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input text-sm py-2">
                  <option value="">All statuses</option>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm py-2">
                  <option value="created_at">Newest first</option>
                  <option value="priority">By priority</option>
                  <option value="votes">Most voted</option>
                  <option value="status">By status</option>
                </select>
              </div>
              {(category || priority || status || search) && (
                <button
                  onClick={() => { setCategory(''); setPriority(''); setStatus(''); setSearch(''); setPage(1); }}
                  className="text-sm text-red-500 hover:underline mt-2"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">No complaints found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th>#</th>
                  <th>Complaint</th>
                  <th>User</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="text-gray-400 text-xs font-mono">{c.id}</td>

                    <td className="max-w-xs">
                      <div className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[200px]">
                        {c.title}
                      </div>
                      {c.location && (
                        <div className="text-xs text-gray-400 mt-0.5">📍 {c.location}</div>
                      )}
                      {c.rejection_reason && (
                        <div className="text-xs text-red-400 mt-0.5 truncate max-w-[200px]">
                          ❌ {c.rejection_reason}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="text-sm text-gray-800 dark:text-gray-200">{c.user_name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[140px]">{c.user_email}</div>
                    </td>

                    <td>
                      <span className="text-sm">
                        {CATEGORY_ICONS[c.category]} {c.category}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                    </td>

                    <td>
                      <span className={`badge ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </td>

                    <td>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(c.created_at)}</div>
                      {c.resolved_at && (
                        <div className="text-xs text-green-500 mt-0.5">✅ {formatDate(c.resolved_at)}</div>
                      )}
                    </td>

                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingComplaint(c)}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Update
                        </button>
                        <Link
                          to={`/complaints/${c.id}`}
                          className="btn-ghost p-1.5"
                          title="View detail"
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary px-3 py-2">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
            Page {page} of {pagination.totalPages}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages} className="btn-secondary px-3 py-2">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Status update modal */}
      <AnimatePresence>
        {editingComplaint && (
          <StatusModal
            complaint={editingComplaint}
            onClose={() => setEditingComplaint(null)}
            onSave={handleStatusSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
