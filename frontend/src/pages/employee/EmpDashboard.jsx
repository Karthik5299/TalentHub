import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, EVENTS } from '../../context/SocketContext';

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

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getGreeting = () => {
  const hr = new Date().getHours();
  if (hr < 5) return 'Good night';
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
};

const statusClass = {
  present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border border-amber-200',
  absent: 'bg-rose-50 text-rose-700 border border-rose-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  declined: 'bg-rose-50 text-rose-700 border border-rose-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
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

const MetricCard = ({ title, value, hint, icon }) => (
  <Card className="p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">
    <div className="mb-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
        {icon}
      </div>
    </div>
    <p className="text-sm text-slate-500">{hint}</p>
  </Card>
);

const Skeleton = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
    ))}
  </div>
);

export default function EmpDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [todayRec, setTodayRec] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [busy, setBusy] = useState(true);
  const [time, setTime] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try {
        const reqs = [api.get('/attendance/today'), api.get('/leaves')];
        if (user?.employeeId) reqs.unshift(api.get('/employees/me'));

        const res = await Promise.all(reqs);

        if (user?.employeeId) {
          const p = res[0]?.data?.data;
          setProfile(p?.employee || p || null);

          const rec =
            res[1]?.data?.data?.records?.find(
              (r) => String(r.employee?.id || r.employee) === String(user.employeeId)
            ) || null;

          setTodayRec(rec);
          setLeaves((res[2]?.data?.data || []).slice(0, 4));
        } else {
          setProfile(null);
          setTodayRec(null);
          setLeaves((res[1]?.data?.data || []).slice(0, 4));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
      }
    };

    load();
  }, [user, refreshKey]);

  useSocketEvent(EVENTS.LEAVE_REVIEWED, () => setRefreshKey((k) => k + 1), []);
  useSocketEvent(EVENTS.CLOCK_IN, () => setRefreshKey((k) => k + 1), []);
  useSocketEvent(EVENTS.CLOCK_OUT, () => setRefreshKey((k) => k + 1), []);

  const summary = useMemo(
    () => ({
      salary: profile?.salary ? formatMoney(profile.salary) : '—',
      code: profile?.employeeCode || 'Not linked',
      dept: profile?.department?.name || '—',
      joined: profile?.joiningDate
        ? formatDate(profile.joiningDate, { month: 'short', year: 'numeric' })
        : '—',
    }),
    [profile]
  );

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 text-white shadow-lg">
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.3fr_0.8fr] md:px-8 md:py-8">
          <div className="animate-[fadeUp_.6s_ease]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              {getGreeting()}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome back, {user?.name?.split(' ')[0] || 'Employee'}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {profile?.position || 'Employee'} {profile?.department?.name ? `• ${profile.department.name}` : ''}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/employee/attendance"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                Open attendance
              </a>
              <a
                href="/employee/leaves"
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Apply leave
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm animate-[fadeUp_.8s_ease]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Current time
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {time.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${(time.getSeconds() / 60) * 100}%` }}
              />
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Today
              </p>

              {busy ? (
                <Skeleton rows={2} />
              ) : !todayRec ? (
                <div>
                  <p className="text-sm text-slate-300">You have not clocked in yet.</p>
                  <a
                    href="/employee/attendance"
                    className="mt-3 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900"
                  >
                    Clock in now
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <StatusPill status={todayRec.status} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Clock in</p>
                      <p className="mt-1 font-mono text-sm text-white">{formatTime(todayRec.clockIn)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Clock out</p>
                      <p className="mt-1 font-mono text-sm text-white">{formatTime(todayRec.clockOut)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Monthly salary" value={summary.salary} hint="Current monthly salary" icon="₹" />
        <MetricCard title="Employee code" value={summary.code} hint="Your internal employee ID" icon="#" />
        <MetricCard title="Department" value={summary.dept} hint="Current assigned department" icon="🏢" />
        <MetricCard title="Joined" value={summary.joined} hint="Employment start period" icon="📅" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent leaves</h2>
                <p className="mt-1 text-sm text-slate-500">Your latest leave requests</p>
              </div>
              <a href="/employee/leaves" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                View all
              </a>
            </div>
          </div>

          <div className="p-6">
            {busy ? (
              <Skeleton rows={4} />
            ) : !leaves.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <p className="text-base font-medium text-slate-900">No leave records yet</p>
                <p className="mt-1 text-sm text-slate-500">Your leave requests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((lv) => (
                  <div
                    key={lv.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lv.leaveType} leave</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(lv.startDate, { day: 'numeric', month: 'short' })} -{' '}
                          {formatDate(lv.endDate, { day: 'numeric', month: 'short', year: 'numeric' })} •{' '}
                          {lv.totalDays} day(s)
                        </p>
                      </div>
                      <StatusPill status={lv.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{lv.reason || 'No reason provided.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Quick summary</h2>
            <p className="mt-1 text-sm text-slate-500">Your account overview</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Name</span>
              <span className="text-sm font-medium text-slate-900">{user?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Role</span>
              <span className="text-sm font-medium text-slate-900">{profile?.position || 'Employee'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Department</span>
              <span className="text-sm font-medium text-slate-900">{profile?.department?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Status</span>
              <StatusPill status={profile?.status || 'active'} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Today</span>
              {todayRec ? (
                <StatusPill status={todayRec.status} />
              ) : (
                <span className="text-sm text-slate-500">Not clocked in</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}