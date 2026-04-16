// frontend/src/pages/DashboardPage.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, ArrowRight, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { complaintsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  CATEGORY_ICONS, STATUS_COLORS, PRIORITY_COLORS, ETA_MAP,
  formatRelative, truncate,
} from '../utils/helpers';
import Spinner from '../components/shared/Spinner';

const StatCard = ({ icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="stat-card"
  >
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>{icon}</div>
    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
  </motion.div>
);

export default function DashboardPage() {
  const { user, isStaff } = useAuth();

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => complaintsApi.list({ myComplaints: true, limit: 5, sortBy: 'created_at' }).then(r => r.data),
  });

  const { data: allData } = useQuery({
    queryKey: ['all-complaints-counts'],
    queryFn: () => complaintsApi.list({ limit: 1 }).then(r => r.data),
    enabled: isStaff,
  });

  const myComplaints = myData?.complaints ?? [];
  const myPagination = myData?.pagination ?? {};

  const stats = [
    { icon: '📋', label: 'My Complaints',  value: myPagination.total,                            color: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600', delay: 0 },
    { icon: '⏳', label: 'Pending',         value: myComplaints.filter(c => c.status === 'Pending').length,       color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600', delay: 0.05 },
    { icon: '🔧', label: 'In Progress',     value: myComplaints.filter(c => c.status === 'In Progress').length,  color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600', delay: 0.1 },
    { icon: '✅', label: 'Resolved',        value: myComplaints.filter(c => c.status === 'Resolved').length,     color: 'bg-green-100 dark:bg-green-900/40 text-green-600', delay: 0.15 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {user?.room_number ? `Room ${user.room_number}, Block ${user.block}` : 'Track your hostel complaints'}
          </p>
        </div>
        <Link to="/complaints/new" className="btn-primary">
          <PlusCircle size={16} />
          New Complaint
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Recent complaints */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base">My Recent Complaints</h2>
          <Link to="/complaints?myComplaints=true" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {myLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : myComplaints.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🏖️</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No complaints yet. Hope everything's great!</p>
            <Link to="/complaints/new" className="btn-primary mt-4 inline-flex">Raise a complaint</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myComplaints.slice(0, 5).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/complaints/${c.id}`} className="complaint-card block">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[c.category] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.title}</span>
                        <span className={`badge ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                        <span className={`badge ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatRelative(c.created_at)}</span>
                        <span>📍 {c.location || 'No location'}</span>
                        <span>⏱ ETA: {ETA_MAP[c.priority]}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-primary-500">▲ {c.votes}</div>
                      <div className="text-xs text-gray-400 mt-0.5">#{c.id}</div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: <TrendingUp size={18} />, title: 'Upvote complaints', desc: 'Support issues others have raised to boost priority.' },
          { icon: <AlertCircle size={18} />, title: 'Set priority right', desc: 'Urgent = safety risk. High = daily life affected.' },
          { icon: <CheckCircle size={18} />, title: 'Rate after resolution', desc: 'Your feedback helps improve hostel services.' },
        ].map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="card p-4 flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center flex-shrink-0">
              {tip.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{tip.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tip.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
