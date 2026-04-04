import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const NAV = [
  { to:'/admin',             exact:true, label:'Dashboard',   icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to:'/admin/employees',   label:'Employees',   icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to:'/admin/departments', label:'Departments', icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to:'/admin/attendance',  label:'Attendance',  icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to:'/admin/leaves',      label:'Leaves',      icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to:'/admin/payroll',     label:'Payroll',     icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { to:'/admin/kin',         label:'Emergency',   icon:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { to:'/admin/users',       label:'Users',       icon:'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
];

function Icon({ path }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function SideContent({ onClose }) {
  const { user, logout } = useAuth();
  const { connected }    = useSocket() || {};
  const nav = useNavigate();

  const doLogout = async () => {
    await logout();
    toast.success('Signed out');
    nav('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'A';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#fff', borderRight:'1px solid #e8eaf6' }}>
      {/* Logo */}
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid #e8eaf6' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#1e1e2e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight:700, fontSize:13, lineHeight:1, color:'#1a1a2e' }}>TalentHub</p>
            <p style={{ fontSize:9, color:'#9fa8c7', marginTop:2, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase' }}>Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        <p style={{ fontSize:9, fontWeight:700, color:'#c5cae9', textTransform:'uppercase', letterSpacing:'.12em', padding:'4px 10px 8px' }}>Management</p>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.exact} onClick={onClose}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 10px', borderRadius:8,
              fontSize:13, fontWeight: isActive ? 600 : 500,
              textDecoration:'none', transition:'all .12s',
              background: isActive ? '#1e1e2e' : 'transparent',
              color: isActive ? '#fff' : '#5c6494',
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('1e1e2e')) { e.currentTarget.style.background='#f5f5ff'; e.currentTarget.style.color='#1a1a2e'; } }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('1e1e2e')) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#5c6494'; } }}
          >
            <Icon path={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ padding:'10px 8px 14px', borderTop:'1px solid #e8eaf6' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', marginBottom:4 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#1e1e2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
            <p style={{ fontSize:10, color:'#9fa8c7' }}>Administrator</p>
          </div>
        </div>
        <button onClick={doLogout} style={{
          display:'flex', alignItems:'center', gap:9, width:'100%',
          padding:'7px 10px', borderRadius:8, border:'none', background:'transparent',
          fontSize:13, fontWeight:500, color:'#9fa8c7', cursor:'pointer', transition:'all .12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.color='#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#9fa8c7'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop — always visible, fixed left */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: 220,
        zIndex: 100, display: 'none',
      }} className="adm-desktop-side">
        <SideContent onClose={() => {}} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:200 }} />
          <aside style={{ position:'fixed', top:0, left:0, height:'100vh', width:220, zIndex:201 }}>
            <SideContent onClose={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
