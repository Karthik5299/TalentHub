import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, EVENTS } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusClass = {
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  generated: 'bg-sky-50 text-sky-700 border border-sky-200',
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

export default function EmpPayslips() {
  const { user } = useAuth();
  const [slips, setSlips] = useState([]);
  const [busy, setBusy] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try {
        const r = await api.get('/payroll/me');
        setSlips(r?.data?.data || []);
      } catch (e) {
        if (e?.response?.status !== 400) console.error(e);
      } finally {
        setBusy(false);
      }
    };
    load();
  }, [user]);

  // 🔌 Real-time — notify employee when payslip is generated
  useSocketEvent(EVENTS.PAYROLL_GENERATED, (data) => {
    const months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    toast.success(`💰 Your ${months[data?.month] || ''} ${data?.year || ''} payslip is ready!`, { duration: 6000 });
    // Reload payslips list
    const reload = async () => {
      try { const r = await api.get('/payroll/me'); setSlips(r.data.data || []); } catch {}
    };
    reload();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payslips</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review salary details, earnings, deductions, and payment status.
        </p>
      </div>

      {!user?.employeeId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Your account is not linked to an employee record. Contact admin.
        </div>
      )}

      {busy ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : !slips.length ? (
        <Card>
          <div className="px-6 py-14 text-center">
            <div className="mb-4 text-4xl">💳</div>
            <h3 className="text-lg font-semibold text-slate-900">No payslips available yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Your salary slips will appear here after payroll is generated.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {slips.map((ps) => {
            const open = expanded === ps.id;

            return (
              <Card key={ps.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : ps.id)}
                  className="w-full text-left"
                >
                  <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {months[ps.month - 1]} {ps.year}
                        </h3>
                        <StatusPill status={ps.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {ps.presentDays}/{ps.workingDays} working days present
                      </p>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Net pay
                        </p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-600">
                          {formatMoney(ps.netSalary)}
                        </p>
                      </div>
                      <div className="text-slate-400">{open ? '−' : '+'}</div>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-100 px-5 py-5 animate-[fadeOpen_.25s_ease]">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <h4 className="text-sm font-semibold text-emerald-700">Earnings</h4>
                        <div className="mt-4 space-y-2">
                          {[
                            ['Basic salary', ps.basicSalary],
                            ['HRA', ps.hra],
                            ['Travel allowance', ps.travelAllowance],
                            ['Medical allowance', ps.medicalAllowance],
                            ['Bonus', ps.bonus],
                          ]
                            .filter(([, v]) => Number(v) > 0)
                            .map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{label}</span>
                                <span className="font-medium text-slate-900">{formatMoney(value)}</span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-4 border-t border-emerald-200 pt-4 flex items-center justify-between">
                          <span className="font-medium text-slate-700">Gross salary</span>
                          <span className="font-semibold text-emerald-700">{formatMoney(ps.grossSalary)}</span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                        <h4 className="text-sm font-semibold text-rose-700">Deductions</h4>
                        <div className="mt-4 space-y-2">
                          {[
                            ['PF', ps.pfDeduction],
                            ['ESI', ps.esiDeduction],
                            ['TDS', ps.taxDeduction],
                            ['Late penalty', ps.leaveDeduction],
                          ]
                            .filter(([, v]) => Number(v) > 0)
                            .map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{label}</span>
                                <span className="font-medium text-slate-900">{formatMoney(value)}</span>
                              </div>
                            ))}
                        </div>
                        <div className="mt-4 border-t border-rose-200 pt-4 flex items-center justify-between">
                          <span className="font-medium text-slate-700">Net salary</span>
                          <span className="font-semibold text-emerald-700">{formatMoney(ps.netSalary)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeOpen {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}