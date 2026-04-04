import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!email || !pass) { 
      toast.error('Please enter email and password'); 
      return; 
    }
    setBusy(true);
    try {
      const u = await login(email, pass);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}! 🎉`);

      // NEW: Check if user must change password first
      if (u.mustChangePassword) {
        toast('Please change your temporary password first.', {
          icon: '🔐',
          style: {
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            color: '#92400e',
            border: '1px solid #f59e0b'
          }
        });
        nav('/change-password', { replace: true });
        return;
      }

      // Normal redirect based on role
      nav(u.role === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Animated background ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Moving gradient orbs */}
        <div style={{ position: 'absolute', width: 700, height: 700, top: '-20%', left: '-15%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.08) 0%,rgba(59,130,246,.05) 65%,transparent 70%)', animation: 'drift1 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, bottom: '-15%', right: '-10%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,.06) 0%,rgba(249,115,22,.04) 65%,transparent 70%)', animation: 'drift2 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, top: '30%', right: '25%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.05) 0%,rgba(34,197,94,.03) 65%,transparent 70%)', animation: 'drift3 14s ease-in-out infinite' }} />
        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.02) 1px,transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)' }} />
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
            height: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
            borderRadius: '50%',
            background: i % 4 === 0 ? '#6366f1' : i % 4 === 1 ? '#ec4899' : i % 4 === 2 ? '#06b6d4' : '#a78bfa',
            opacity: 0.4,
            left: `${8 + (i * 7.8)}%`,
            top: `${15 + ((i * 37) % 70)}%`,
            animation: `particle ${5 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>

      {/* ── Left branding panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateX(0)' : 'translateX(-40px)',
        transition: 'opacity .8s ease, transform .8s ease',
      }} className="hide-m">

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 60,
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity .7s ease .1s, transform .7s ease .1s',
        }}>
          <div style={{ width: 50, height: 50, borderRadius: 15, background: 'linear-gradient(135deg,#6366f1,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(99,102,241,.3)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -1, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#ec4899)', filter: 'blur(8px)', opacity: .4 }} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2.5"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em' }}>TalentHub</div>
            <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>HR Platform</div>
          </div>
        </div>

        {/* Headline - staggered word animation */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{
            fontSize: 'clamp(38px,4vw,58px)', fontWeight: 800, lineHeight: 1.08,
            letterSpacing: '-.03em', marginBottom: 0,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity .7s ease .2s, transform .7s ease .2s',
          }}>
            <span style={{ display: 'block', color: '#1e293b' }}>Your workforce,</span>
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg,#818cf8 0%,#ec4899 50%,#06b6d4 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: mounted ? 'gradientShift 4s ease infinite' : 'none',
            }}>
              one platform.
            </span>
          </h1>
        </div>

        <p style={{
          fontSize: 16, color: '#64748b', lineHeight: 1.75, maxWidth: 380,
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity .7s ease .35s, transform .7s ease .35s',
        }}>
          Manage employees, attendance, leaves, and payroll in one place. Sign in to access your portal.
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 36,
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity .7s ease .45s, transform .7s ease .45s',
        }}>
          {[
            { label: 'Attendance Tracking', color: '#6366f1' },
            { label: 'Payroll Management', color: '#ec4899' },
            { label: 'Leave Approvals', color: '#06b6d4' },
            { label: 'Emergency Contacts', color: '#a78bfa' },
          ].map((f, i) => (
            <div key={f.label} style={{
              padding: '8px 16px', borderRadius: 999,
              border: `1px solid ${f.color}20`,
              background: `${f.color}08`,
              fontSize: 13, color: f.color, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .2s',
              cursor: 'default',
              animationDelay: `${.55 + i * .08}s`,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${f.color}15`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${f.color}25`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${f.color}08`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, boxShadow: `0 0 8px ${f.color}50` }} />
              {f.label}
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 32, marginTop: 48,
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity .7s ease .6s, transform .7s ease .6s',
        }}>
          {[['Modules', '8'], ['Routes', '47+'], ['Role-based', '✓']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1', letterSpacing: '-.02em', fontFamily: "'DM Mono', monospace" }}>{v}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right login card ── */}
      <div style={{
        width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 28, position: 'relative', zIndex: 1, flexShrink: 0,
      }}>
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,.92)',
          border: '1px solid rgba(226,232,240,.6)',
          borderRadius: 28,
          padding: '48px 44px',
          backdropFilter: 'blur(32px) saturate(180%)',
          boxShadow: '0 20px 40px rgba(0,0,0,.08), 0 0 0 1px rgba(255,255,255,.3), inset 0 1px 0 rgba(255,255,255,.8)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(40px) scale(.96)',
          transition: 'opacity .7s cubic-bezier(0.34,1.56,0.64,1) .15s, transform .7s cubic-bezier(0.34,1.56,0.64,1) .15s',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Card inner glow */}
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 300, height: 160, background: 'radial-gradient(ellipse,rgba(99,102,241,.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

          {/* Mobile logo */}
          <div style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 28 }} className="show-m-flex">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2.5"/></svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>TalentHub</span>
          </div>

          {/* Header */}
          <div style={{
            marginBottom: 36,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity .6s ease .4s, transform .6s ease .4s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,.3)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#fff" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, letterSpacing: '.04em' }}>SECURE LOGIN</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 6, letterSpacing: '-.02em' }}>
              Sign in
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              Use your credentials — you'll be redirected to your portal automatically.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email field */}
            <div style={{
              opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'opacity .5s ease .5s, transform .5s ease .5s',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#475569' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#6366f1" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="#6366f1" strokeWidth="2"/></svg>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoComplete="email" autoFocus
                style={{
                  width: '100%', padding: '13px 16px', outline: 'none',
                  border: '1px solid rgba(226,232,240,.8)', borderRadius: 14,
                  background: 'rgba(255,255,255,.7)', color: '#1e293b',
                  fontSize: 14, fontFamily: 'inherit', transition: 'all .2s',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,.04)',
                }}
                onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.background = 'rgba(255,255,255,.9)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.15), inset 0 1px 3px rgba(0,0,0,.04)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(226,232,240,.8)'; e.target.style.background = 'rgba(255,255,255,.7)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,.04)'; }}
              />
            </div>

            {/* Password field */}
            <div style={{
              opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'opacity .5s ease .6s, transform .5s ease .6s',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#475569' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#6366f1" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/></svg>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{
                    width: '100%', padding: '13px 46px 13px 16px', outline: 'none',
                    border: '1px solid rgba(226,232,240,.8)', borderRadius: 14,
                    background: 'rgba(255,255,255,.7)', color: '#1e293b',
                    fontSize: 14, fontFamily: 'inherit', transition: 'all .2s',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,.04)',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.background = 'rgba(255,255,255,.9)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.15), inset 0 1px 3px rgba(0,0,0,.04)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(226,232,240,.8)'; e.target.style.background = 'rgba(255,255,255,.7)'; e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,.04)'; }}
                />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', lineHeight: 1, padding: 2, transition: 'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                  {show ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit" disabled={busy}
              style={{
                marginTop: 4, width: '100%', padding: '15px',
                border: 'none', borderRadius: 14,
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                background: busy
                  ? 'rgba(99,102,241,.4)'
                  : 'linear-gradient(135deg,#6366f1 0%,#818cf8 50%,#ec4899 100%)',
                backgroundSize: '200% 200%',
                color: '#fff',
                boxShadow: busy ? 'none' : '0 4px 24px rgba(99,102,241,.4)',
                transition: 'all .3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                animation: busy ? 'none' : 'gradientShift 3s ease infinite',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(10px)',
              }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = busy ? 'none' : '0 4px 24px rgba(99,102,241,.4)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0) scale(.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1)'; }}
            >
              {busy
                ? <><div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite' }} /> Signing in…</>
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Sign In</>
              }
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin           { to { transform: rotate(360deg); } }
        @keyframes drift1         { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.05); } 66% { transform: translate(-20px,20px) scale(.95); } }
        @keyframes drift2         { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-30px,40px) scale(1.08); } 66% { transform: translate(20px,-20px) scale(.92); } }
        @keyframes drift3         { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,30px); } }
        @keyframes particle       { 0%,100% { transform: translateY(0) scale(1); opacity: .4; } 50% { transform: translateY(-20px) scale(1.3); opacity: .7; } }
        @keyframes gradientShift  { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        input::placeholder { color: #94a3b8; }
        @media (max-width: 768px) {
          .hide-m       { display: none !important; }
          .show-m-flex  { display: flex !important; }
        }
      `}</style>
    </div>
  );
}