// frontend/src/pages/ComplaintDetailPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, ThumbsUp, Star, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { complaintsApi, adminApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  CATEGORY_ICONS, STATUS_COLORS, PRIORITY_COLORS, ETA_MAP,
  formatDate, formatRelative, getInitials,
} from '../utils/helpers';
import Spinner from '../components/shared/Spinner';

const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();

  const [comment, setComment]       = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus]   = useState('');
  const [ownerNote, setOwnerNote]   = useState('');
  const [rating, setRating]         = useState(0);
  const [hoverStar, setHoverStar]   = useState(0);
  const [feedback, setFeedback]     = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const { data: c, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.get(id).then(r => r.data),
  });

  const upvoteMutation = useMutation({
    mutationFn: () => complaintsApi.upvote(id),
    onSuccess: () => { qc.invalidateQueries(['complaint', id]); toast.success('Upvoted!'); },
  });

  const commentMutation = useMutation({
    mutationFn: () => complaintsApi.comment(id, comment),
    onSuccess: () => { qc.invalidateQueries(['complaint', id]); setComment(''); toast.success('Comment added'); },
    onError: () => toast.error('Failed to add comment'),
  });

  const statusMutation = useMutation({
    mutationFn: () => adminApi.updateStatus(id, newStatus, statusNote),
    onSuccess: () => {
      qc.invalidateQueries(['complaint', id]);
      toast.success(`Status updated to ${newStatus}`);
      setNewStatus(''); setStatusNote('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const ratingMutation = useMutation({
    mutationFn: () => complaintsApi.rate(id, rating, feedback),
    onSuccess: () => {
      qc.invalidateQueries(['complaint', id]);
      setRatingSubmitted(true);
      toast.success('Thank you for your feedback!');
    },
    onError: () => toast.error('Failed to submit rating'),
  });

  const ownerStatusMutation = useMutation({
    mutationFn: () => complaintsApi.updateStatus(id, 'Withdrawn', ownerNote),
    onSuccess: () => {
      qc.invalidateQueries(['complaint', id]);
      qc.invalidateQueries(['complaints']);
      toast.success('Complaint withdrawn');
      setOwnerNote('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to withdraw'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!c) return <div className="text-center py-20 text-gray-400">Complaint not found</div>;

  const isOwner = c.user_id === user?.id;
  const canRate  = isOwner && c.status === 'Resolved' && !c.rating && !ratingSubmitted;
  const canWithdraw = isOwner && !['Resolved', 'Rejected', 'Withdrawn'].includes(c.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Main card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-start gap-4">
          {/* Upvote */}
          <button
            onClick={() => upvoteMutation.mutate()}
            className={`upvote-btn ${c.user_voted ? 'voted' : ''} flex-shrink-0`}
            disabled={upvoteMutation.isPending}
          >
            <ThumbsUp size={15} />
            <span className="text-sm font-bold">{c.votes}</span>
          </button>

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`badge ${STATUS_COLORS[c.status]}`}>{c.status}</span>
              <span className={`badge ${PRIORITY_COLORS[c.priority]}`}>{c.priority} Priority</span>
              <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {CATEGORY_ICONS[c.category]} {c.category}
              </span>
              <span className="text-xs text-gray-400 self-center">#{c.id}</span>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{c.title}</h1>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <span>📍 {c.location || 'No location'}</span>
              <span>📅 {formatDate(c.created_at)}</span>
              <span>⏱ ETA: {ETA_MAP[c.priority]}</span>
              {c.resolved_at && <span>✅ Resolved: {formatDate(c.resolved_at)}</span>}
            </div>

            {/* Description */}
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.description}</p>

            {/* Image */}
            {c.image_url && (
              <div className="mt-4 rounded-xl overflow-hidden">
                <img src={c.image_url} alt="complaint" className="w-full max-h-72 object-cover" />
              </div>
            )}

            {/* Reporter */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(c.user_name)}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Raised by <span className="font-medium text-gray-700 dark:text-gray-300">{c.user_name}</span>
                {c.roll_number && ` · ${c.roll_number}`}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status timeline */}
      {c.history?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-base">Status History</h2>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            {c.history.map((h, i) => (
              <div key={h.id} className="relative mb-4 last:mb-0">
                <div className="absolute -left-4 w-3 h-3 rounded-full bg-primary-500 border-2 border-white dark:border-gray-900" />
                <div className="text-sm">
                  <span className={`badge ${STATUS_COLORS[h.new_status]} mr-2`}>{h.new_status}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">by {h.changed_by_name} · {formatRelative(h.created_at)}</span>
                </div>
                {h.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1 italic">"{h.note}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner: withdraw complaint */}
      {canWithdraw && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5 border-amber-200 dark:border-amber-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1 text-base flex items-center gap-2">
            <XCircle size={16} className="text-amber-500" /> Withdraw Complaint
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Issue resolved on your own, or raised by mistake? You can withdraw it.
          </p>
          <textarea
            className="input resize-none mb-3"
            rows={2}
            placeholder="Reason for withdrawing (optional)…"
            value={ownerNote}
            onChange={e => setOwnerNote(e.target.value)}
          />
          <button
            onClick={() => ownerStatusMutation.mutate()}
            disabled={ownerStatusMutation.isPending}
            className="btn-secondary text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            <XCircle size={15} />
            {ownerStatusMutation.isPending ? 'Withdrawing…' : 'Withdraw Complaint'}
          </button>
        </motion.div>
      )}

      {/* Admin status update */}
      {isStaff && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-base">Update Status</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                className="input"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                <option value="">Select new status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={() => statusMutation.mutate()}
                disabled={!newStatus || statusMutation.isPending}
                className="btn-primary"
              >
                {statusMutation.isPending ? 'Updating…' : 'Update'}
              </button>
            </div>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Add a note for the student (optional)…"
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Rating */}
      {canRate && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1 text-base">Rate the Resolution</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">How satisfied are you with how this was handled?</p>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHoverStar(s)}
                onMouseLeave={() => setHoverStar(0)}
                className={`star ${s <= (hoverStar || rating) ? 'filled' : 'empty'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            className="input resize-none mb-3"
            rows={2}
            placeholder="Any feedback? (optional)"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
          <button
            onClick={() => ratingMutation.mutate()}
            disabled={!rating || ratingMutation.isPending}
            className="btn-primary"
          >
            <Star size={14} /> Submit Rating
          </button>
        </motion.div>
      )}

      {/* Show existing rating */}
      {c.rating && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">Resolution Rating</h2>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-amber-500">{c.rating}</div>
            <div className="text-amber-400 text-xl">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</div>
          </div>
          {c.rating_feedback && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{c.rating_feedback}"</p>}
        </div>
      )}

      {/* Comments */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-base">
          Discussion ({c.comments?.length ?? 0})
        </h2>

        {/* Comments thread */}
        <div className="comment-thread mb-4">
          {(!c.comments || c.comments.length === 0) ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No comments yet. Start the discussion!</p>
          ) : (
            c.comments.map((cm, i) => (
              <motion.div
                key={cm.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex gap-3 ${cm.is_official ? 'bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30' : ''}`}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {getInitials(cm.user_name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{cm.user_name}</span>
                    {cm.is_official && <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px]">Official</span>}
                    <span className="text-xs text-gray-400">{formatRelative(cm.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cm.content}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Add comment */}
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              className="input py-2 flex-1"
              placeholder="Write a comment…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && comment.trim() && commentMutation.mutate()}
            />
            <button
              onClick={() => commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
              className="btn-primary px-3"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
