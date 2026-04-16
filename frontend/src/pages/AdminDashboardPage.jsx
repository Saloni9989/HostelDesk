// frontend/src/pages/AdminDashboardPage.jsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { adminApi } from '../utils/api';
import Spinner from '../components/shared/Spinner';
import { formatDate } from '../utils/helpers';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const PRI_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#f97316', Urgent: '#ef4444' };
const STA_COLORS = { Pending: '#f59e0b', 'In Progress': '#3b82f6', Resolved: '#10b981', Rejected: '#ef4444' };

const StatCard = ({ label, value, icon, sub, color = 'text-primary-600' }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      <span className={`text-2xl font-bold ${color}`}>{value ?? '—'}</span>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    {sub && <div className="text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs shadow-lg">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.analytics().then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const ov = analytics?.overview ?? {};
  const avgRating = analytics?.avgRating;
  const trend = analytics?.trend7Days ?? [];
  const byCategory = analytics?.byCategory ?? [];
  const byStatus = analytics?.byStatus ?? [];
  const byPriority = analytics?.byPriority ?? [];
  const topComplaints = analytics?.topComplaints ?? [];
  const resTime = analytics?.resolutionTime ?? [];

  // Pie chart data for status
  const statusPieData = byStatus.map(s => ({ name: s.status, value: parseInt(s.count) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">System-wide complaint insights</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total"       value={ov.total}         icon="📋" color="text-primary-600" />
        <StatCard label="Pending"     value={ov.pending}       icon="⏳" color="text-amber-600" />
        <StatCard label="In Progress" value={ov.in_progress}   icon="🔧" color="text-blue-600" />
        <StatCard label="Resolved"    value={ov.resolved}      icon="✅" color="text-green-600" />
        <StatCard label="Spam blocked" value={ov.spam_detected} icon="🚫" color="text-red-500" />
        <StatCard
          label="Avg rating"
          value={avgRating?.avg_rating ? Number(avgRating.avg_rating).toFixed(1) : '—'}
          icon="⭐"
          color="text-amber-500"
          sub={avgRating?.total_ratings ? `${avgRating.total_ratings} ratings` : ''}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* 7-day trend */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">7-Day Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString('en', { weekday: 'short' })} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="raised" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Raised" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By category bar */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Complaints by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Total" radius={[0, 4, 4, 0]}>
                {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Status pie */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Status Distribution</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={STA_COLORS[entry.name] || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 text-xs">
              {statusPieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: STA_COLORS[d.name] || COLORS[i] }} />
                  <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority bar */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Priority Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byPriority}>
              <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Complaints" radius={[4, 4, 0, 0]}>
                {byPriority.map((entry) => (
                  <Cell key={entry.priority} fill={PRI_COLORS[entry.priority] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Avg resolution time */}
      {resTime.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Avg Resolution Time by Category (hours)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={resTime}>
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip content={<CustomTooltip />} formatter={v => [`${Math.round(v)}h`]} />
              <Bar dataKey="avg_hours" name="Avg Hours" radius={[4, 4, 0, 0]}>
                {resTime.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top upvoted */}
      {topComplaints.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Top Upvoted Complaints</h2>
          <div className="space-y-3">
            {topComplaints.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="text-lg font-bold text-gray-300 dark:text-gray-700 w-5 text-right">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.category} · {c.priority} · {c.status}</div>
                </div>
                <div className="text-primary-500 font-bold text-sm">▲ {c.votes}</div>
                <div className="progress-bar w-20">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (c.votes / (topComplaints[0]?.votes || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
