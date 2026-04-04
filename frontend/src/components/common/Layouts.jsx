import React, { useState, useEffect } from 'react';
import AdminSidebar from '../admin/AdminSidebar';
import EmpSidebar  from '../employee/EmpSidebar';

export function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="adm adm-wrap">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      {/* Mobile topbar — only shows on small screens */}
      <header className="adm-top">
        <button className="abtn-icon" onClick={() => setOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>TalentHub</span>
        <div style={{ width:30 }} />
      </header>
      <main className="adm-main">{children}</main>
    </div>
  );
}

export function EmpLayout({ children }) {
  const [open,  setOpen]  = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('th-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('th-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-base-200 font-sans">
      <EmpSidebar open={open} onClose={() => setOpen(false)} theme={theme} onThemeToggle={toggleTheme} />

      {/* Mobile topbar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-base-100 border-b border-base-300 flex items-center justify-between px-4 z-30">
        <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm btn-square">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <span className="text-sm font-bold text-base-content">TalentHub</span>
        <button onClick={toggleTheme} className="btn btn-ghost btn-sm btn-square text-base-content/50">
          {theme === 'light'
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          }
        </button>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
