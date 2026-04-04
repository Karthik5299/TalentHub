import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (date, options = {}) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', options);
};

const statusClass = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border border-slate-200',
  terminated: 'bg-rose-50 text-rose-700 border border-rose-200',
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

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-900">{value || '—'}</span>
  </div>
);

export default function EmpProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [kin, setKin] = useState(null);
  const [busy, setBusy] = useState(true);

  const [pwModal, setPwModal] = useState(false);
  const [pf, setPf] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try {
        const [p, k] = await Promise.all([
          api.get('/employees/me/profile'),
          api.get('/kin/me').catch(() => null),
        ]);
        setProfile(p?.data?.data || null);
        setKin(k?.data?.data?.kin || null);
      } catch (e) {
        console.error(e);
      } finally {
        setBusy(false);
      }
    };
    load();
  }, [user]);

  const changePw = async () => {
    if (!pf.currentPassword || !pf.newPassword) {
      toast.error('Fill both password fields');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/change-password', pf);
      toast.success('Password changed successfully');
      setPwModal(false);
      setPf({ currentPassword: '', newPassword: '' });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const emp = profile?.employee;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your personal, employment, and emergency contact details.
          </p>
        </div>
        <button
          onClick={() => setPwModal(true)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Change password
        </button>
      </div>

      {busy ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : !emp ? (
        <Card>
          <div className="px-6 py-14 text-center">
            <div className="mb-4 text-4xl">👤</div>
            <h3 className="text-lg font-semibold text-slate-900">Employee account not linked</h3>
            <p className="mt-2 text-sm text-slate-500">
              Contact your administrator to link your account to an employee record.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 px-6 py-8 text-white">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold uppercase backdrop-blur">
                    {emp.firstName?.charAt(0)}
                    {emp.lastName?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {emp.firstName} {emp.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {emp.position || 'Employee'} {emp.department?.name ? `• ${emp.department.name}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={emp.status || 'active'} />
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-white/90">
                    {emp.employeeCode || 'No Code'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Monthly salary', formatMoney(emp.salary), 'Current salary package'],
                ['Joining date', emp.joiningDate ? formatDate(emp.joiningDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '—', 'Employment start date'],
                ['Department', emp.department?.name || '—', 'Current team assignment'],
                ['Phone', emp.phone || '—', 'Primary contact number'],
              ].map(([title, value, hint]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
                  <p className="mt-2 text-sm text-slate-500">{hint}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-semibold text-slate-900">Personal details</h3>
              </div>
              <div className="p-6">
                <InfoRow label="Email" value={emp.email} />
                <InfoRow label="Phone" value={emp.phone} />
                <InfoRow label="Position" value={emp.position} />
                <InfoRow label="Department" value={emp.department?.name} />
                <InfoRow
                  label="Joined on"
                  value={emp.joiningDate ? formatDate(emp.joiningDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                />
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-semibold text-slate-900">This month</h3>
              </div>
              <div className="p-6">
                <InfoRow label="Present days" value={profile?.thisMonthAttendance?.present ?? 0} />
                <InfoRow label="Absent days" value={profile?.thisMonthAttendance?.absent ?? 0} />
                <InfoRow label="Late marks" value={profile?.thisMonthAttendance?.late ?? 0} />
                <InfoRow
                  label="Total hours"
                  value={
                    profile?.thisMonthAttendance?.totalHours
                      ? `${profile.thisMonthAttendance.totalHours}h`
                      : '—'
                  }
                />
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-semibold text-slate-900">Emergency contact</h3>
              </div>
              <div className="p-6">
                {kin ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-lg font-semibold text-slate-900">{kin.name}</p>
                    <p className="mt-1 text-sm capitalize text-slate-500">{kin.relationship}</p>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-slate-700">{kin.phone || 'No phone available'}</p>
                      <p className="text-sm text-slate-700">{kin.email || 'No email available'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-base font-medium text-slate-900">No emergency contact found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Emergency contact information is not available yet.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-[fadeUp_.25s_ease]">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Change password</h3>
                <p className="mt-1 text-sm text-slate-500">Use a strong password with letters and numbers.</p>
              </div>
              <button
                onClick={() => setPwModal(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Current password
                </label>
                <div className="relative">
                  <input
                    type={showCur ? 'text' : 'password'}
                    value={pf.currentPassword}
                    onChange={(e) => setPf((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCur((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-700"
                  >
                    {showCur ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pf.newPassword}
                    onChange={(e) => setPf((p) => ({ ...p, newPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-700"
                  >
                    {showNew ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">Minimum 8 characters recommended</p>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => setPwModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={changePw}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(14px) scale(.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}