import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSocketEvent, EVENTS } from '../../context/SocketContext';

/* ── Shared UI ── */
const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);

const statusClass = {
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  declined: 'bg-rose-50 text-rose-700 border border-rose-200',
};
const StatusPill = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ${statusClass[status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
    {status}
  </span>
);

const fmt = (d, opts = {}) => d ? new Date(d).toLocaleDateString('en-IN', opts) : '—';
const getDays = (s, e) => (!s || !e) ? 0 : Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;

/* ── Leave type config ── */
const LEAVE_TYPES = [
  { key:'annual',    label:'Annual',    emoji:'🏖️',  color:'bg-blue-50 border-blue-200 text-blue-800',   bar:'bg-blue-500' },
  { key:'sick',      label:'Sick',      emoji:'🤒',  color:'bg-rose-50 border-rose-200 text-rose-800',    bar:'bg-rose-500' },
  { key:'maternity', label:'Maternity', emoji:'👶',  color:'bg-pink-50 border-pink-200 text-pink-800',    bar:'bg-pink-500' },
  { key:'paternity', label:'Paternity', emoji:'👨',  color:'bg-purple-50 border-purple-200 text-purple-800', bar:'bg-purple-500' },
];
const UNLIMITED_TYPES = ['unpaid','other'];

/* ── Balance card for one leave type ── */
function BalanceCard({ type, balance }) {
  const data      = balance?.[type.key] || { allocated:0, used:0, pending:0 };
  const remaining = Math.max(0, data.allocated - data.used - data.pending);
  const pct       = data.allocated > 0 ? Math.min(100, Math.round((data.used / data.allocated) * 100)) : 0;
  const pendingPct= data.allocated > 0 ? Math.min(100 - pct, Math.round((data.pending / data.allocated) * 100)) : 0;

  return (
    <div className={`rounded-2xl border p-4 ${type.color}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{type.emoji}</span>
          <span className="text-xs font-bold uppercase tracking-widest">{type.label}</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black">{remaining}</span>
          <span className="text-xs font-semibold opacity-60 ml-1">/ {data.allocated}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-black/10 overflow-hidden mb-2">
        <div className="h-full flex">
          <div className={`h-full ${type.bar} rounded-l-full transition-all duration-700`} style={{ width:`${pct}%` }} />
          <div className="h-full bg-amber-400 transition-all duration-700" style={{ width:`${pendingPct}%` }} />
        </div>
      </div>

      <div className="flex justify-between text-[10px] font-semibold opacity-60">
        <span>{data.used} used</span>
        {data.pending > 0 && <span className="text-amber-600">{data.pending} pending</span>}
        <span>{remaining} left</span>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function EmpLeaves() {
  const [leaves,  setLeaves]  = useState([]);
  const [balance, setBalance] = useState(null);
  const [busy,    setBusy]    = useState(true);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [year,    setYear]    = useState(new Date().getFullYear());

  const [form, setForm] = useState({ leaveType:'annual', startDate:'', endDate:'', reason:'' });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [lr, br] = await Promise.all([
        api.get('/leaves'),
        api.get('/leaves/balance/me', { params:{ year } }),
      ]);
      setLeaves(lr?.data?.data || []);
      setBalance(br?.data?.data?.balance || null);
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setBusy(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // 🔌 Real-time — update instantly when admin reviews leave
  useSocketEvent(EVENTS.LEAVE_REVIEWED, (data) => {
    toast(`Your ${data?.leave?.leaveType || ''} leave was ${data?.leave?.status}! ✉️`, {
      icon: data?.leave?.status === 'approved' ? '✅' : '❌',
      duration: 5000,
    });
    load(); // reload balance + leave list
  }, [load]);

  // Show remaining for selected leave type
  const selectedRemaining = (() => {
    if (!balance || UNLIMITED_TYPES.includes(form.leaveType)) return null;
    const d = balance[form.leaveType];
    if (!d) return null;
    return Math.max(0, d.allocated - d.used - d.pending);
  })();

  const apply = async () => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) { toast.error('Fill all leave details'); return; }
    setSaving(true);
    try {
      await api.post('/leaves', form);
      toast.success('Leave request submitted! ✈️');
      setModal(false);
      setForm({ leaveType:'annual', startDate:'', endDate:'', reason:'' });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to apply for leave');
    } finally { setSaving(false); }
  };

  const cancelLeave = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try { await api.delete(`/leaves/${id}`); toast.success('Leave cancelled'); load(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to cancel'); }
  };

  const counts = {
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    declined: leaves.filter(l => l.status === 'declined').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Leaves</h1>
          <p className="mt-1 text-sm text-slate-500">Apply for time off and track your leave balance.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setModal(true)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Leave Balance Cards ── */}
      {balance ? (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Leave Balance — {year}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEAVE_TYPES.map(t => <BalanceCard key={t.key} type={t} balance={balance} />)}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle"></span>
            Amber segment = days pending approval
          </p>
        </div>
      ) : busy ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : null}

      {/* ── Leave request summary ── */}
      {!busy && leaves.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Pending',  counts.pending,  'Awaiting review',    'text-amber-600'],
            ['Approved', counts.approved, 'Accepted requests',  'text-emerald-600'],
            ['Declined', counts.declined, 'Not approved',       'text-rose-600'],
          ].map(([title, value, hint, cls]) => (
            <Card key={title} className="p-5 transition hover:-translate-y-1 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
              <p className={`mt-2 text-2xl font-semibold ${cls}`}>{value}</p>
              <p className="mt-1 text-sm text-slate-500">{hint}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Leave list ── */}
      {busy ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100"/>)}</div>
      ) : !leaves.length ? (
        <Card>
          <div className="px-6 py-14 text-center">
            <div className="mb-4 text-4xl">🌴</div>
            <h3 className="text-lg font-semibold text-slate-900">No leave requests yet</h3>
            <p className="mt-2 text-sm text-slate-500">Create your first leave request to get started.</p>
            <button onClick={() => setModal(true)} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition">
              Apply Now
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {leaves.map(lv => (
            <Card key={lv._id || lv.id}>
              <div className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-900 capitalize">{lv.leaveType} Leave</h3>
                      <StatusPill status={lv.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">
                      {fmt(lv.startDate, { day:'numeric', month:'short' })} – {fmt(lv.endDate, { day:'numeric', month:'short', year:'numeric' })}
                      <span className="mx-1.5 text-slate-300">•</span>
                      <span className="font-semibold text-slate-700">{lv.totalDays || getDays(lv.startDate, lv.endDate)} day(s)</span>
                    </p>
                    <p className="mt-2.5 text-sm leading-6 text-slate-600">{lv.reason}</p>
                    {lv.adminNote && (
                      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-700">
                        💬 Admin: {lv.adminNote}
                      </div>
                    )}
                  </div>
                  {lv.status === 'pending' && (
                    <button onClick={() => cancelLeave(lv._id || lv.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition flex-shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Apply Leave Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl" style={{ animation:'fadeUp .25s ease' }}>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Apply for Leave</h3>
                <p className="mt-1 text-sm text-slate-500">Select type and dates. Balance is checked automatically.</p>
              </div>
              <button onClick={() => setModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Leave type */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Leave Type</label>
                  <select
                    value={form.leaveType}
                    onChange={e => setForm(f => ({ ...f, leaveType:e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400">
                    {['annual','sick','maternity','paternity','unpaid','other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Duration / balance preview */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Duration</p>
                  <p className="text-2xl font-semibold text-slate-900">{getDays(form.startDate, form.endDate)} day(s)</p>
                  {selectedRemaining !== null && (
                    <p className={`text-xs font-semibold mt-1 ${getDays(form.startDate, form.endDate) > selectedRemaining ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {selectedRemaining} {form.leaveType} days remaining
                    </p>
                  )}
                </div>

                {/* Dates */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Start Date</label>
                  <input type="date" value={form.startDate} min={new Date().toISOString().slice(0,10)}
                    onChange={e => setForm(f => ({ ...f, startDate:e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"/>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">End Date</label>
                  <input type="date" value={form.endDate} min={form.startDate || new Date().toISOString().slice(0,10)}
                    onChange={e => setForm(f => ({ ...f, endDate:e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"/>
                </div>
              </div>

              {/* Insufficient balance warning */}
              {selectedRemaining !== null && getDays(form.startDate, form.endDate) > selectedRemaining && getDays(form.startDate, form.endDate) > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex gap-2">
                  ⚠️ You only have <strong>{selectedRemaining}</strong> {form.leaveType} leave days remaining. This request will be rejected.
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Reason</label>
                <textarea rows={3} placeholder="Briefly explain the reason for your leave request"
                  value={form.reason} onChange={e => setForm(f => ({ ...f, reason:e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 resize-none"/>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <button onClick={() => setModal(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={apply} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition">
                  {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      )}
    </div>
  );
}
