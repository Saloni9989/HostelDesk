// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(d => {
      localStorage.setItem('darkMode', String(!d));
      return !d;
    });
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = ['admin', 'staff'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, darkMode, toggleDarkMode, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
