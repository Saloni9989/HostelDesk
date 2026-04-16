// frontend/src/pages/AdminUsersPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../utils/api';
import { getInitials, formatDate } from '../utils/helpers';
import Spinner from '../components/shared/Spinner';

const ROLES = ['student', 'staff', 'admin'];
const roleColors = {
  student: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  staff:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  admin:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => adminApi.users({ search: search || undefined, role: roleFilter || undefined }).then(r => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => adminApi.updateRole(id, role),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Role updated'); },
    onError: () => toast.error('Failed to update role'),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} users registered</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 py-2"
            placeholder="Search by name, email, or roll number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-36 py-2" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th>User</th>
                  <th>Roll / Room</th>
                  <th>Role</th>
                  <th>Complaints</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{u.roll_number || '—'}</div>
                      <div className="text-xs text-gray-400">
                        {u.room_number ? `Block ${u.block}, Room ${u.room_number}` : '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge capitalize ${roleColors[u.role]}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{u.complaint_count}</span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-400">{formatDate(u.created_at)}</span>
                    </td>
                    <td>
                      <select
                        className="input text-xs py-1 px-2 w-24"
                        value={u.role}
                        onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                        disabled={roleMutation.isPending}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">No users found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
