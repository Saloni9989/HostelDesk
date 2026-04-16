// frontend/src/pages/ProfilePage.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name:       user?.name || '',
    rollNumber: user?.roll_number || '',
    roomNumber: user?.room_number || '',
    block:      user?.block || '',
    phone:      user?.phone || '',
  });

  const mutation = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: () => toast.success('Profile updated!'),
    onError:   () => toast.error('Failed to update profile'),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(user?.name)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{user?.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
            <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 capitalize mt-1">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Full Name',    key: 'name',       placeholder: 'Your name' },
            { label: 'Roll Number',  key: 'rollNumber', placeholder: '2024CS001' },
            { label: 'Block',        key: 'block',      placeholder: 'A / B / C' },
            { label: 'Room Number',  key: 'roomNumber', placeholder: '204' },
            { label: 'Phone',        key: 'phone',      placeholder: '+91 9876543210' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
              <input
                className="input"
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
              />
            </div>
          ))}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary w-full mt-2"
          >
            <Save size={16} />
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
