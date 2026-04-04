import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminEmployees() {
  const [rows,   setRows]   = useState([]);
  const [depts,  setDepts]  = useState([]);
  const [busy,   setBusy]   = useState(true);
  const [search, setSearch] = useState('');
  const [sf,     setSf]     = useState('');
  const [df,     setDf]     = useState('');
  const [page,   setPage]   = useState(1);
  const [total,  setTotal]  = useState(0);
  const [modal,  setModal]  = useState(null);
  const [sel,    setSel]    = useState(null);
  const [saving, setSaving] = useState(false);
  const LIM = 15;
  const blank = {firstName:'',lastName:'',email:'',phone:'',department:'',position:'',salary:'',joiningDate:new Date().toISOString().slice(0,10),status:'active'};
  const [form, setForm] = useState(blank);
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const load = useCallback(async()=>{
    setBusy(true);
    try{
      const p={page,limit:LIM};
      if(search)p.search=search; if(sf)p.status=sf; if(df)p.department=df;
      const {data}=await api.get('/employees',{params:p});
      setRows(data.data || []); setTotal(data.pagination?.total || 0);
    }catch{}finally{setBusy(false);}
  },[page,search,sf,df]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{api.get('/departments').then(r=>setDepts(r.data.data.departments||[])).catch(()=>{});},[]);

  const openCreate=()=>{setForm(blank);setSel(null);setModal('form');};
  const openEdit=e=>{setForm({firstName:e.firstName,lastName:e.lastName,email:e.email,phone:e.phone||'',department:e.department?._id||'',position:e.position,salary:e.salary,joiningDate:e.joiningDate?.slice(0,10)||'',status:e.status});setSel(e);setModal('form');};
  const save=async()=>{
    if(!form.firstName||!form.lastName||!form.email||!form.department||!form.position||!form.salary){toast.error('Fill required fields');return;}
    setSaving(true);
    try{
      sel?await api.put(`/employees/${sel._id}`,form):await api.post('/employees',form);
      toast.success(sel?'Updated':'Onboarded!');setModal(null);load();
    }catch{}finally{setSaving(false);}
  };
  const offboard=async e=>{
    if(!window.confirm(`Offboard ${e.firstName}?`))return;
    try{await api.delete(`/employees/${e._id}`);toast.success('Offboarded');load();}catch{}
  };

  const SB={active:'ab-green',inactive:'ab-amber',terminated:'ab-red'};
  const pages=Math.ceil(total/LIM);

  return(
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div><h1 style={{fontSize:20,fontWeight:700,color:'var(--a-text)'}}>Employees</h1><p style={{fontSize:12,color:'var(--a-t3)'}}>{total} total</p></div>
        <button className="abtn abtn-primary" onClick={openCreate}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Onboard
        </button>
      </div>

      {/* Filters */}
      <div className="acard" style={{padding:'10px 14px',marginBottom:14,display:'flex',gap:9,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:170}}>
          <svg style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--a-t3)'}} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input className="ainput" style={{paddingLeft:27}} placeholder="Search name, email, code…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="ainput" style={{width:150}} value={df} onChange={e=>{setDf(e.target.value);setPage(1);}}>
          <option value="">All Departments</option>{depts.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="ainput" style={{width:120}} value={sf} onChange={e=>{setSf(e.target.value);setPage(1);}}>
          <option value="">All Status</option>
          <option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option>
        </select>
        {(search||df||sf)&&<button className="abtn abtn-outline abtn-sm" onClick={()=>{setSearch('');setDf('');setSf('');setPage(1);}}>Clear</button>}
      </div>

      <div className="acard" style={{overflow:'hidden'}}>
        <div className="tscroll">
          <table className="atable">
            <thead><tr><th>Employee</th><th>Code</th><th>Dept</th><th>Position</th><th>Salary</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
            <tbody>
              {busy?Array.from({length:8}).map((_,i)=>(
                <tr key={i}>{[140,60,80,100,70,60,80].map((w,j)=><td key={j}><div className="askel" style={{height:11,width:w}}/></td>)}</tr>
              )):rows.length===0?<tr><td colSpan={7}><div className="aempty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#d1d5db" strokeWidth="2"/></svg>No employees found</div></td></tr>
              :rows.map(e=>(
                <tr key={e._id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'#111827',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',flexShrink:0}}>{e.firstName?.charAt(0)}{e.lastName?.charAt(0)}</div>
                      <div><div style={{fontWeight:500,color:'var(--a-text)',fontSize:13}}>{e.firstName} {e.lastName}</div><div style={{fontSize:11,color:'var(--a-t3)'}}>{e.email}</div></div>
                    </div>
                  </td>
                  <td><span className="atag">{e.employeeCode}</span></td>
                  <td>{e.department?.name||'—'}</td>
                  <td style={{color:'var(--a-text)'}}>{e.position}</td>
                  <td style={{fontFamily:'var(--a-mono)',fontWeight:500,color:'#16a34a'}}>₹{Number(e.salary).toLocaleString('en-IN')}</td>
                  <td><span className={`abadge ${SB[e.status]||'ab-gray'}`}>{e.status}</span></td>
                  <td>
                    <div style={{display:'flex',justifyContent:'flex-end',gap:5}}>
                      <button className="abtn abtn-outline abtn-sm" onClick={()=>openEdit(e)}>Edit</button>
                      <button className="abtn abtn-danger abtn-sm" onClick={()=>offboard(e)}>Offboard</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages>1&&<div className="apag">{['‹',...Array.from({length:Math.min(pages,7)},(_,i)=>i+1),'›'].map((p,i)=>{
          const isNum=typeof p==='number';
          return<button key={i} className={`apg ${isNum&&page===p?'on':''}`}
            onClick={()=>{if(p==='‹')setPage(x=>Math.max(1,x-1));else if(p==='›')setPage(x=>Math.min(pages,x+1));else setPage(p);}}>{p}</button>;
        })}<span style={{fontSize:11,color:'var(--a-t3)',fontFamily:'var(--a-mono)',marginLeft:6}}>of {total}</span></div>}
      </div>

      {modal==='form'&&(
        <div className="aoverlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="amodal">
            <div className="amodal-h"><div style={{fontWeight:600,fontSize:15}}>{sel?'Edit Employee':'Onboard Employee'}</div><button className="abtn-icon" onClick={()=>setModal(null)}>✕</button></div>
            <div className="amodal-b">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11}}>
                {[['First Name *','firstName','text','John'],['Last Name *','lastName','text','Doe'],['Phone','phone','tel','+91…']].map(([l,k,t,p])=>(
                  <div key={k}><label className="alabel">{l}</label><input className="ainput" type={t} placeholder={p} value={form[k]} onChange={F(k)}/></div>
                ))}
                <div style={{gridColumn:'1/-1'}}><label className="alabel">Email *</label><input className="ainput" type="email" value={form.email} onChange={F('email')} placeholder="john@co.com"/></div>
                <div><label className="alabel">Department *</label>
                  <select className="ainput" value={form.department} onChange={F('department')}>
                    <option value="">Select…</option>{depts.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label className="alabel">Status</label>
                  <select className="ainput" value={form.status} onChange={F('status')}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
                {[['Position *','position','text','Software Engineer'],['Salary (₹) *','salary','number','50000'],['Joining Date','joiningDate','date','']].map(([l,k,t,p])=>(
                  <div key={k}><label className="alabel">{l}</label><input className="ainput" type={t} placeholder={p} value={form[k]} onChange={F(k)}/></div>
                ))}
              </div>
            </div>
            <div className="amodal-f">
              <button className="abtn abtn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="abtn abtn-primary" onClick={save} disabled={saving}>{saving?<><div className="aspinner"/>Saving…</>:sel?'Save':'Onboard'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
