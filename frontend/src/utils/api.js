// frontend/src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  sendOTP:   (email, name) => api.post('/auth/send-otp', { email, name }),
  verifyOTP: (email, otp)  => api.post('/auth/verify-otp', { email, otp }),
  me:        ()            => api.get('/auth/me'),
  updateProfile: (data)    => api.patch('/auth/profile', data),
};

export const complaintsApi = {
  list:    (params) => api.get('/complaints', { params }),
  get:     (id)     => api.get(`/complaints/${id}`),
  create:  (data)   => api.post('/complaints', data),
  upvote:  (id)     => api.post(`/complaints/${id}/upvote`),
  comment: (id, content) => api.post(`/complaints/${id}/comments`, { content }),
  rate:    (id, stars, feedback) => api.post(`/complaints/${id}/rating`, { stars, feedback }),
  updateStatus: (id, status, note) => api.patch(`/complaints/${id}/status`, { status, note }),
};

export const adminApi = {
  analytics:    ()                    => api.get('/admin/analytics'),
  complaints:   (params)              => api.get('/admin/complaints', { params }),
  users:        (params)              => api.get('/admin/users', { params }),
  updateRole:   (id, role)            => api.patch(`/admin/users/${id}/role`, { role }),
  updateStatus: (id, status, note, rejectionReason) =>
    api.patch(`/admin/complaints/${id}/status`, { status, note, rejectionReason }),
  markSpam:     (id, isSpam)          => api.patch(`/admin/complaints/${id}/spam`, { isSpam }),
};

export const notificationsApi = {
  list:    () => api.get('/notifications'),
  count:   () => api.get('/notifications/count'),
  readAll: () => api.patch('/notifications/read-all'),
};

export default api;
