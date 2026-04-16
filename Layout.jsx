// frontend/src/components/shared/Layout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, PlusCircle, Users, BarChart2,
  Bell, User, LogOut, Moon, Sun, Menu, X, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../utils/api';
import toast from 'react-hot-toast';

const navItem = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150';
const activeClass = 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400';
const inactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200';

export default function Layout() {
  const { user, logout, darkMode, toggleDarkMode, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notificationsApi.count().then(r => r.data.count),
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
    enabled: notifOpen,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const navLinks = [
    { to: '/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={18} />, show: true },
    { to: '/complaints',   label: 'Complaints',   icon: <FileText size={18} />,        show: true },
    { to: '/complaints/new', label: 'New Complaint', icon: <PlusCircle size={18} />,  show: true },
    { to: '/admin',        label: 'Analytics',    icon: <BarChart2 size={18} />,       show: isStaff },
    { to: '/admin/users',  label: 'Users',        icon: <Users size={18} />,           show: isAdmin },
    { to: '/profile',      label: 'Profile',      icon: <User size={18} />,            show: true },
  ].filter(n => n.show);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xl flex-shrink-0">
          📋
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white text-sm">HostelDesk</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => `${navItem} ${isActive ? activeClass : inactiveClass}`}
            onClick={() => setSidebarOpen(false)}
          >
            {icon}
            <span>{label}</span>
            <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100" />
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <button onClick={toggleDarkMode} className={`${navItem} ${inactiveClass} w-full`}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={handleLogout} className={`${navItem} ${inactiveClass} w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600`}>
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 h-full w-56 bg-white dark:bg-gray-900 z-50 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost md:hidden p-2">
            <Menu size={20} />
          </button>
          <div className="hidden md:block">
            <h1 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              Welcome back, <span className="text-primary-600 dark:text-primary-400">{user?.name?.split(' ')[0]}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="btn-ghost p-2 relative"
              >
                <Bell size={18} />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 w-80 card shadow-xl z-50 max-h-96 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">Notifications</span>
                      <button onClick={() => setNotifOpen(false)} className="btn-ghost p-1"><X size={14} /></button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`p-3 border-b border-gray-50 dark:border-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                          <div className="font-medium text-gray-800 dark:text-gray-200">{n.title}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
