// frontend/src/components/shared/Layout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, PlusCircle, Users, BarChart2,
  Bell, User, LogOut, Moon, Sun, Menu, X, ChevronRight, CheckCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../utils/api';
import toast from 'react-hot-toast';

const navItem = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150';
const activeClass = 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400';
const inactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200';

const STATUS_ICONS = { Resolved: '✅', Rejected: '❌', 'In Progress': '🔧', Pending: '⏳' };

export default function Layout() {
  const { user, logout, darkMode, toggleDarkMode, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const prevCountRef = useRef(null);

  // Poll unread count every 15s
  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notificationsApi.count().then(r => r.data.count),
    refetchInterval: 15000,
  });

  // Fetch notifications list (always, so we can detect new ones)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
    refetchInterval: 15000,
  });

  // Show toast when a new notification arrives
  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = notifCount;
      return;
    }
    if (notifCount > prevCountRef.current) {
      // Find the newest unread one
      const newest = notifications.find(n => !n.is_read);
      if (newest) {
        const icon = STATUS_ICONS[newest.message?.match(/now (\w[\w ]*)\./)?.[1]] || '🔔';
        toast(
          <div
            className="cursor-pointer"
            onClick={() => {
              if (newest.complaint_id) navigate(`/complaints/${newest.complaint_id}`);
              toast.dismiss();
            }}
          >
            <div className="font-semibold text-sm">{icon} {newest.title}</div>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{newest.message}</div>
            <div className="text-xs text-primary-500 mt-1">Tap to view →</div>
          </div>,
          { duration: 6000, style: { maxWidth: '320px' } }
        );
      }
    }
    prevCountRef.current = notifCount;
  }, [notifCount]);

  // Mark all as read when bell is opened
  const handleOpenNotif = async () => {
    setNotifOpen(o => !o);
    if (!notifOpen && notifCount > 0) {
      await notificationsApi.readAll();
      qc.invalidateQueries(['notif-count']);
      qc.invalidateQueries(['notifications']);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const navLinks = [
    { to: '/dashboard',        label: 'Dashboard',          icon: <LayoutDashboard size={18} />, show: true },
    { to: '/complaints',       label: 'My Complaints',      icon: <FileText size={18} />,        show: !isStaff },
    { to: '/complaints/new',   label: 'New Complaint',      icon: <PlusCircle size={18} />,      show: !isStaff },
    { to: '/admin',            label: 'Analytics',          icon: <BarChart2 size={18} />,       show: isStaff },
    { to: '/admin/complaints', label: 'Manage Complaints',  icon: <FileText size={18} />,        show: isStaff },
    { to: '/admin/users',      label: 'Users',              icon: <Users size={18} />,           show: isAdmin },
    { to: '/profile',          label: 'Profile',            icon: <User size={18} />,            show: true },
  ].filter(n => n.show);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0
          ${isStaff
            ? 'bg-gradient-to-br from-purple-500 to-pink-600'
            : 'bg-gradient-to-br from-primary-500 to-purple-600'
          }`}>
          {isStaff ? '🛡️' : '📋'}
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white text-sm">HostelDesk</div>
          <div className={`text-xs capitalize font-medium
            ${isAdmin ? 'text-purple-500' : isStaff ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {isAdmin ? '⚡ Admin Panel' : isStaff ? '👷 Staff Panel' : user?.role}
          </div>
        </div>
      </div>
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
      <aside className="hidden md:flex w-56 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 h-full w-56 bg-white dark:bg-gray-900 z-50 md:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
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
            {/* Notification bell */}
            <div className="relative">
              <button onClick={handleOpenNotif} className="btn-ghost p-2 relative">
                <Bell size={18} />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="btn-ghost p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        <Bell size={24} className="mx-auto mb-2 opacity-30" />
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 15).map(n => {
                        const icon = n.message?.includes('Resolved') ? '✅'
                          : n.message?.includes('Rejected') ? '❌'
                          : n.message?.includes('In Progress') ? '🔧'
                          : n.type === 'comment' ? '💬'
                          : n.type === 'upvote' ? '▲'
                          : '🔔';
                        return (
                          <div
                            key={n.id}
                            onClick={() => { if (n.complaint_id) { navigate(`/complaints/${n.complaint_id}`); setNotifOpen(false); } }}
                            className={`p-3 border-b border-gray-50 dark:border-gray-800 text-sm transition-colors cursor-pointer
                              hover:bg-gray-50 dark:hover:bg-gray-800
                              ${!n.is_read ? 'bg-primary-50/60 dark:bg-primary-900/10 border-l-2 border-l-primary-400' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-base flex-shrink-0">{icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{n.title}</div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })
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

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
