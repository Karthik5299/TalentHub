import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSocketEvent, EVENTS } from '../../context/SocketContext';

/* ── shared helpers ── */
const F = (setForm, key) => e => setForm(f => ({...f, [key]: e.target.value}));
const Spinner = () => <div className="aspinner" style={{display:'inline-block'}}/>;

/* ════════════════════════════════════════
   ADMIN ATTENDANCE
════════════════════════════════════════ */
export function AdminAttendance() {
  const [data,  setData]  = useState(null);
  const [emps,  setEmps]  = useState([]);
  const [empId, setEmpId] = useState('');
  const [busy,  setBusy]  = useState(true);
  const [clk,   setClk]   = useState(false);
  const [now,   setNow]   = useState(new Date());

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);

  const load=useCallback(async()=>{
    setBusy(true);
    try{const r=await api.get('/attendance/today');setData(r.data.data||{});}
    catch{}finally{setBusy(false);}
  },[]);
  useEffect(()=>{load();api.get('/employees',{params:{limit:100}}).then(r=>setEmps(r.data.data||[])).catch(()=>{});},[load]);

  const clockIn =async()=>{if(!empId){toast.error('Select employee');return;}setClk(true);try{await api.post('/attendance/clock-in',{employeeId:empId});toast.success('Clocked in!');load();}catch{}finally{setClk(false);};};
  const clockOut=async(id)=>{setClk(true);try{await api.post('/attendance/clock-out',{employeeId:id||empId});toast.success('Clocked out!');load();}catch{}finally{setClk(false);};};
  const fmt=d=>d?new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—';

  return(
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:20,fontWeight:700,color:'var(--a-text)'}}>Attendance</h1><p style={{fontSize:12,color:'var(--a-t3)'}}>Live tracking · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})}</p></div>
        <div style={{fontFamily:'var(--a-mono)',fontSize:20,fontWeight:700,color:'var(--a-text)',letterSpacing:'-.02em'}}>{now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:18}}>
        {[['Total',data?.stats?.totalEmployees,'var(--a-text)'],['Present',data?.stats?.present,'#16a34a'],['Absent',data?.stats?.absent,'#dc2626'],['Rate',data?.stats?.attendanceRate!=null?`${data.stats.attendanceRate}%`:null,'#2563eb']].map(([l,v,c])=>(
          <div key={l} className="acard" style={{padding:16}}>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--a-t3)',marginBottom:7}}>{l}</div>
            <div style={{fontSize:24,fontWeight:700,fontFamily:'var(--a-mono)',color:c}}>{v??'—'}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:14,marginBottom:14}}>
        <div className="acard" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Quick Clock In/Out</div>
          <select className="ainput" style={{marginBottom:11}} value={empId} onChange={e=>setEmpId(e.target.value)}>
            <option value="">Select employee…</option>
            {emps.map(e=><option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
          </select>
          <div style={{display:'flex',gap:8}}>
            <button className="abtn abtn-success" style={{flex:1,justifyContent:'center'}} onClick={clockIn} disabled={clk||!empId}>{clk?<Spinner/>:null} In</button>
            <button className="abtn abtn-danger"  style={{flex:1,justifyContent:'center'}} onClick={()=>clockOut()} disabled={clk||!empId}>{clk?<Spinner/>:null} Out</button>
          </div>
        </div>
        <div className="acard" style={{overflow:'hidden'}}>
          <div style={{padding:'13px 14px 9px',fontSize:13,fontWeight:600}}>Active Staff <span style={{fontSize:11,fontWeight:400,color:'var(--a-t3)',fontFamily:'var(--a-mono)'}}>{data?.activeStaff?.length||0} on duty</span></div>
          <div className="tscroll" style={{maxHeight:180,overflowY:'auto'}}>
            <table className="atable">
              <thead><tr><th>Name</th><th>In</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {busy?<tr><td colSpan={4}><div style={{padding:20,textAlign:'center',fontSize:11,color:'var(--a-t3)'}}>Loading…</div></td></tr>
                :!data?.activeStaff?.length?<tr><td colSpan={4}><div className="aempty" style={{padding:24}}>No active staff</div></td></tr>
                :data.activeStaff.map(r=>(
                  <tr key={r._id}>
                    <td style={{fontWeight:500,color:'var(--a-text)'}}>{r.employee?.firstName} {r.employee?.lastName}</td>
                    <td style={{fontFamily:'var(--a-mono)',color:'#16a34a',fontSize:12}}>{fmt(r.clockIn)}</td>
                    <td><span className={`abadge ${r.status==='late'?'ab-amber':'ab-green'}`}>{r.status}</span></td>
                    <td><button className="abtn abtn-outline abtn-sm" onClick={()=>clockOut(r.employee?._id)}>Out</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!!data?.completed?.length&&(
        <div className="acard" style={{overflow:'hidden'}}>
          <div style={{padding:'13px 14px 9px',fontSize:13,fontWeight:600}}>Completed Shifts</div>
          <div className="tscroll">
            <table className="atable">
              <thead><tr><th>Employee</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead>
              <tbody>{data.completed.map(r=>(
                <tr key={r._id}>
                  <td style={{fontWeight:500,color:'var(--a-text)'}}>{r.employee?.firstName} {r.employee?.lastName}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:12}}>{fmt(r.clockIn)}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:12}}>{fmt(r.clockOut)}</td>
                  <td style={{fontFamily:'var(--a-mono)',color:'#2563eb'}}>{r.workHours}h</td>
                  <td><span className={`abadge ${r.status==='late'?'ab-amber':'ab-green'}`}>{r.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   ADMIN LEAVES
════════════════════════════════════════ */
export function AdminLeaves() {
  const [tab,    setTab]    = useState('requests');   // 'requests' | 'balance'

  /* ── Requests tab state ── */
  const [leaves, setLeaves] = useState([]);
  const [emps,   setEmps]   = useState([]);
  const [stats,  setStats]  = useState({});
  const [filt,   setFilt]   = useState('');
  const [busy,   setBusy]   = useState(true);
  const [applyM, setApplyM] = useState(false);
  const [reviewL,setReviewL]= useState(null);
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState({employeeId:'',leaveType:'annual',startDate:'',endDate:'',reason:''});
  const [rev,    setRev]    = useState({status:'approved',adminNote:''});

  /* ── Balance tab state ── */
  const [balances,   setBalances]   = useState([]);
  const [balBusy,    setBalBusy]    = useState(false);
  const [balYear,    setBalYear]    = useState(new Date().getFullYear());
  const [adjustM,    setAdjustM]    = useState(null);  // employee row being adjusted
  const [adjForm,    setAdjForm]    = useState({leaveType:'annual', allocated:12});
  const [adjSaving,  setAdjSaving]  = useState(false);
  const [initM,      setInitM]      = useState(null);  // employee to initialise balance for

  /* ────────────────────────────────────────────────────── */
  /* Requests loaders                                       */
  /* ────────────────────────────────────────────────────── */
  const loadRequests = useCallback(async () => {
    setBusy(true);
    try {
      const p = {}; if (filt) p.status = filt;
      const [l, s] = await Promise.all([
        api.get('/leaves', { params: p }),
        api.get('/leaves/stats'),
      ]);
      setLeaves(l.data.data || []);
      setStats(s.data.data.stats || {});
    } catch {}
    finally { setBusy(false); }
  }, [filt]);

  useEffect(() => {
    loadRequests();
    api.get('/employees', { params:{ limit:200 } }).then(r => setEmps(r.data.data || [])).catch(() => {});
  }, [loadRequests]);

  // 🔌 Real-time — auto-reload when leave events fire
  useSocketEvent(EVENTS.LEAVE_APPLIED,   () => { toast('📋 New leave request received!', { icon:'🔔' }); loadRequests(); }, [loadRequests]);
  useSocketEvent(EVENTS.LEAVE_REVIEWED,  () => loadRequests(), [loadRequests]);
  useSocketEvent(EVENTS.LEAVE_CANCELLED, () => { toast('❌ A leave was cancelled', { icon:'ℹ️' }); loadRequests(); }, [loadRequests]);

  /* ────────────────────────────────────────────────────── */
  /* Balance loader                                         */
  /* ────────────────────────────────────────────────────── */
  const loadBalances = useCallback(async () => {
    setBalBusy(true);
    try {
      const r = await api.get('/leaves/balance', { params:{ year: balYear } });
      setBalances(r.data.data.balances || []);
    } catch {}
    finally { setBalBusy(false); }
  }, [balYear]);

  useEffect(() => { if (tab === 'balance') loadBalances(); }, [tab, loadBalances]);

  /* ────────────────────────────────────────────────────── */
  /* Request actions                                        */
  /* ────────────────────────────────────────────────────── */
  const apply = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate || !form.reason) { toast.error('Fill all fields'); return; }
    setSaving(true);
    try { await api.post('/leaves', form); toast.success('Applied'); setApplyM(false); loadRequests(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const doReview = async () => {
    setSaving(true);
    try { await api.put(`/leaves/${reviewL._id}/review`, rev); toast.success(`Leave ${rev.status}`); setReviewL(null); loadRequests(); }
    catch {} finally { setSaving(false); }
  };

  const cancel = async id => {
    if (!window.confirm('Cancel this leave?')) return;
    try { await api.delete(`/leaves/${id}`); toast.success('Cancelled'); loadRequests(); } catch {}
  };

  /* ────────────────────────────────────────────────────── */
  /* Balance actions                                        */
  /* ────────────────────────────────────────────────────── */
  const openAdjust = (bal) => {
    setAdjustM(bal);
    setAdjForm({ leaveType:'annual', allocated: bal.annual?.allocated ?? 12 });
  };

  const doAdjust = async () => {
    setAdjSaving(true);
    try {
      await api.put(`/leaves/balance/${adjustM.employee._id}`, {
        leaveType:  adjForm.leaveType,
        allocated:  Number(adjForm.allocated),
        year:       balYear,
      });
      toast.success(`${adjForm.leaveType} balance updated to ${adjForm.allocated} days`);
      setAdjustM(null);
      loadBalances();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update balance');
    } finally { setAdjSaving(false); }
  };

  /* Initialise balance for an employee who has none */
  const initBalance = async (emp) => {
    try {
      await api.get(`/leaves/balance/${emp._id}`, { params:{ year: balYear } });
      toast.success(`Balance initialised for ${emp.firstName} ${emp.lastName}`);
      loadBalances();
      setInitM(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed');
    }
  };

  /* ────────────────────────────────────────────────────── */
  /* Helpers                                                */
  /* ────────────────────────────────────────────────────── */
  const SC = { approved:{bg:'#f0fdf4',c:'#16a34a'}, pending:{bg:'#fffbeb',c:'#d97706'}, declined:{bg:'#fef2f2',c:'#dc2626'} };
  const SB = s => <span className="abadge" style={{ background:SC[s]?.bg, color:SC[s]?.c }}>{s}</span>;

  const LEAVE_TYPES = [
    { key:'annual',    label:'Annual',    days:12,  color:'#4f52d4', bg:'#eef2ff' },
    { key:'sick',      label:'Sick',      days:10,  color:'#dc2626', bg:'#fef2f2' },
    { key:'maternity', label:'Maternity', days:90,  color:'#db2777', bg:'#fdf2f8' },
    { key:'paternity', label:'Paternity', days:7,   color:'#7c3aed', bg:'#f5f3ff' },
  ];

  /* ────────────────────────────────────────────────────── */
  /* Employees without a balance record yet                 */
  /* ────────────────────────────────────────────────────── */
  const balEmpIds = new Set(balances.map(b => String(b.employee?._id)));
  const empsWithoutBalance = emps.filter(e => !balEmpIds.has(String(e._id)) && e.status === 'active');

  /* ────────────────────────────────────────────────────── */
  /* RENDER                                                 */
  /* ────────────────────────────────────────────────────── */
  return (
    <div className="page">
      {/* ── Page header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--a-text)' }}>Leaves</h1>
          <p style={{ fontSize:12, color:'var(--a-t3)' }}>Manage requests and leave balances</p>
        </div>
        {tab === 'requests' && (
          <button className="abtn abtn-primary" onClick={() => { setForm({employeeId:'',leaveType:'annual',startDate:'',endDate:'',reason:''}); setApplyM(true); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Apply Leave
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:'1px solid var(--a-border)', paddingBottom:0 }}>
        {[['requests','Leave Requests'], ['balance','Leave Balance']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding:'8px 18px', border:'none', background:'none', cursor:'pointer',
            fontSize:13, fontWeight: tab === key ? 600 : 500,
            color: tab === key ? 'var(--a-accent)' : 'var(--a-t2)',
            borderBottom: tab === key ? '2px solid var(--a-accent)' : '2px solid transparent',
            marginBottom:'-1px', transition:'all .15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1 — LEAVE REQUESTS
      ══════════════════════════════════════════════════ */}
      {tab === 'requests' && (
        <>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:11, marginBottom:14 }}>
            {[['Pending',stats.pending||0,'#d97706'],['Approved',stats.approved||0,'#16a34a'],['Declined',stats.declined||0,'#dc2626']].map(([l,v,c]) => (
              <div key={l} className="acard" style={{ padding:14, cursor:'pointer' }} onClick={() => setFilt(l.toLowerCase())}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--a-t3)', marginBottom:6 }}>{l}</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--a-mono)', color:c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="acard" style={{ padding:'8px 13px', marginBottom:12, display:'flex', gap:7 }}>
            {['','pending','approved','declined'].map(s => (
              <button key={s} className={`abtn abtn-sm ${filt===s ? 'abtn-primary' : 'abtn-outline'}`} onClick={() => setFilt(s)}>{s || 'All'}</button>
            ))}
          </div>

          {/* Table */}
          <div className="acard" style={{ overflow:'hidden' }}>
            <div className="tscroll">
              <table className="atable">
                <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Reason</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
                <tbody>
                  {busy ? (
                    <tr><td colSpan={8}><div style={{ padding:28, textAlign:'center', fontSize:11, color:'var(--a-t3)' }}>Loading…</div></td></tr>
                  ) : !leaves.length ? (
                    <tr><td colSpan={8}><div className="aempty">No leave records</div></td></tr>
                  ) : leaves.map(lv => (
                    <tr key={lv._id}>
                      <td>
                        <div style={{ fontWeight:500, color:'var(--a-text)', fontSize:12 }}>{lv.employee?.firstName} {lv.employee?.lastName}</div>
                        <div style={{ fontSize:10, color:'var(--a-t3)' }}>{lv.employee?.employeeCode}</div>
                      </td>
                      <td><span className="atag">{lv.leaveType}</span></td>
                      <td style={{ fontFamily:'var(--a-mono)', fontSize:11 }}>{new Date(lv.startDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontFamily:'var(--a-mono)', fontSize:11 }}>{new Date(lv.endDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontFamily:'var(--a-mono)', fontWeight:500 }}>{lv.totalDays}d</td>
                      <td>{SB(lv.status)}</td>
                      <td style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>{lv.reason}</td>
                      <td>
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:5 }}>
                          {lv.status === 'pending' && (
                            <button className="abtn abtn-primary abtn-sm" onClick={() => { setReviewL(lv); setRev({status:'approved',adminNote:''}); }}>Review</button>
                          )}
                          {lv.status === 'pending' && (
                            <button className="abtn abtn-danger abtn-sm" onClick={() => cancel(lv._id)}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2 — LEAVE BALANCE
      ══════════════════════════════════════════════════ */}
      {tab === 'balance' && (
        <>
          {/* Year selector + legend */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--a-t2)', fontWeight:500 }}>Year:</span>
              {[2024, 2025, 2026, 2027].map(y => (
                <button key={y} onClick={() => setBalYear(y)}
                  className={`abtn abtn-sm ${balYear === y ? 'abtn-primary' : 'abtn-outline'}`}>{y}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:14 }}>
              {LEAVE_TYPES.map(t => (
                <div key={t.key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--a-t2)' }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:t.color }} />
                  {t.label} ({t.days}d default)
                </div>
              ))}
            </div>
          </div>

          {/* Employees without balance — init prompt */}
          {!balBusy && empsWithoutBalance.length > 0 && (
            <div style={{ padding:'10px 14px', marginBottom:14, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'#92400e' }}>
                ⚠️ <strong>{empsWithoutBalance.length}</strong> active employee(s) have no balance record for {balYear}.
              </span>
              <button className="abtn abtn-sm" style={{ background:'#d97706', color:'#fff', gap:5 }}
                onClick={() => setInitM(true)}>
                Initialise All
              </button>
            </div>
          )}

          {/* Balance table */}
          <div className="acard" style={{ overflow:'hidden' }}>
            <div className="tscroll">
              <table className="atable">
                <thead>
                  <tr>
                    <th>Employee</th>
                    {LEAVE_TYPES.map(t => (
                      <th key={t.key} style={{ textAlign:'center' }}>
                        <div>{t.label}</div>
                        <div style={{ fontWeight:400, color:'var(--a-t3)', fontSize:9 }}>used / alloc</div>
                      </th>
                    ))}
                    <th style={{ textAlign:'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {balBusy ? (
                    <tr><td colSpan={6}><div style={{ padding:28, textAlign:'center', fontSize:11, color:'var(--a-t3)' }}>Loading…</div></td></tr>
                  ) : !balances.length ? (
                    <tr><td colSpan={6}><div className="aempty">No balance records for {balYear}. Click "Initialise All" above.</div></td></tr>
                  ) : balances.map(bal => {
                    const emp = bal.employee;
                    return (
                      <tr key={bal._id}>
                        <td>
                          <div style={{ fontWeight:500, color:'var(--a-text)', fontSize:12 }}>{emp?.firstName} {emp?.lastName}</div>
                          <div style={{ fontSize:10, color:'var(--a-t3)' }}>{emp?.employeeCode}</div>
                        </td>
                        {LEAVE_TYPES.map(t => {
                          const d         = bal[t.key] || { allocated:0, used:0, pending:0 };
                          const remaining = Math.max(0, d.allocated - d.used - d.pending);
                          const pct       = d.allocated > 0 ? Math.min(100, Math.round((d.used / d.allocated) * 100)) : 0;
                          const pendPct   = d.allocated > 0 ? Math.min(100 - pct, Math.round((d.pending / d.allocated) * 100)) : 0;
                          const low       = remaining <= 2 && !['maternity','paternity'].includes(t.key);
                          return (
                            <td key={t.key} style={{ textAlign:'center' }}>
                              {/* Mini bar */}
                              <div style={{ width:60, height:5, background:'#f3f4f6', borderRadius:3, overflow:'hidden', margin:'0 auto 4px' }}>
                                <div style={{ height:'100%', display:'flex' }}>
                                  <div style={{ width:`${pct}%`, background:t.color, borderRadius:'3px 0 0 3px' }} />
                                  <div style={{ width:`${pendPct}%`, background:'#f59e0b' }} />
                                </div>
                              </div>
                              <div style={{ fontSize:11, fontFamily:'var(--a-mono)', fontWeight:600, color: low ? '#dc2626' : 'var(--a-text)' }}>
                                {d.used}/{d.allocated}
                              </div>
                              {d.pending > 0 && (
                                <div style={{ fontSize:9, color:'#d97706' }}>{d.pending} pending</div>
                              )}
                              <div style={{ fontSize:10, color: low ? '#dc2626' : 'var(--a-t3)' }}>
                                {remaining} left {low && '⚠️'}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ textAlign:'right' }}>
                          <button className="abtn abtn-sm abtn-outline" onClick={() => openAdjust(bal)}
                            style={{ gap:5, fontSize:11 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          MODALS — REQUESTS TAB
      ══════════════════════════════════════════════════ */}

      {/* Apply leave modal */}
      {applyM && (
        <div className="aoverlay" onClick={e => e.target === e.currentTarget && setApplyM(false)}>
          <div className="amodal">
            <div className="amodal-h"><div style={{ fontWeight:600, fontSize:15 }}>Apply Leave</div><button className="abtn-icon" onClick={() => setApplyM(false)}>✕</button></div>
            <div className="amodal-b">
              <div><label className="alabel">Employee *</label><select className="ainput" value={form.employeeId} onChange={F(setForm,'employeeId')}><option value="">Select…</option>{emps.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>
              <div><label className="alabel">Leave Type</label><select className="ainput" value={form.leaveType} onChange={F(setForm,'leaveType')}>{'annual,sick,maternity,paternity,unpaid,other'.split(',').map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label className="alabel">Start *</label><input className="ainput" type="date" value={form.startDate} onChange={F(setForm,'startDate')}/></div>
                <div><label className="alabel">End *</label><input className="ainput" type="date" value={form.endDate} min={form.startDate} onChange={F(setForm,'endDate')}/></div>
              </div>
              <div><label className="alabel">Reason *</label><textarea className="ainput" rows={2} value={form.reason} onChange={F(setForm,'reason')} style={{ resize:'vertical' }}/></div>
            </div>
            <div className="amodal-f">
              <button className="abtn abtn-outline" onClick={() => setApplyM(false)}>Cancel</button>
              <button className="abtn abtn-primary" onClick={apply} disabled={saving}>{saving ? <Spinner/> : null} Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewL && (
        <div className="aoverlay" onClick={e => e.target === e.currentTarget && setReviewL(null)}>
          <div className="amodal">
            <div className="amodal-h"><div style={{ fontWeight:600, fontSize:15 }}>Review Leave</div><button className="abtn-icon" onClick={() => setReviewL(null)}>✕</button></div>
            <div className="amodal-b">
              <div style={{ padding:11, background:'#f9fafb', borderRadius:6, fontSize:12 }}>
                <div style={{ fontWeight:500, color:'var(--a-text)' }}>{reviewL.employee?.firstName} {reviewL.employee?.lastName}</div>
                <div style={{ fontFamily:'var(--a-mono)', fontSize:11, color:'var(--a-t2)', marginTop:2 }}>
                  {reviewL.leaveType} · {new Date(reviewL.startDate).toLocaleDateString('en-IN')} → {new Date(reviewL.endDate).toLocaleDateString('en-IN')} ({reviewL.totalDays}d)
                </div>
                <div style={{ fontSize:11, color:'var(--a-t2)', marginTop:5 }}>{reviewL.reason}</div>
              </div>
              <div>
                <label className="alabel">Decision</label>
                <div style={{ display:'flex', gap:7 }}>
                  {['approved','declined'].map(s => (
                    <button key={s} className={`abtn abtn-sm ${rev.status===s ? (s==='approved' ? 'abtn-success' : 'abtn-danger') : 'abtn-outline'}`}
                      style={{ flex:1, justifyContent:'center' }} onClick={() => setRev(r => ({...r, status:s}))}>
                      {s === 'approved' ? '✓ Approve' : '✗ Decline'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="alabel">Admin Note (optional)</label><textarea className="ainput" rows={2} value={rev.adminNote} onChange={e => setRev(r => ({...r, adminNote:e.target.value}))} style={{ resize:'vertical' }}/></div>
            </div>
            <div className="amodal-f">
              <button className="abtn abtn-outline" onClick={() => setReviewL(null)}>Cancel</button>
              <button className={`abtn ${rev.status==='approved' ? 'abtn-success' : 'abtn-danger'}`} onClick={doReview} disabled={saving}>
                {saving ? <Spinner/> : null} Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODALS — BALANCE TAB
      ══════════════════════════════════════════════════ */}

      {/* Adjust balance modal */}
      {adjustM && (
        <div className="aoverlay" onClick={e => e.target === e.currentTarget && setAdjustM(null)}>
          <div className="amodal" style={{ maxWidth:420 }}>
            <div className="amodal-h">
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>Adjust Leave Balance</div>
                <div style={{ fontSize:12, color:'var(--a-t3)', marginTop:2 }}>
                  {adjustM.employee?.firstName} {adjustM.employee?.lastName} · {balYear}
                </div>
              </div>
              <button className="abtn-icon" onClick={() => setAdjustM(null)}>✕</button>
            </div>
            <div className="amodal-b">
              {/* Current balances at a glance */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                {LEAVE_TYPES.map(t => {
                  const d = adjustM[t.key] || { allocated:0, used:0, pending:0 };
                  const rem = Math.max(0, d.allocated - d.used - d.pending);
                  return (
                    <div key={t.key} onClick={() => setAdjForm(f => ({ ...f, leaveType:t.key, allocated: d.allocated }))}
                      style={{ padding:'9px 12px', borderRadius:8, border:`2px solid ${adjForm.leaveType===t.key ? t.color : '#e5e7eb'}`, cursor:'pointer', background: adjForm.leaveType===t.key ? t.bg : 'transparent', transition:'all .12s' }}>
                      <div style={{ fontSize:10, fontWeight:700, color: adjForm.leaveType===t.key ? t.color : 'var(--a-t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>{t.label}</div>
                      <div style={{ fontFamily:'var(--a-mono)', fontSize:14, fontWeight:700, color:'var(--a-text)' }}>{rem}<span style={{ fontSize:10, color:'var(--a-t3)', fontWeight:400 }}>/{d.allocated}</span></div>
                      <div style={{ fontSize:9, color:'var(--a-t3)' }}>{d.used} used{d.pending>0?`, ${d.pending} pending`:''}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop:'1px solid var(--a-border)', paddingTop:14 }}>
                <label className="alabel">Leave Type to Adjust</label>
                <select className="ainput" value={adjForm.leaveType}
                  onChange={e => {
                    const t = LEAVE_TYPES.find(x => x.key === e.target.value);
                    const current = adjustM[e.target.value]?.allocated ?? t?.days ?? 12;
                    setAdjForm(f => ({ ...f, leaveType: e.target.value, allocated: current }));
                  }}>
                  {LEAVE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="alabel">New Allocated Days for {balYear}</label>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button className="abtn-icon" onClick={() => setAdjForm(f => ({ ...f, allocated: Math.max(0, f.allocated-1) }))}>−</button>
                  <input className="ainput" type="number" min="0" max="365" value={adjForm.allocated}
                    onChange={e => setAdjForm(f => ({ ...f, allocated: Math.max(0, Number(e.target.value)) }))}
                    style={{ textAlign:'center', fontFamily:'var(--a-mono)', fontWeight:700, fontSize:18 }}/>
                  <button className="abtn-icon" onClick={() => setAdjForm(f => ({ ...f, allocated: f.allocated+1 }))}>+</button>
                </div>
                <div style={{ fontSize:11, color:'var(--a-t3)', marginTop:5 }}>
                  Default: {LEAVE_TYPES.find(t => t.key === adjForm.leaveType)?.days ?? 0} days
                </div>
              </div>
            </div>
            <div className="amodal-f">
              <button className="abtn abtn-outline" onClick={() => setAdjustM(null)}>Cancel</button>
              <button className="abtn abtn-primary" onClick={doAdjust} disabled={adjSaving}>
                {adjSaving ? <Spinner/> : null} Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initialise all balances modal */}
      {initM && (
        <div className="aoverlay" onClick={e => e.target === e.currentTarget && setInitM(null)}>
          <div className="amodal" style={{ maxWidth:400 }}>
            <div className="amodal-h">
              <div style={{ fontWeight:600, fontSize:15 }}>Initialise Balances for {balYear}</div>
              <button className="abtn-icon" onClick={() => setInitM(null)}>✕</button>
            </div>
            <div className="amodal-b">
              <div style={{ padding:'10px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e' }}>
                This will create default leave balance records for {empsWithoutBalance.length} employee(s) who don't have one yet for {balYear}.
              </div>
              <div style={{ fontSize:12, color:'var(--a-t2)' }}>
                Default allocations: Annual 12d · Sick 10d · Maternity 90d · Paternity 7d
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {empsWithoutBalance.map(e => (
                  <div key={e._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:6, background:'var(--a-bg)', fontSize:12 }}>
                    <span style={{ color:'var(--a-text)', fontWeight:500 }}>{e.firstName} {e.lastName}</span>
                    <span style={{ fontSize:10, color:'var(--a-t3)', fontFamily:'var(--a-mono)' }}>{e.employeeCode}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="amodal-f">
              <button className="abtn abtn-outline" onClick={() => setInitM(null)}>Cancel</button>
              <button className="abtn abtn-primary" onClick={async () => {
                for (const emp of empsWithoutBalance) await initBalance(emp);
                toast.success(`Initialised ${empsWithoutBalance.length} balance(s)`);
              }}>
                Initialise {empsWithoutBalance.length} Employee(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   ADMIN DEPARTMENTS
════════════════════════════════════════ */
export function AdminDepartments() {
  const [depts, setDepts]   = useState([]);
  const [busy,  setBusy]    = useState(true);
  const [modal, setModal]   = useState(null);
  const [sel,   setSel]     = useState(null);
  const [saving,setSaving]  = useState(false);
  const [detail,setDetail]  = useState(null);
  const [form,  setForm]    = useState({name:'',code:'',description:''});

  const load=async()=>{setBusy(true);try{const r=await api.get('/departments');setDepts(r.data.data.departments||[]);}catch{}finally{setBusy(false);};};
  useEffect(()=>{load();},[]);

  const save=async()=>{
    if(!form.name){toast.error('Name required');return;}
    setSaving(true);
    try{sel?await api.put(`/departments/${sel._id}`,form):await api.post('/departments',form);toast.success(sel?'Updated':'Created');setModal(null);load();}
    catch{}finally{setSaving(false);}
  };
  const del=async d=>{if(!window.confirm(`Delete ${d.name}?`))return;try{await api.delete(`/departments/${d._id}`);toast.success('Deleted');load();}catch{}};
  const viewDetail=async d=>{try{const r=await api.get(`/departments/${d._id}`);setDetail(r.data.data||{});}catch{toast.error('Failed');}};

  return(
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:20,fontWeight:700,color:'var(--a-text)'}}>Departments</h1><p style={{fontSize:12,color:'var(--a-t3)'}}>Company structure</p></div>
        <button className="abtn abtn-primary" onClick={()=>{setForm({name:'',code:'',description:''});setSel(null);setModal('form');}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg> New
        </button>
      </div>

      {busy?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>{[1,2,3,4].map(i=><div key={i} className="acard" style={{height:110}}/>)}</div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
          {depts.map(d=>(
            <div key={d._id} className="acard" style={{padding:16,cursor:'pointer',transition:'border-color .14s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#d1d5db'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}
              onClick={()=>viewDetail(d)}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div style={{width:32,height:32,borderRadius:7,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🏢</div>
                <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
                  <button className="abtn-icon" onClick={()=>{setForm({name:d.name,code:d.code||'',description:d.description||''});setSel(d);setModal('form');}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                  <button className="abtn-icon" style={{color:'#dc2626',borderColor:'#fecaca'}} onClick={()=>del(d)}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
              <div style={{fontWeight:600,color:'var(--a-text)',marginBottom:3,fontSize:14}}>{d.name}</div>
              {d.code&&<span className="atag" style={{marginBottom:5,display:'inline-block'}}>{d.code}</span>}
              {d.description&&<div style={{fontSize:11,color:'var(--a-t3)',marginBottom:6,lineHeight:1.5}}>{d.description}</div>}
              <div style={{fontSize:11,color:'var(--a-t2)',fontFamily:'var(--a-mono)'}}>{d.employeeCount||0} members</div>
            </div>
          ))}
          {!depts.length&&<div className="aempty" style={{gridColumn:'1/-1'}}>No departments yet</div>}
        </div>
      )}

      {modal==='form'&&<div className="aoverlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="amodal">
          <div className="amodal-h"><div style={{fontWeight:600,fontSize:15}}>{sel?'Edit':'New'} Department</div><button className="abtn-icon" onClick={()=>setModal(null)}>✕</button></div>
          <div className="amodal-b">
            {[['Name *','name','Engineering'],['Code','code','ENG'],['Description','description','Brief…']].map(([l,k,p])=>(
              <div key={k}><label className="alabel">{l}</label><input className="ainput" value={form[k]} placeholder={p} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
            ))}
          </div>
          <div className="amodal-f"><button className="abtn abtn-outline" onClick={()=>setModal(null)}>Cancel</button><button className="abtn abtn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}{sel?'Save':'Create'}</button></div>
        </div>
      </div>}

      {detail&&<div className="aoverlay" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
        <div className="amodal" style={{maxWidth:520}}>
          <div className="amodal-h"><div style={{fontWeight:600,fontSize:15}}>{detail.department?.name} — Team ({detail.headcount})</div><button className="abtn-icon" onClick={()=>setDetail(null)}>✕</button></div>
          <div className="amodal-b">
            {!detail.employees?.length?<p style={{fontSize:13,color:'var(--a-t3)'}}>No active employees.</p>
            :detail.employees.map(e=>(
              <div key={e._id} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 11px',background:'#f9fafb',borderRadius:6,border:'1px solid #f3f4f6'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'#111827',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{e.firstName?.charAt(0)}{e.lastName?.charAt(0)}</div>
                <div><div style={{fontSize:13,fontWeight:500,color:'var(--a-text)'}}>{e.firstName} {e.lastName}</div><div style={{fontSize:10,color:'var(--a-t3)',fontFamily:'var(--a-mono)'}}>{e.position} · {e.employeeCode}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ════════════════════════════════════════
   ADMIN PAYROLL
════════════════════════════════════════ */
export function AdminPayroll() {
  const [records,setRecords]=useState([]);
  const [summary,setSummary]=useState({yearTotals:{grossSalary:0,netSalary:0,totalDeductions:0}});
  const [busy,   setBusy]  =useState(true);
  const [month,  setMonth] =useState(new Date().getMonth()+1);
  const [year,   setYear]  =useState(new Date().getFullYear());
  const [genBusy,setGenBusy]=useState(false);
  const [modal,  setModal] =useState(null);
  const [sel,    setSel]   =useState(null);
  const [saving, setSaving]=useState(false);
  const [bonus,  setBonus] =useState('');
  const [notes,  setNotes] =useState('');

  const load=useCallback(async()=>{
    setBusy(true);
    try{
      const[r,s]=await Promise.all([api.get('/payroll',{params:{month,year,limit:50}}),api.get('/payroll/summary',{params:{year}})]);
      setRecords(r.data.data || []);setSummary(s.data.data || {yearTotals:{grossSalary:0,netSalary:0,totalDeductions:0}});
    }catch{}finally{setBusy(false);}
  },[month,year]);
  useEffect(()=>{load();},[load]);

  const generate=async()=>{setGenBusy(true);try{const r=await api.post('/payroll/generate',{month,year});toast.success(`Generated ${r.data.data.generated} records`);load();}catch{}finally{setGenBusy(false);};};
  const markPaid=async id=>{try{await api.put(`/payroll/${id}/mark-paid`,{paymentMethod:'bank_transfer'});toast.success('Marked paid');load();}catch{}};
  const del=async id=>{if(!window.confirm('Delete draft?'))return;try{await api.delete(`/payroll/${id}`);toast.success('Deleted');load();}catch{}};
  const updateBonus=async()=>{setSaving(true);try{await api.put(`/payroll/${sel._id}`,{bonus:Number(bonus),notes});toast.success('Updated');setModal(null);load();}catch{}finally{setSaving(false);};};

  const M=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmt=n=>n?`₹${(n/1000).toFixed(0)}K`:'₹0';

  return(
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:20,fontWeight:700,color:'var(--a-text)'}}>Payroll</h1><p style={{fontSize:12,color:'var(--a-t3)'}}>Generate and manage monthly payroll</p></div>
        <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
          <select className="ainput" style={{width:90}} value={month} onChange={e=>setMonth(Number(e.target.value))}>{M.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
          <select className="ainput" style={{width:82}} value={year} onChange={e=>setYear(Number(e.target.value))}>{[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}</select>
          <button className="abtn abtn-primary" onClick={generate} disabled={genBusy}>{genBusy?<><Spinner/>Gen…</>:<>⚡ Generate</>}</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:18}}>
        {[['Gross',fmt(summary.yearTotals?.grossSalary),'var(--a-text)'],['Net',fmt(summary.yearTotals?.netSalary),'#16a34a'],['Deductions',fmt(summary.yearTotals?.totalDeductions),'#dc2626'],['Records',records.length,'#2563eb']].map(([l,v,c])=>(
          <div key={l} className="acard" style={{padding:16}}>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--a-t3)',marginBottom:7}}>{l} {l!=='Records'?`(${year})`:''}</div>
            <div style={{fontSize:22,fontWeight:700,fontFamily:'var(--a-mono)',color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div className="acard" style={{overflow:'hidden'}}>
        <div className="tscroll">
          <table className="atable">
            <thead><tr><th>Employee</th><th>Basic</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Days</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
            <tbody>
              {busy?<tr><td colSpan={8}><div style={{padding:28,textAlign:'center',fontSize:11,color:'var(--a-t3)'}}>Loading…</div></td></tr>
              :!records.length?<tr><td colSpan={8}><div className="aempty">No payroll for {M[month]} {year}. Click Generate.</div></td></tr>
              :records.map(r=>(
                <tr key={r._id}>
                  <td><div style={{fontWeight:500,color:'var(--a-text)',fontSize:12}}>{r.employee?.firstName} {r.employee?.lastName}</div><div style={{fontSize:10,color:'var(--a-t3)'}}>{r.employee?.employeeCode}</div></td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:11}}>₹{Number(r.basicSalary||0).toLocaleString('en-IN')}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:11,fontWeight:500}}>₹{Number(r.grossSalary||0).toLocaleString('en-IN')}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:11,color:'#dc2626'}}>-₹{Number(r.totalDeductions||0).toLocaleString('en-IN')}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:11,fontWeight:700,color:'#16a34a'}}>₹{Number(r.netSalary||0).toLocaleString('en-IN')}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:11}}>{r.presentDays}/{r.workingDays}</td>
                  <td><span className={`abadge ${r.status==='paid'?'ab-green':r.status==='generated'?'ab-blue':'ab-gray'}`}>{r.status}</span></td>
                  <td>
                    <div style={{display:'flex',justifyContent:'flex-end',gap:5}}>
                      {r.status!=='paid'&&<button className="abtn abtn-outline abtn-sm" onClick={()=>{setSel(r);setBonus(r.bonus||'');setNotes(r.notes||'');setModal('bonus');}}>Edit</button>}
                      {r.status!=='paid'&&<button className="abtn abtn-success abtn-sm" onClick={()=>markPaid(r._id)}>Pay</button>}
                      {r.status!=='paid'&&<button className="abtn abtn-danger abtn-sm" onClick={()=>del(r._id)}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal==='bonus'&&<div className="aoverlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
        <div className="amodal">
          <div className="amodal-h"><div style={{fontWeight:600,fontSize:15}}>Edit — {sel?.employee?.firstName}</div><button className="abtn-icon" onClick={()=>setModal(null)}>✕</button></div>
          <div className="amodal-b">
            <div><label className="alabel">Bonus (₹)</label><input className="ainput" type="number" value={bonus} onChange={e=>setBonus(e.target.value)} placeholder="0"/></div>
            <div><label className="alabel">Notes</label><textarea className="ainput" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} style={{resize:'vertical'}}/></div>
          </div>
          <div className="amodal-f"><button className="abtn abtn-outline" onClick={()=>setModal(null)}>Cancel</button><button className="abtn abtn-primary" onClick={updateBonus} disabled={saving}>{saving?<Spinner/>:null}Save</button></div>
        </div>
      </div>}
    </div>
  );
}

/* ════════════════════════════════════════
   ADMIN KIN
════════════════════════════════════════ */
export function AdminKin() {
  const [kins,   setKins]  =useState([]);
  const [missing,setMiss]  =useState([]);
  const [emps,   setEmps]  =useState([]);
  const [busy,   setBusy]  =useState(true);
  const [modal,  setModal] =useState(false);
  const [saving, setSaving]=useState(false);
  const [form,   setForm]  =useState({employeeId:'',name:'',relationship:'spouse',phone:'',email:'',address:''});

  const load = useCallback(async () => {
  setBusy(true);
  try {
    const r = await api.get('/kin');
    setKins(r.data.data.kins || []);
    setMiss(r.data.data.missingKin || []);
  } catch (err) {
    console.error(err);
  } finally {
    setBusy(false);
  }
}, []);
  useEffect(()=>{load();api.get('/employees',{params:{limit:100}}).then(r=>setEmps(r.data.data||[])).catch(()=>{});},[load]);

  const save=async()=>{
    if(!form.employeeId||!form.name||!form.phone){toast.error('Fill required fields');return;}
    setSaving(true);try{await api.post('/kin',form);toast.success('Saved');setModal(false);load();}catch{}finally{setSaving(false);}
  };
  const del=async id=>{if(!window.confirm('Delete?'))return;try{await api.delete(`/kin/${id}`);toast.success('Deleted');load();}catch{}};

  return(
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:20,fontWeight:700,color:'var(--a-text)'}}>Emergency Contacts</h1><p style={{fontSize:12,color:'var(--a-t3)'}}>Next of kin for all employees</p></div>
        <button className="abtn abtn-primary" onClick={()=>{setForm({employeeId:'',name:'',relationship:'spouse',phone:'',email:'',address:''});setModal(true);}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg> Add
        </button>
      </div>

      {missing.length>0&&<div style={{padding:'11px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:7,marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
        <span>⚠️</span><div><div style={{fontSize:12,fontWeight:600,color:'#dc2626'}}>{missing.length} employee(s) missing emergency contact</div><div style={{fontSize:11,color:'#6b7280',marginTop:1}}>{missing.map(e=>`${e.firstName} ${e.lastName}`).join(', ')}</div></div>
      </div>}

      <div className="acard" style={{overflow:'hidden'}}>
        <div className="tscroll">
          <table className="atable">
            <thead><tr><th>Employee</th><th>Contact</th><th>Relationship</th><th>Phone</th><th>Email</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
            <tbody>
              {busy?<tr><td colSpan={6}><div style={{padding:28,textAlign:'center',fontSize:11,color:'var(--a-t3)'}}>Loading…</div></td></tr>
              :!kins.length?<tr><td colSpan={6}><div className="aempty">No emergency contacts</div></td></tr>
              :kins.map(k=>(
                <tr key={k._id}>
                  <td><div style={{fontWeight:500,color:'var(--a-text)',fontSize:12}}>{k.employee?.firstName} {k.employee?.lastName}</div><div style={{fontSize:10,color:'var(--a-t3)'}}>{k.employee?.employeeCode}</div></td>
                  <td style={{fontWeight:500,color:'var(--a-text)'}}>{k.name}</td>
                  <td><span className="atag">{k.relationship}</span></td>
                  <td style={{fontFamily:'var(--a-mono)',fontSize:11}}>{k.phone}</td>
                  <td style={{fontSize:12}}>{k.email||'—'}</td>
                  <td><div style={{display:'flex',justifyContent:'flex-end'}}><button className="abtn abtn-danger abtn-sm" onClick={()=>del(k._id)}>Remove</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal&&<div className="aoverlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
        <div className="amodal">
          <div className="amodal-h"><div style={{fontWeight:600,fontSize:15}}>Add Emergency Contact</div><button className="abtn-icon" onClick={()=>setModal(false)}>✕</button></div>
          <div className="amodal-b">
            <div><label className="alabel">Employee *</label><select className="ainput" value={form.employeeId} onChange={F(setForm,'employeeId')}><option value="">Select…</option>{emps.map(e=><option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}</select></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label className="alabel">Name *</label><input className="ainput" value={form.name} placeholder="Jane Doe" onChange={F(setForm,'name')}/></div>
              <div><label className="alabel">Relationship</label><select className="ainput" value={form.relationship} onChange={F(setForm,'relationship')}>{'spouse,parent,sibling,child,friend,other'.split(',').map(r=><option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="alabel">Phone *</label><input className="ainput" value={form.phone} placeholder="+91…" onChange={F(setForm,'phone')}/></div>
              <div><label className="alabel">Email</label><input className="ainput" type="email" value={form.email} placeholder="jane@…" onChange={F(setForm,'email')}/></div>
            </div>
            <div><label className="alabel">Address</label><input className="ainput" value={form.address} placeholder="Street, City" onChange={F(setForm,'address')}/></div>
          </div>
          <div className="amodal-f"><button className="abtn abtn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="abtn abtn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:null}Save</button></div>
        </div>
      </div>}
    </div>
  );
}

/* ════════════════════════════════════════
   ADMIN USERS
════════════════════════════════════════ */
export function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [emps,    setEmps]    = useState([]);
  const [busy,    setBusy]    = useState(true);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name:'', email:'', password:'', role:'employee', employeeId:'' });
  const [showPw,  setShowPw]  = useState(false);

  // ── Reset password state ──────────────────────────────
  const [resetTarget,  setResetTarget]  = useState(null);   // user being reset
  const [resetBusy,    setResetBusy]    = useState(false);
  const [resetDone,    setResetDone]    = useState(null);   // { name, email, temporaryPassword, tempPasswordExpiresAt }
  const [copied,       setCopied]       = useState(false);

  const load = async () => {
    setBusy(true);
    try { const r = await api.get('/auth/users'); setUsers(r.data.data.users || []); }
    catch {} finally { setBusy(false); }
  };

  useEffect(() => {
    load();
    api.get('/employees', { params:{ limit:100 } }).then(r => setEmps(r.data.data || [])).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Name, email, password required'); return; }
    setSaving(true);
    try { await api.post('/auth/register', form); toast.success('User created!'); setModal(false); load(); }
    catch {} finally { setSaving(false); }
  };

  const toggle = async id => {
    try { const r = await api.put(`/auth/users/${id}/toggle`); toast.success(r.data.message); load(); } catch {}
  };

  const link = async (uid, eid) => {
    if (!eid) return;
    try { await api.put('/auth/link-employee', { userId:uid, employeeId:eid }); toast.success('Linked!'); load(); } catch {}
  };

  // ── Open reset modal ──────────────────────────────────
  const openReset = (user) => {
    setResetTarget(user);
    setResetDone(null);
    setCopied(false);
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetDone(null);
    setCopied(false);
  };

  // ── Call API to reset password ─────────────────────────
  const doReset = async () => {
    setResetBusy(true);
    try {
      const r = await api.put(`/auth/users/${resetTarget._id}/reset-password`);
      setResetDone(r.data.data);
      toast.success('Password reset successfully!');
      load(); // refresh table to show mustChangePassword badge
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reset failed');
    } finally { setResetBusy(false); }
  };

  // ── Copy to clipboard ─────────────────────────────────
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="page">
      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--a-text)' }}>User Accounts</h1>
          <p style={{ fontSize:12, color:'var(--a-t3)' }}>Manage portal access · Reset passwords</p>
        </div>
        <button className="abtn abtn-primary" onClick={() => { setForm({ name:'', email:'', password:'', role:'employee', employeeId:'' }); setShowPw(false); setModal(true); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Create User
        </button>
      </div>

      {/* Users table */}
      <div className="acard" style={{ overflow:'hidden' }}>
        <div className="tscroll">
          <table className="atable">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Linked Employee</th>
                <th>Status</th><th>Last Login</th><th style={{ textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr><td colSpan={7}><div style={{ padding:28, textAlign:'center', fontSize:11, color:'var(--a-t3)' }}>Loading…</div></td></tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  {/* Name + avatar */}
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:'#4f52d4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>
                        {u.name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, color:'var(--a-text)', fontSize:13 }}>{u.name}</div>
                        {u.mustChangePassword && (
                          <div style={{ fontSize:9, fontWeight:700, color:'#d97706', textTransform:'uppercase', letterSpacing:'.05em', background:'#fffbeb', padding:'1px 5px', borderRadius:3, display:'inline-block', marginTop:2 }}>
                            Must change password
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize:11, fontFamily:'var(--a-mono)' }}>{u.email}</td>
                  <td><span className={`abadge ${u.role==='admin' ? 'ab-blue' : 'ab-gray'}`}>{u.role}</span></td>
                  <td>
                    {u.employeeId
                      ? <span style={{ fontSize:11, fontFamily:'var(--a-mono)', color:'#059669' }}>{u.employeeId?.firstName} {u.employeeId?.lastName}</span>
                      : u.role === 'employee'
                        ? <select style={{ fontSize:10, padding:'2px 5px', border:'1px solid #e5e7eb', borderRadius:4, background:'#fff', fontFamily:'var(--a-mono)', color:'var(--a-t2)' }} onChange={e => link(u._id, e.target.value)}>
                            <option value="">Link…</option>
                            {emps.filter(e => e.status === 'active').map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                          </select>
                        : <span style={{ color:'var(--a-t3)', fontSize:11 }}>—</span>
                    }
                  </td>
                  <td><span className={`abadge ${u.isActive ? 'ab-green' : 'ab-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize:10, fontFamily:'var(--a-mono)', color:'var(--a-t3)' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  {/* ── ACTION BUTTONS ── */}
                  <td>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:6, flexWrap:'wrap' }}>
                      {/* Reset Password button */}
                      <button
                        className="abtn abtn-sm abtn-outline"
                        onClick={() => openReset(u)}
                        title="Reset password for this user"
                        style={{ gap:4, color:'#d97706', borderColor:'#fde68a' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#fffbeb'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Reset PW
                      </button>
                      {/* Activate / Deactivate */}
                      <button
                        className={`abtn abtn-sm ${u.isActive ? 'abtn-danger' : 'abtn-success'}`}
                        onClick={() => toggle(u._id)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CREATE USER MODAL
      ══════════════════════════════════════════ */}
      {modal && (
        <div className="aoverlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="amodal">
            <div className="amodal-h">
              <div style={{ fontWeight:600, fontSize:15 }}>Create User Account</div>
              <button className="abtn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="amodal-b">
              <div><label className="alabel">Full Name *</label><input className="ainput" value={form.name} onChange={F(setForm,'name')} placeholder="John Doe"/></div>
              <div><label className="alabel">Email *</label><input className="ainput" type="email" value={form.email} onChange={F(setForm,'email')} placeholder="john@co.com"/></div>
              <div>
                <label className="alabel">Password * <span style={{ fontWeight:400, color:'var(--a-t3)' }}>(min 8 chars)</span></label>
                <div style={{ position:'relative' }}>
                  <input className="ainput" type={showPw ? 'text' : 'password'} value={form.password} onChange={F(setForm,'password')} placeholder="Secure@1234" style={{ paddingRight:36 }}/>
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--a-t3)' }}>{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label className="alabel">Role</label><select className="ainput" value={form.role} onChange={F(setForm,'role')}><option value="employee">Employee</option><option value="admin">Admin</option></select></div>
                <div><label className="alabel">Link Employee</label><select className="ainput" value={form.employeeId} onChange={F(setForm,'employeeId')}><option value="">None</option>{emps.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}</select></div>
              </div>
            </div>
            <div className="amodal-f">
              <button className="abtn abtn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="abtn abtn-primary" onClick={create} disabled={saving}>{saving ? <Spinner/> : null} Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RESET PASSWORD MODAL
      ══════════════════════════════════════════ */}
      {resetTarget && (
        <div className="aoverlay" onClick={e => e.target === e.currentTarget && !resetBusy && closeReset()}>
          <div className="amodal" style={{ maxWidth:460 }}>

            {!resetDone ? (
              /* ── Step 1: Confirm reset ── */
              <>
                <div className="amodal-h">
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--a-text)' }}>Reset Password</div>
                    <div style={{ fontSize:12, color:'var(--a-t3)', marginTop:2 }}>
                      For: <strong style={{ color:'var(--a-text)' }}>{resetTarget.name}</strong>
                      <span style={{ fontFamily:'var(--a-mono)', marginLeft:6, color:'var(--a-t2)' }}>{resetTarget.email}</span>
                    </div>
                  </div>
                  <button className="abtn-icon" onClick={closeReset} disabled={resetBusy}>✕</button>
                </div>

                <div className="amodal-b">
                  {/* Warning banner */}
                  <div style={{ padding:'12px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
                    <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
                      This will <strong>generate a secure temporary password</strong> and force <strong>{resetTarget.name}</strong> to change it on their next login. The temporary password expires in <strong>24 hours</strong>.
                    </div>
                  </div>

                  {/* What happens */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      ['🔑', 'A strong random password is generated automatically'],
                      ['🔒', 'User is forced to change it on next login'],
                      ['⏱', 'Temporary password expires in 24 hours'],
                      ['📋', 'You copy and share the password with the employee'],
                    ].map(([icon, text]) => (
                      <div key={text} style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 10px', borderRadius:7, background:'var(--a-bg)' }}>
                        <span style={{ fontSize:14 }}>{icon}</span>
                        <span style={{ fontSize:12, color:'var(--a-t2)' }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="amodal-f">
                  <button className="abtn abtn-outline" onClick={closeReset} disabled={resetBusy}>Cancel</button>
                  <button
                    className="abtn"
                    style={{ background:'#d97706', color:'#fff', gap:6 }}
                    onClick={doReset}
                    disabled={resetBusy}>
                    {resetBusy
                      ? <><Spinner/> Generating…</>
                      : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> Generate &amp; Reset</>
                    }
                  </button>
                </div>
              </>
            ) : (
              /* ── Step 2: Show the temporary password ── */
              <>
                <div className="amodal-h">
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--a-text)' }}>Password Reset ✅</div>
                    <div style={{ fontSize:12, color:'var(--a-t3)', marginTop:2 }}>Share these credentials with <strong>{resetDone.user?.name || resetTarget.name}</strong></div>
                  </div>
                  <button className="abtn-icon" onClick={closeReset}>✕</button>
                </div>

                <div className="amodal-b">
                  {/* Success banner */}
                  <div style={{ padding:'12px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:20 }}>✅</span>
                    <span style={{ fontSize:13, color:'#166534', fontWeight:500 }}>
                      Temporary password generated. Share it securely with the employee.
                    </span>
                  </div>

                  {/* Credentials card */}
                  <div style={{ border:'1px solid var(--a-border)', borderRadius:10, overflow:'hidden' }}>
                    {/* Card header */}
                    <div style={{ padding:'8px 14px', background:'var(--a-bg)', borderBottom:'1px solid var(--a-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--a-t3)' }}>Temporary Login Credentials</span>
                      <button
                        className="abtn abtn-sm abtn-outline"
                        style={{ gap:5, fontSize:11 }}
                        onClick={() => copy(`Email: ${resetDone.user?.email || resetTarget.email}\nPassword: ${resetDone.temporaryPassword}`)}>
                        {copied
                          ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg> <span style={{ color:'#16a34a' }}>Copied!</span></>
                          : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> Copy All</>
                        }
                      </button>
                    </div>

                    {/* Credentials body */}
                    <div style={{ padding:'16px 18px', background:'var(--a-surf)' }}>
                      {/* Login URL */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'var(--a-t3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Portal URL</div>
                        <div style={{ fontFamily:'var(--a-mono)', fontSize:12, color:'var(--a-text)', padding:'7px 10px', background:'var(--a-bg)', borderRadius:6 }}>
                          {window.location.origin}/login
                        </div>
                      </div>
                      {/* Email */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'var(--a-t3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Email</div>
                        <div style={{ fontFamily:'var(--a-mono)', fontSize:13, color:'var(--a-text)', padding:'7px 10px', background:'var(--a-bg)', borderRadius:6 }}>
                          {resetDone.user?.email || resetTarget.email}
                        </div>
                      </div>
                      {/* Temp password — highlighted */}
                      <div>
                        <div style={{ fontSize:10, fontWeight:600, color:'var(--a-t3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Temporary Password</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, fontFamily:'var(--a-mono)', fontSize:18, fontWeight:800, color:'#4f52d4', padding:'10px 14px', background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:8, letterSpacing:'.04em' }}>
                            {resetDone.temporaryPassword}
                          </div>
                          <button
                            className="abtn-icon"
                            style={{ width:36, height:36, flexShrink:0, color: copied ? '#16a34a' : 'var(--a-t2)', borderColor: copied ? '#86efac' : 'var(--a-border)' }}
                            onClick={() => copy(resetDone.temporaryPassword)}
                            title="Copy password">
                            {copied
                              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expiry footer */}
                    <div style={{ padding:'8px 14px', background:'#fffbeb', borderTop:'1px solid #fde68a', fontSize:11, color:'#92400e' }}>
                      ⏱ Expires: <strong>{resetDone.tempPasswordExpiresAt ? new Date(resetDone.tempPasswordExpiresAt).toLocaleString('en-IN') : '24 hours from now'}</strong>
                    </div>
                  </div>

                  {/* Reminder */}
                  <div style={{ fontSize:11, color:'var(--a-t3)', padding:'4px 2px', lineHeight:1.6 }}>
                    💡 The employee will be <strong>forced to change this password</strong> the moment they log in. Advise them to check their email or contact you if they face issues.
                  </div>
                </div>

                <div className="amodal-f">
                  <button className="abtn abtn-primary" onClick={closeReset}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
