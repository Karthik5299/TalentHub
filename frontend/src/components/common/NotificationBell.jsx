import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent, EVENTS } from '../../context/SocketContext';

const TYPE_ICON = {
  leave_applied:     '✈️',
  leave_approved:    '✅',
  leave_declined:    '❌',
  leave_cancelled:   '🚫',
  payroll_generated: '💰',
  payroll_paid:      '💳',
  clock_in:          '🟢',
  clock_out:         '🔴',
  employee_joined:   '👋',
  password_reset:    '🔑',
  general:           '🔔',
};

const fmtTime = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationBell({ variant = 'admin' }) {
  const navigate  = useNavigate();
  const panelRef  = useRef(null);
  const btnRef    = useRef(null);

  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [animateBell, setAnimateBell] = useState(false);

  const isAdmin = variant === 'admin';

  /* ── Load notifications ─────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/notifications', { params: { limit: 20 } });
      setNotifs(r.data.data.notifications || []);
      setUnread(r.data.data.unreadCount   || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Socket: incoming new notification ─────────────── */
  useSocketEvent(EVENTS.NOTIFICATION_NEW, (data) => {
    const notif = data?.notification;
    if (!notif) return;
    // Prepend to list
    setNotifs(prev => [notif, ...prev].slice(0, 20));
    setUnread(prev => prev + 1);
    // Ring the bell
    setAnimateBell(true);
    setTimeout(() => setAnimateBell(false), 1000);
  }, []);

  /* ── Close panel on outside click ──────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ── Actions ─────────────────────────────────────────── */
  const markRead = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
      } catch {}
    }
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {}
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications/clear-all');
      setNotifs([]);
      setUnread(0);
    } catch {}
  };

  const deleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifs.find(n => n._id === id);
      setNotifs(prev => prev.filter(n => n._id !== id));
      if (removed && !removed.isRead) setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        title="Notifications"
        style={{
          position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
          width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, transition: 'background .15s',
          color: isAdmin ? 'var(--a-t2, #6b7280)' : 'var(--e-t2, #8892b0)',
          animation: animateBell ? 'bellRing .5s ease' : 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.background = isAdmin ? '#f3f4f6' : 'rgba(255,255,255,.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        🔔
        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 999,
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 800, lineHeight: '16px',
            textAlign: 'center', padding: '0 4px',
            border: `2px solid ${isAdmin ? '#fff' : '#0f1117'}`,
            animation: animateBell ? 'popIn .3s var(--spring, cubic-bezier(.34,1.56,.64,1))' : 'none',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed', bottom: 70, left: 10, zIndex: 500,
            width: 340, maxHeight: '70vh',
            background: isAdmin ? '#fff' : '#161b27',
            border: `1px solid ${isAdmin ? '#e8eaf6' : 'rgba(99,102,241,.2)'}`,
            borderRadius: 16,
            boxShadow: isAdmin
              ? '0 20px 60px rgba(0,0,0,.12)'
              : '0 20px 60px rgba(0,0,0,.5), 0 0 40px rgba(99,102,241,.1)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideUpFade .2s ease',
            overflow: 'hidden',
          }}>

          {/* Panel header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: `1px solid ${isAdmin ? '#f0f2ff' : 'rgba(255,255,255,.06)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: isAdmin ? '#1a1a2e' : '#f0f0ff' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${isAdmin ? '#e8eaf6' : 'rgba(255,255,255,.1)'}`,
                  background: 'none', cursor: 'pointer',
                  color: isAdmin ? '#4f52d4' : '#818cf8',
                  transition: 'all .15s',
                }}>Mark all read</button>
              )}
              {notifs.length > 0 && (
                <button onClick={clearAll} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${isAdmin ? '#fecaca' : 'rgba(244,63,94,.2)'}`,
                  background: 'none', cursor: 'pointer',
                  color: '#ef4444', transition: 'all .15s',
                }}>Clear all</button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', margin: '0 auto',
                  border: `2px solid ${isAdmin ? '#e8eaf6' : 'rgba(255,255,255,.1)'}`,
                  borderTopColor: '#4f52d4',
                  animation: 'spin .6s linear infinite',
                }} />
              </div>
            ) : !notifs.length ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔔</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isAdmin ? '#9fa8c7' : '#4a5173' }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: 12, color: isAdmin ? '#c5cae9' : '#3d4466', marginTop: 4 }}>
                  You're all caught up!
                </div>
              </div>
            ) : (
              notifs.map((n, i) => (
                <div
                  key={n._id}
                  onClick={() => markRead(n)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: 11,
                    cursor: n.link ? 'pointer' : 'default',
                    borderBottom: `1px solid ${isAdmin ? '#f8f9ff' : 'rgba(255,255,255,.04)'}`,
                    background: n.isRead
                      ? 'transparent'
                      : isAdmin ? 'rgba(79,82,212,.04)' : 'rgba(99,102,241,.06)',
                    transition: 'background .15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isAdmin ? '#f8f9ff' : 'rgba(255,255,255,.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : (isAdmin ? 'rgba(79,82,212,.04)' : 'rgba(99,102,241,.06)')}
                >
                  {/* Unread dot */}
                  {!n.isRead && (
                    <div style={{
                      position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 5, height: 5, borderRadius: '50%', background: '#4f52d4',
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: isAdmin ? '#f0f2ff' : 'rgba(99,102,241,.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17,
                  }}>
                    {TYPE_ICON[n.type] || '🔔'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: n.isRead ? 500 : 700,
                      color: isAdmin ? '#1a1a2e' : '#f0f0ff',
                      marginBottom: 2, lineHeight: 1.3,
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: isAdmin ? '#6b7280' : '#8892b0',
                      lineHeight: 1.5, marginBottom: 4,
                    }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: isAdmin ? '#c5cae9' : '#3d4466', fontWeight: 500 }}>
                      {fmtTime(n.createdAt)}
                    </div>
                  </div>

                  {/* Delete × */}
                  <button
                    onClick={(e) => deleteOne(e, n._id)}
                    style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 12, color: isAdmin ? '#c5cae9' : '#3d4466',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s', opacity: 0.6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = isAdmin ? '#c5cae9' : '#3d4466'; }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div style={{
              padding: '10px 16px', flexShrink: 0, textAlign: 'center',
              borderTop: `1px solid ${isAdmin ? '#f0f2ff' : 'rgba(255,255,255,.06)'}`,
            }}>
              <span style={{ fontSize: 11, color: isAdmin ? '#9fa8c7' : '#4a5173' }}>
                Showing last {notifs.length} notifications · Auto-deleted after 30 days
              </span>
            </div>
          )}
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes bellRing {
          0%,100%{ transform: rotate(0) }
          20%     { transform: rotate(-20deg) }
          40%     { transform: rotate(20deg) }
          60%     { transform: rotate(-10deg) }
          80%     { transform: rotate(10deg) }
        }
        @keyframes popIn {
          from { transform: scale(0) }
          to   { transform: scale(1) }
        }
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-8px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
