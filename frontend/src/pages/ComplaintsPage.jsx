// frontend/src/pages/ComplaintsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { complaintsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  CATEGORIES, PRIORITIES, STATUSES, CATEGORY_ICONS,
  STATUS_COLORS, PRIORITY_COLORS, ETA_MAP, formatRelative, truncate,
} from '../utils/helpers';
import Spinner from '../components/shared/Spinner';

export default function ComplaintsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  const [search,   setSearch]   = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [status,   setStatus]   = useState(searchParams.get('status') || '');
  const [myOnly,   setMyOnly]   = useState(searchParams.get('myComplaints') === 'true');
  const [sortBy,   setSortBy]   = useState('created_at');
  const [page,     setPage]     = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    search: debouncedSearch || undefined,
    category: category || undefined,
    priority: priority || undefined,
    status: status || undefined,
    myComplaints: myOnly || undefined,
    sortBy, page, limit: 12,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['complaints', params],
    queryFn: () => complaintsApi.list(params).then(r => r.data),
    keepPreviousData: true,
  });

  const upvoteMutation = useMutation({
    mutationFn: (id) => complaintsApi.upvote(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries(['complaints']);
      toast.success('Upvote recorded!');
    },
    onError: () => toast.error('Failed to upvote'),
  });

  const complaints = data?.complaints ?? [];
  const pagination = data?.pagination ?? {};

  const FilterSelect = ({ value, onChange, options, placeholder }) => (
    <select
      value={value}
      onChange={e => { onChange(e.target.value); setPage(1); }}
      className="input text-sm py-2"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Complaints</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.total ?? '…'} total complaints
            {isFetching && <Spinner size="sm" className="inline-block ml-2" />}
          </p>
        </div>
        <Link to="/complaints/new" className="btn-primary">
          <PlusCircle size={16} />
          <span className="hidden sm:inline">New</span>
        </Link>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 py-2"
              placeholder="Search complaints…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`btn-secondary gap-1.5 ${showFilters ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 border-primary-300' : ''}`}
          >
            <SlidersHorizontal size={15} />
            Filters
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
                <FilterSelect value={category} onChange={setCategory} options={CATEGORIES} placeholder="All categories" />
                <FilterSelect value={priority}  onChange={setPriority}  options={PRIORITIES}  placeholder="All priorities" />
                <FilterSelect value={status}    onChange={setStatus}    options={STATUSES}    placeholder="All statuses" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm py-2">
                  <option value="created_at">Newest first</option>
                  <option value="votes">Most voted</option>
                  <option value="priority">By priority</option>
                </select>
              </div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={myOnly}
                    onChange={e => { setMyOnly(e.target.checked); setPage(1); }}
                    className="rounded text-primary-500"
                  />
                  My complaints only
                </label>
                {(category || priority || status || myOnly || search) && (
                  <button
                    onClick={() => { setCategory(''); setPriority(''); setStatus(''); setMyOnly(false); setSearch(''); setPage(1); }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Complaint list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : complaints.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 dark:text-gray-400">No complaints found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {complaints.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="card p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex gap-3">
                    {/* Upvote */}
                    <button
                      onClick={() => upvoteMutation.mutate(c.id)}
                      className={`upvote-btn flex-shrink-0 ${c.user_voted ? 'voted' : ''}`}
                      disabled={upvoteMutation.isPending}
                    >
                      <span className="text-sm">▲</span>
                      <span className="text-xs font-semibold">{c.votes ?? 0}</span>
                    </button>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/complaints/${c.id}`} className="group block">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-base">{CATEGORY_ICONS[c.category] || '📌'}</span>
                          <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {c.title}
                          </span>
                          <span className={`badge ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                          <span className={`badge ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                          {c.is_spam && <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Spam</span>}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{truncate(c.description, 140)}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                          <span>📍 {c.location || 'No location'}</span>
                          <span>🕐 {formatRelative(c.created_at)}</span>
                          <span>⏱ ETA: {ETA_MAP[c.priority]}</span>
                          <span>💬 {c.comment_count} comments</span>
                          {c.user_name && <span>👤 {c.user_name}</span>}
                        </div>
                      </Link>
                    </div>

                    {/* Image thumbnail */}
                    {c.image_url && (
                      <Link to={`/complaints/${c.id}`} className="flex-shrink-0">
                        <img src={c.image_url} alt="complaint" className="w-16 h-16 rounded-lg object-cover" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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
    </div>
  );
}
