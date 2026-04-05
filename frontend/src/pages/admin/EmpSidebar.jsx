import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import NotificationBell from '../common/NotificationBell';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/employee',            exact: true, label: 'Dashboard',  icon: <HomeIcon /> },
  { to: '/employee/attendance',              label: 'Attendance',  icon: <ClockIcon /> },
  { to: '/employee/leaves',                  label: 'Leaves',      icon: <PlaneIcon /> },
  { to: '/employee/payslips',                label: 'Payslips',    icon: <WalletIcon /> },
  { to: '/employee/profile',                 label: 'Profile',     icon: <UserIcon /> },
];

export default function EmpSidebar({ open, onClose, theme, onThemeToggle }) {
  const { user, logout } = useAuth();
  const { connected }    = useSocket() || {};
  const nav = useNavigate();
  const location = useLocation();

  const doLogout = async () => {
    await logout();
    toast.success('Signed out');
    nav('/login');
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-screen w-64 z-50 flex flex-col
        bg-base-100 border-r border-base-300
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* ── Logo ── */}
        <div className="px-5 pt-6 pb-4 border-b border-base-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2.5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-base-content leading-none">TalentHub</p>
                <p className="text-[10px] text-primary font-semibold tracking-widest uppercase mt-0.5">Employee</p>
              </div>
            </div>
            {/* Theme toggle */}
            <button onClick={onThemeToggle}
              className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
              {theme === 'light'
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              }
            </button>
          </div>

          {/* User pill */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-base-200">
            <div className="avatar placeholder">
              <div className="w-8 rounded-full bg-primary text-primary-content">
                <span className="text-xs font-bold">{user?.name?.charAt(0)}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-base-content truncate leading-none mb-0.5">{user?.name}</p>
              <p className="text-[11px] text-base-content/40 font-mono">employee</p>
            </div>
            <div className="relative" title={connected ? 'Real-time connected' : 'Connecting...'}>
              <span className={`status-dot ${connected ? 'bg-success' : 'bg-warning'}`}
                style={{ animation: connected ? 'pulse 2s infinite' : 'none' }}></span>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold tracking-widest uppercase text-base-content/30 px-3 pb-2">Workspace</p>
          {NAV.map(n => {
            const isActive = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <NavLink key={n.to} to={n.to} end={n.exact} onClick={onClose}
                className={`nav-link flex items-center gap-3 px-3 py-2.5 text-sm font-medium w-full
                  ${isActive
                    ? 'active bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                    : 'text-base-content/60 hover:bg-base-200 hover:text-base-content border-l-2 border-transparent pl-[10px]'
                  }`}>
                <span className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-base-content/40'}`}>{n.icon}</span>
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="px-3 pb-5 border-t border-base-300 pt-3">
          {/* Notifications */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-base-content/40">Notifications</span>
            <NotificationBell variant="employee" />
          </div>
          <button onClick={doLogout}
            className="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/50 hover:text-error hover:bg-error/5 font-normal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function HomeIcon()   { return <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function ClockIcon()  { return <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function PlaneIcon()  { return <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function WalletIcon() { return <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor"/><path d="M2 10h20" stroke="currentColor" strokeWidth="2"/></svg>; }
function UserIcon()   { return <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>; }
