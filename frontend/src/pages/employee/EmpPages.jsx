import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Tiny reusable pieces ── */
const Badge = ({ status }) => {
  const map = {
    present: 'badge-success', late: 'badge-warning', absent: 'badge-error',
    approved: 'badge-success', pending: 'badge-warning', declined: 'badge-error',
    paid: 'badge-success', generated: 'badge-info', active: 'badge-success',
    inactive: 'badge-warning', terminated: 'badge-error',
  };
  return <span className={`badge badge-sm ${map[status] || 'badge-ghost'} font-mono`}>{status}</span>;
};

const Loader = () => (
  <div className="flex flex-col gap-3 mt-2">
    {[100, 80, 90].map(w => (
      <div key={w} className="h-4 rounded-lg bg-base-300 animate-pulse" style={{ width: `${w}%` }} />
    ))}
  </div>
);

const Empty = ({ icon, title, sub, action }) => (
  <div className="card bg-base-100 border border-base-300">
    <div className="card-body items-center text-center py-16">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-base-content">{title}</h3>
      {sub && <p className="text-sm text-base-content/50 mt-1">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  </div>
);

const PageHeader = ({ title, sub, badge, action }) => (
  <div className="flex items-start justify-between gap-4 mb-8 flex-wrap animate-fade-up">
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <h1 className="text-2xl font-extrabold text-base-content tracking-tight">{title}</h1>
        {badge && <span className="badge badge-primary badge-sm">{badge}</span>}
      </div>
      {sub && <p className="text-sm text-base-content/50">{sub}</p>}
    </div>
    {action}
  </div>
);

const StatCard = ({ icon, label, value, color = 'primary', delay = 'a1' }) => (
  <div className={`card bg-base-100 border border-base-300 lift animate-fade-up ${delay}`}>
    <div className="card-body p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <div className={`w-2 h-2 rounded-full bg-${color} animate-pulse`} />
      </div>
      <p className={`text-2xl font-black font-mono text-${color} leading-none mb-1`}>{value}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">{label}</p>
    </div>
  </div>
);

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
export function EmpDashboard() {
  const { user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [todayRec, setTodayRec] = useState(null);
  const [leaves,   setLeaves]   = useState([]);
  const [time,     setTime]     = useState(new Date());
  const [busy,     setBusy]     = useState(true);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try {
        const reqs = [api.get('/attendance/today'), api.get('/leaves')];
        if (user?.employeeId) reqs.unshift(api.get('/employees/me'));
        const res = await Promise.all(reqs);
        if (user?.employeeId) {
          const d = res[0].data.data; setProfile(d?.employee || d || null);
          const myRec = res[1].data.data?.records?.find(r => String(r.employee?._id || r.employee) === String(user.employeeId));
          setTodayRec(myRec || null);
          setLeaves((res[2].data.data || []).slice(0, 4));
        } else {
          setLeaves((res[1].data.data || []).slice(0, 4));
        }
      } catch (e) { console.error(e); }
      finally { setBusy(false); }
    };
    load();
  }, [user]);

  const hr = time.getHours();
  const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const fmt = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8 animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">{greet} 👋</p>
        <h1 className="text-3xl font-black text-base-content tracking-tight mb-1">
          {user?.name?.split(' ')[0]}{' '}
          <span className="grad-text">✦</span>
        </h1>
        {profile && <p className="text-sm text-base-content/50">{profile.position} · {profile.department?.name}</p>}
      </div>

      {/* Clock + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Clock card */}
        <div className="card bg-base-100 border border-base-300 lift animate-fade-up a2">
          <div className="card-body p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-3">Current Time</p>
            <p className="clock-text font-mono font-black leading-none mb-2" style={{ fontSize: 'clamp(36px,8vw,52px)' }}>
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-base-content/40 font-mono mb-4">
              {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {/* Seconds bar */}
            <div className="seconds-bar"><div className="seconds-fill" style={{ width: `${(time.getSeconds() / 60) * 100}%` }} /></div>
          </div>
        </div>

        {/* Today status */}
        <div className="card bg-base-100 border border-base-300 lift animate-fade-up a3">
          <div className="card-body p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-4">Today</p>
            {busy ? <Loader /> : !todayRec ? (
              <div className="text-center py-2">
                <div className="text-3xl mb-3">🟡</div>
                <p className="text-sm text-base-content/50 mb-3">Not clocked in yet</p>
                <a href="/employee/attendance" className="btn btn-primary btn-xs">Clock In →</a>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge status={todayRec.status} />
                <div className="divider my-2" />
                {[['In', fmt(todayRec.clockIn)], ['Out', fmt(todayRec.clockOut) || '–'], ['Hours', todayRec.workHours ? `${todayRec.workHours}h` : '–']].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center">
                    <span className="text-xs text-base-content/40 font-semibold uppercase tracking-wide">{l}</span>
                    <span className="text-sm font-bold font-mono text-base-content">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat pills */}
      {profile && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard icon="💰" label="Salary / mo" value={`₹${Number(profile.salary).toLocaleString('en-IN')}`} color="success" delay="a1" />
          <StatCard icon="🪪" label="Employee Code" value={profile.employeeCode} color="primary" delay="a2" />
          <StatCard icon="🏢" label="Department" value={profile.department?.name || '–'} color="secondary" delay="a3" />
          <StatCard icon="📅" label="Joined" value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '–'} color="accent" delay="a4" />
        </div>
      )}

      {/* Recent leaves */}
      <div className="animate-fade-up a5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-base-content">Recent Leaves</h2>
          <a href="/employee/leaves" className="text-xs text-primary font-semibold hover:underline">View all →</a>
        </div>
        {busy ? <Loader /> : !leaves.length ? (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body items-center py-10">
              <span className="text-3xl mb-2">✈️</span>
              <p className="text-sm text-base-content/40">No leave records yet</p>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 border border-base-300 overflow-hidden">
            <table className="table table-sm">
              <thead><tr><th>Type</th><th>Period</th><th>Days</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(lv => (
                  <tr key={lv._id} className="hover">
                    <td className="font-medium capitalize">{lv.leaveType}</td>
                    <td className="font-mono text-xs text-base-content/50">{new Date(lv.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(lv.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="font-mono font-bold text-base-content">{lv.totalDays}d</td>
                    <td><Badge status={lv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   ATTENDANCE
════════════════════════════════════════ */
export function EmpAttendance() {
  const { user } = useAuth();
  const [todayRec, setTodayRec] = useState(null);
  const [history,  setHistory]  = useState([]);
  const [busy,     setBusy]     = useState(true);
  const [clk,      setClk]      = useState(false);
  const [time,     setTime]     = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [t, h] = await Promise.all([api.get('/attendance/today'), api.get('/attendance/history', { params: { limit: 30 } })]);
      const myRec = t.data.data?.records?.find(r => String(r.employee?._id || r.employee) === String(user?.employeeId));
      setTodayRec(myRec || null);
      setHistory(h.data.data || []);
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const clockIn = async () => {
    if (!user?.employeeId) { toast.error('Account not linked to employee. Contact admin.'); return; }
    setClk(true);
    try { await api.post('/attendance/clock-in', {}); toast.success('Clocked in! Have a great day 🌟'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setClk(false); }
  };

  const clockOut = async () => {
    setClk(true);
    try { await api.post('/attendance/clock-out', {}); toast.success('Clocked out! Rest well 👋'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setClk(false); }
  };

  const fmt = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '–';
  const canIn  = !todayRec?.clockIn;
  const canOut = !!(todayRec?.clockIn && !todayRec?.clockOut);

  return (
    <div>
      <PageHeader title="Attendance" sub="Track your daily presence and work hours" />

      {/* Clock panel */}
      <div className="card bg-base-100 border border-base-300 mb-6 overflow-hidden animate-fade-up a1">
        {/* Top gradient strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent" />
        <div className="card-body p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-4">
            {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Big clock */}
          <p className="clock-text font-mono font-black leading-none mb-2" style={{ fontSize: 'clamp(52px,12vw,80px)' }}>
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <div className="seconds-bar w-32 mx-auto mb-8">
            <div className="seconds-fill" style={{ width: `${(time.getSeconds() / 60) * 100}%` }} />
          </div>

          {/* Today stats */}
          {todayRec && (
            <div className="flex justify-center gap-6 mb-8 flex-wrap">
              {[['Clock In', fmt(todayRec.clockIn), 'text-success'], ['Clock Out', fmt(todayRec.clockOut), 'text-base-content'], ['Hours', todayRec.workHours ? `${todayRec.workHours}h` : '–', 'text-primary']].map(([l, v, c]) => (
                <div key={l} className="text-center px-4">
                  <p className={`text-lg font-black font-mono ${c}`}>{v}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mt-1">{l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={clockIn} disabled={!canIn || clk}
              className="btn btn-primary btn-wide gap-2 rounded-full"
              style={{ opacity: canIn && !clk ? 1 : .35 }}>
              {clk ? <span className="spinner" /> : <span className="text-base">🟢</span>}
              Clock In
            </button>
            <button onClick={clockOut} disabled={!canOut || clk}
              className="btn btn-outline btn-wide gap-2 rounded-full"
              style={{ opacity: canOut && !clk ? 1 : .35 }}>
              {clk ? <span className="spinner" /> : <span className="text-base">🔴</span>}
              Clock Out
            </button>
          </div>

          {!user?.employeeId && (
            <div className="alert alert-warning mt-6 text-sm justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Account not linked to employee record. Contact admin.
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="animate-fade-up a3">
        <h2 className="text-sm font-bold text-base-content mb-4">History</h2>
        {busy ? <Loader /> : !history.length
          ? <Empty icon="📋" title="No records yet" sub="Your attendance history will appear here" />
          : (
            <div className="card bg-base-100 border border-base-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th>Hours</th></tr></thead>
                  <tbody>
                    {history.map((r, i) => (
                      <tr key={r._id} className={`hover animate-fade-up`} style={{ animationDelay: `${i * 0.03}s` }}>
                        <td className="font-mono text-xs text-base-content/60">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td><Badge status={r.status} /></td>
                        <td className="font-mono text-xs text-success font-semibold">{fmt(r.clockIn)}</td>
                        <td className="font-mono text-xs text-base-content/50">{fmt(r.clockOut)}</td>
                        <td className="font-mono text-xs text-primary font-bold">{r.workHours ? `${r.workHours}h` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LEAVES
════════════════════════════════════════ */
export function EmpLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [busy,   setBusy]   = useState(true);
  const [modal,  setModal]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });

  const load = useCallback(async () => {
    setBusy(true);
    try { const r = await api.get('/leaves'); setLeaves(r.data.data || []); }
    catch { toast.error('Failed to load'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async () => {
    if (!form.startDate || !form.endDate || !form.reason) { toast.error('Fill all fields'); return; }
    setSaving(true);
    try { await api.post('/leaves', form); toast.success('Leave submitted! ✈️'); setModal(false); setForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '' }); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const cancel = async id => {
    if (!window.confirm('Cancel this leave?')) return;
    try { await api.delete(`/leaves/${id}`); toast.success('Cancelled'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const counts = { pending: leaves.filter(l => l.status === 'pending').length, approved: leaves.filter(l => l.status === 'approved').length, declined: leaves.filter(l => l.status === 'declined').length };
  const dur = (s, e) => s && e && new Date(e) >= new Date(s) ? Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1 : 0;

  return (
    <div>
      <PageHeader
        title="My Leaves"
        sub="Apply and track time off requests"
        action={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm rounded-full gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Apply
          </button>
        }
      />

      {/* Summary stats */}
      {!busy && !!leaves.length && (
        <div className="stats shadow-sm bg-base-100 border border-base-300 w-full mb-6 animate-fade-up">
          {[
            { label: 'Pending',  val: counts.pending,  cls: 'text-warning' },
            { label: 'Approved', val: counts.approved, cls: 'text-success' },
            { label: 'Declined', val: counts.declined, cls: 'text-error' },
          ].map(s => (
            <div key={s.label} className="stat py-4 px-6">
              <div className="stat-title text-xs">{s.label}</div>
              <div className={`stat-value text-2xl font-black font-mono ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Leave list */}
      {busy ? <Loader /> : !leaves.length
        ? <Empty icon="✈️" title="No leaves yet" sub="Apply for your first leave" action={<button onClick={() => setModal(true)} className="btn btn-primary btn-sm rounded-full">Apply Now</button>} />
        : (
          <div className="space-y-3">
            {leaves.map((lv, i) => (
              <div key={lv._id} className={`card bg-base-100 border border-base-300 lift animate-fade-up`} style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="card-body p-5 flex-row items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <span className="font-bold text-base-content capitalize">{lv.leaveType} Leave</span>
                      <Badge status={lv.status} />
                    </div>
                    <p className="text-xs font-mono text-base-content/50 mb-1">
                      {new Date(lv.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {new Date(lv.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="ml-2 badge badge-ghost badge-sm font-mono">{lv.totalDays}d</span>
                    </p>
                    <p className="text-sm text-base-content/50 mt-1.5 leading-relaxed">{lv.reason}</p>
                    {lv.adminNote && <div className="mt-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-1.5 inline-block">💬 {lv.adminNote}</div>}
                  </div>
                  {lv.status === 'pending' && (
                    <button onClick={() => cancel(lv._id)} className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10 flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Apply modal */}
      {modal && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-md animate-scale-in">
            <button onClick={() => setModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
            <h3 className="font-bold text-lg mb-1">Apply for Leave</h3>
            <p className="text-sm text-base-content/50 mb-6">Fill in the details below</p>

            <div className="space-y-4">
              <div>
                <label className="label py-1"><span className="label-text text-xs font-semibold uppercase tracking-wide">Leave Type</span></label>
                <select className="select select-bordered select-sm w-full" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                  {'annual,sick,maternity,paternity,unpaid,other'.split(',').map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label py-1"><span className="label-text text-xs font-semibold uppercase tracking-wide">Start *</span></label>
                  <input type="date" className="input input-bordered input-sm w-full font-mono" value={form.startDate} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label py-1"><span className="label-text text-xs font-semibold uppercase tracking-wide">End *</span></label>
                  <input type="date" className="input input-bordered input-sm w-full font-mono" value={form.endDate} min={form.startDate || new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>

              {dur(form.startDate, form.endDate) > 0 && (
                <div className="alert alert-info py-2.5 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Duration: <strong>{dur(form.startDate, form.endDate)} day(s)</strong>
                </div>
              )}

              <div>
                <label className="label py-1"><span className="label-text text-xs font-semibold uppercase tracking-wide">Reason *</span></label>
                <textarea className="textarea textarea-bordered w-full text-sm leading-relaxed" rows={3} placeholder="Briefly describe the reason…" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div className="modal-action mt-6">
              <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm rounded-full">Cancel</button>
              <button onClick={apply} disabled={saving} className="btn btn-primary btn-sm rounded-full gap-2">
                {saving ? <><span className="spinner" /> Submitting…</> : 'Submit Application'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModal(false)} />
        </dialog>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   PAYSLIPS
════════════════════════════════════════ */
export function EmpPayslips() {
  const { user } = useAuth();
  const [slips,    setSlips]    = useState([]);
  const [busy,     setBusy]     = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try { const r = await api.get('/payroll/me'); setSlips(r.data.data || []); }
      catch (e) { if (e.response?.status !== 400) console.error(e); }
      finally { setBusy(false); }
    };
    load();
  }, [user]);

  const M = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div>
      <PageHeader title="Payslips" sub="Monthly salary breakdown and payment history" />

      {!user?.employeeId ? (
        <div className="alert alert-warning"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Account not linked. Contact admin.</div>
      ) : busy ? <Loader />
      : !slips.length ? <Empty icon="💰" title="No payslips yet" sub="Payroll is generated by admin monthly" />
      : (
        <div className="space-y-3">
          {slips.map((ps, i) => (
            <div key={ps._id} className={`card bg-base-100 border border-base-300 lift overflow-hidden animate-fade-up`} style={{ animationDelay: `${i * 0.06}s` }}>
              {/* Top accent */}
              <div className={`h-0.5 w-full ${ps.status === 'paid' ? 'bg-success' : 'bg-warning'}`} />

              {/* Header row — click to expand */}
              <div className="card-body p-5 flex-row items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === ps._id ? null : ps._id)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${ps.status === 'paid' ? 'bg-success/10' : 'bg-warning/10'}`}>
                  {ps.status === 'paid' ? '✅' : '⏳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base-content">{M[ps.month]} {ps.year}</p>
                  <p className="text-xs font-mono text-base-content/40 mt-0.5">{ps.presentDays}/{ps.workingDays} days · <Badge status={ps.status} /></p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black font-mono text-success">₹{Number(ps.netSalary || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-base-content/40 uppercase tracking-wide mt-0.5">Net Take Home {expanded === ps._id ? '▴' : '▾'}</p>
                </div>
              </div>

              {/* Breakdown */}
              {expanded === ps._id && (
                <div className="px-5 pb-5 animate-fade-up">
                  <div className="divider my-0 mb-4" />
                  <div className="grid grid-cols-2 gap-4">
                    {/* Earnings */}
                    <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-success mb-3">📈 Earnings</p>
                      {[['Basic', ps.basicSalary], ['HRA', ps.hra], ['Travel', ps.travelAllowance], ['Medical', ps.medicalAllowance], ['Bonus', ps.bonus]].filter(([, v]) => v > 0).map(([l, v]) => (
                        <div key={l} className="flex justify-between mb-2">
                          <span className="text-xs text-base-content/50">{l}</span>
                          <span className="text-xs font-mono font-semibold text-base-content">₹{Number(v).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="border-t border-success/20 mt-2 pt-2 flex justify-between">
                        <span className="text-xs font-bold text-base-content">Gross</span>
                        <span className="text-sm font-black font-mono text-success">₹{Number(ps.grossSalary).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="bg-error/5 border border-error/20 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-error mb-3">📉 Deductions</p>
                      {[['PF 12%', ps.pfDeduction], ['ESI', ps.esiDeduction], ['TDS', ps.taxDeduction], ['Late Penalty', ps.leaveDeduction]].filter(([, v]) => v > 0).map(([l, v]) => (
                        <div key={l} className="flex justify-between mb-2">
                          <span className="text-xs text-base-content/50">{l}</span>
                          <span className="text-xs font-mono font-semibold text-error">-₹{Number(v).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="border-t border-error/20 mt-2 pt-2 flex justify-between">
                        <span className="text-xs font-bold text-base-content">Net Pay</span>
                        <span className="text-sm font-black font-mono text-success">₹{Number(ps.netSalary).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   PROFILE
════════════════════════════════════════ */
export function EmpProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [kin,     setKin]     = useState(null);
  const [busy,    setBusy]    = useState(true);
  const [pwModal, setPwModal] = useState(false);
  const [pf,      setPf]      = useState({ currentPassword: '', newPassword: '' });
  const [saving,  setSaving]  = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try {
        const [p, k] = await Promise.all([api.get('/employees/me/profile'), api.get('/kin/me').catch(() => null)]);
        setProfile(p.data.data || null);
        setKin(k?.data?.data?.kin || null);
      } catch (e) { console.error(e); }
      finally { setBusy(false); }
    };
    load();
  }, [user]);

  const changePw = async () => {
    if (!pf.currentPassword || !pf.newPassword) { toast.error('Fill both fields'); return; }
    setSaving(true);
    try { await api.put('/auth/change-password', pf); toast.success('Password changed! Please log in again.'); setPwModal(false); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const emp = profile?.employee;

  return (
    <div>
      <PageHeader title="Profile" sub="Your personal and employment details" action={
        <button onClick={() => setPwModal(true)} className="btn btn-outline btn-sm rounded-full gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Change Password
        </button>
      } />

      {busy ? <div className="flex flex-col gap-4"><div className="h-32 rounded-2xl bg-base-300 animate-pulse" /><div className="h-48 rounded-2xl bg-base-300 animate-pulse" /></div>
      : !emp ? <Empty icon="⚠️" title="Account not linked" sub="Contact your admin to link your account to an employee record." action={<button onClick={() => setPwModal(true)} className="btn btn-outline btn-sm rounded-full">Change Password</button>} />
      : (
        <div className="space-y-4">
          {/* Hero card */}
          <div className="card bg-base-100 border border-base-300 overflow-hidden animate-fade-up a1">
            {/* Banner */}
            <div className="h-16 bg-gradient-to-r from-primary/80 via-secondary/80 to-accent/80" />
            <div className="card-body px-6 pb-6 pt-0">
              <div className="flex items-end gap-4 -mt-7 mb-4 flex-wrap">
                <div className="avatar placeholder">
                  <div className="w-14 rounded-full ring ring-base-100 ring-offset-0 bg-primary text-primary-content">
                    <span className="text-lg font-black">{emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}</span>
                  </div>
                </div>
                <div className="pb-1">
                  <h2 className="text-xl font-black text-base-content tracking-tight">{emp.firstName} {emp.lastName}</h2>
                  <p className="text-sm text-base-content/50">{emp.position} · {emp.department?.name}</p>
                </div>
                <div className="flex gap-2 pb-1 flex-wrap">
                  <Badge status={emp.status} />
                  <span className="badge badge-outline badge-sm font-mono">{emp.employeeCode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal info */}
            <div className="card bg-base-100 border border-base-300 animate-fade-up a2">
              <div className="card-body p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Personal Info</h3>
                <div className="space-y-3">
                  {[['Email', emp.email, '📧'], ['Phone', emp.phone || '–', '📱'], ['Salary', `₹${Number(emp.salary).toLocaleString('en-IN')}/mo`, '💰'], ['Joined', emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '–', '📅']].map(([l, v, icon]) => (
                    <div key={l} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-base-200 transition-colors">
                      <span className="text-base flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/40">{l}</p>
                        <p className="text-sm font-semibold font-mono text-base-content truncate">{v}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* This month */}
            <div className="card bg-base-100 border border-base-300 animate-fade-up a3">
              <div className="card-body p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">This Month</h3>
                <div className="space-y-2">
                  {[
                    ['Present',    profile.thisMonthAttendance?.present   ?? '–', 'text-success'],
                    ['Absent',     profile.thisMonthAttendance?.absent    ?? '–', 'text-error'],
                    ['Late',       profile.thisMonthAttendance?.late      ?? '–', 'text-warning'],
                    ['Total Hours', profile.thisMonthAttendance?.totalHours ? `${profile.thisMonthAttendance.totalHours}h` : '–', 'text-accent'],
                  ].map(([l, v, c]) => (
                    <div key={l} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-base-200 transition-colors">
                      <span className="text-sm text-base-content/60 font-medium">{l}</span>
                      <span className={`text-lg font-black font-mono ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency contact */}
          {kin && (
            <div className="card bg-base-100 border border-base-300 animate-fade-up a4">
              <div className="card-body p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-error mb-4">Emergency Contact</h3>
                <div className="flex items-center gap-4 p-3 bg-error/5 border border-error/15 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-2xl flex-shrink-0">❤️</div>
                  <div>
                    <p className="font-bold text-base-content">{kin.name}</p>
                    <p className="text-sm text-base-content/50 capitalize">{kin.relationship}</p>
                    <p className="text-xs font-mono text-base-content/40 mt-0.5">{kin.phone}{kin.email ? ` · ${kin.email}` : ''}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change password modal */}
      {pwModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-sm animate-scale-in">
            <button onClick={() => setPwModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
            <h3 className="font-bold text-lg mb-1">Change Password</h3>
            <p className="text-sm text-base-content/50 mb-6">Choose a strong, unique password</p>
            <div className="space-y-4">
              {[
                { label: 'Current Password', key: 'currentPassword', show: showCur, toggle: () => setShowCur(s => !s) },
                { label: 'New Password',     key: 'newPassword',     show: showNew, toggle: () => setShowNew(s => !s), hint: 'Min 8 chars, upper + lower + number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label py-1"><span className="label-text text-xs font-semibold uppercase tracking-wide">{f.label}</span></label>
                  <div className="relative">
                    <input type={f.show ? 'text' : 'password'} className="input input-bordered input-sm w-full font-mono pr-10" placeholder="••••••••" value={pf[f.key]} onChange={e => setPf(p => ({ ...p, [f.key]: e.target.value }))} />
                    <button type="button" onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content text-sm">{f.show ? '🙈' : '👁'}</button>
                  </div>
                  {f.hint && <p className="text-xs text-base-content/40 mt-1">💡 {f.hint}</p>}
                </div>
              ))}
            </div>
            <div className="modal-action mt-6">
              <button onClick={() => setPwModal(false)} className="btn btn-ghost btn-sm rounded-full">Cancel</button>
              <button onClick={changePw} disabled={saving} className="btn btn-primary btn-sm rounded-full gap-2">
                {saving ? <><span className="spinner" /> Saving…</> : '🔒 Update Password'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setPwModal(false)} />
        </dialog>
      )}
    </div>
  );
}
