import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, EVENTS } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const formatDate = (date, options = {}) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', options);
};

const formatTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusClass = {
  present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border border-amber-200',
  absent: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ${
      statusClass[String(status).toLowerCase()] ||
      'bg-slate-100 text-slate-700 border border-slate-200'
    }`}
  >
    {status || 'unknown'}
  </span>
);

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const Loader = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
    ))}
  </div>
);

export default function EmpAttendance() {
  const { user } = useAuth();
  const [todayRec, setTodayRec] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(true);
  const [clk, setClk] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [t, h] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/history', { params: { limit: 30 } }),
      ]);

      const myRec =
        t?.data?.data?.records?.find(
          (r) => String(r.employee?.id || r.employee) === String(user?.employeeId)
        ) || null;

      setTodayRec(myRec);
      setHistory(h?.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // 🔌 Real-time — if admin clocks employee in/out remotely, update immediately
  useSocketEvent(EVENTS.CLOCK_IN,  () => load(), [load]);
  useSocketEvent(EVENTS.CLOCK_OUT, () => load(), [load]);

  const clockIn = async () => {
    if (!user?.employeeId) {
      toast.error('Account not linked to employee. Contact admin.');
      return;
    }
    setClk(true);
    try {
      await api.post('/attendance/clock-in');
      toast.success('Clocked in successfully');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to clock in');
    } finally {
      setClk(false);
    }
  };

  const clockOut = async () => {
    setClk(true);
    try {
      await api.post('/attendance/clock-out');
      toast.success('Clocked out successfully');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to clock out');
    } finally {
      setClk(false);
    }
  };

  const canIn = !todayRec?.clockIn;
  const canOut = !!todayRec?.clockIn && !todayRec?.clockOut;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your workday, live timing, and attendance history.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Today</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              {time.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {time.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-700"
                style={{ width: `${(time.getSeconds() / 60) * 100}%` }}
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={clockIn}
                disabled={!canIn || clk}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {clk ? 'Please wait...' : 'Clock in'}
              </button>
              <button
                onClick={clockOut}
                disabled={!canOut || clk}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {clk ? 'Please wait...' : 'Clock out'}
              </button>
            </div>

            {!user?.employeeId && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Your account is not linked to an employee record. Contact admin.
              </div>
            )}
          </div>

          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Live status</p>

            {busy ? (
              <div className="mt-4">
                <Loader rows={3} />
              </div>
            ) : !todayRec ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="text-base font-medium text-slate-900">No check-in recorded</p>
                <p className="mt-1 text-sm text-slate-500">Start your workday by clocking in.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <StatusPill status={todayRec.status} />
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="text-sm text-slate-500">Clock in</span>
                  <span className="text-sm font-medium text-slate-900">{formatTime(todayRec.clockIn)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="text-sm text-slate-500">Clock out</span>
                  <span className="text-sm font-medium text-slate-900">{formatTime(todayRec.clockOut)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-500">Work hours</span>
                  <span className="text-sm font-medium text-slate-900">
                    {todayRec.workHours ? `${todayRec.workHours}h` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Attendance history</h2>

        {busy ? (
          <Loader rows={5} />
        ) : !history.length ? (
          <Card>
            <div className="px-6 py-14 text-center">
              <div className="mb-4 text-4xl">🕒</div>
              <h3 className="text-lg font-semibold text-slate-900">No attendance records yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Your attendance history will appear here after you start marking attendance.
              </p>
            </div>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Date', 'Status', 'Clock in', 'Clock out', 'Hours'].map((head) => (
                      <th
                        key={head}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((r) => (
                    <tr key={r.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{formatTime(r.clockIn)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{formatTime(r.clockOut)}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">
                        {r.workHours ? `${r.workHours}h` : '—'}
                      </td>
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