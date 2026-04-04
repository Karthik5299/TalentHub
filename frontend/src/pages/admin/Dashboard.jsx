import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import api from '../../services/api';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Tooltip,Legend,Filler);

const CO = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false},ticks:{color:'#9ca3af',font:{size:10,family:"'DM Mono',monospace"}}},y:{grid:{color:'#f3f4f6'},ticks:{color:'#9ca3af',font:{size:10,family:"'DM Mono',monospace"}}}} };
const Sk = ({w=80,h=22}) => <div className="askel" style={{width:w,height:h}}/>;

export default function AdminDash() {
  const [stats,  setStats]  = useState(null);
  const [pulse,  setPulse]  = useState([]);
  const [lstats, setLstats] = useState({pending:0,approved:0,declined:0});
  const [pay,    setPay]    = useState([]);
  const [busy,   setBusy]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/employees/stats'),
      api.get('/attendance/monthly-pulse'),
      api.get('/leaves/stats'),
      api.get('/payroll/summary'),
    ]).then(([s,p,l,py]) => {
      setStats(s.data.data || {});
      setPulse(p.data.data.pulse||[]);
      setLstats(l.data.data.stats || {pending:0,approved:0,declined:0});
      setPay(py.data.data.summary||[]);
    }).catch(()=>{}).finally(()=>setBusy(false));
  },[]);

  const M=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const pulseData = {
    labels: pulse.map(p=>p._id?.slice(5)),
    datasets:[
      {label:'Present',data:pulse.map(p=>p.present),borderColor:'#111827',backgroundColor:'rgba(17,24,39,.04)',fill:true,tension:.4,pointRadius:2,borderWidth:1.5},
      {label:'Absent', data:pulse.map(p=>p.absent), borderColor:'#e5e7eb',fill:false,tension:.4,pointRadius:2,borderWidth:1.5},
    ],
  };
  const deptData = {
    labels: stats?.byDepartment?.map(d=>d.name)||[],
    datasets:[{data:stats?.byDepartment?.map(d=>d.count)||[],backgroundColor:['#111827','#374151','#6b7280','#9ca3af','#d1d5db'],borderWidth:0}],
  };
  const payData = {
    labels: pay.map(p=>M[p.month]),
    datasets:[{data:pay.map(p=>Math.round((p.totalNet||0)/1000)),backgroundColor:'#111827',borderRadius:4,borderSkipped:false}],
  };

  const cards = [
    {label:'Employees',  val:stats?.total,             sub:`${stats?.active||0} active`,        color:'#111827'},
    {label:'Payroll/mo', val:stats?.payroll?.monthlyTotal?`₹${(stats.payroll.monthlyTotal/1000).toFixed(0)}K`:null, sub:'Monthly cost', color:'#16a34a'},
    {label:'Avg Salary', val:stats?.payroll?.averageSalary?`₹${(stats.payroll.averageSalary/1000).toFixed(1)}K`:null, sub:'Per employee', color:'#2563eb'},
    {label:'Pending Leaves',val:lstats.pending, sub:`${lstats.approved} approved`, color:'#d97706'},
  ];

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:26,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'var(--a-text)'}}>Dashboard</h1>
          <p style={{fontSize:12,color:'var(--a-t3)',fontFamily:'var(--a-mono)'}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['API','DB','Auth'].map(s=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 9px',background:'var(--a-surf)',border:'1px solid var(--a-border)',borderRadius:5,fontSize:11,fontFamily:'var(--a-mono)',color:'var(--a-t2)'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#16a34a'}}/>
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,marginBottom:22}}>
        {cards.map((c,i)=>(
          <div key={i} className="acard" style={{padding:18}}>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--a-t3)',marginBottom:9}}>{c.label}</div>
            {busy?<Sk w={90} h={28}/>:<div style={{fontSize:26,fontWeight:700,color:c.color,fontFamily:'var(--a-mono)',lineHeight:1,marginBottom:4}}>{c.val??'—'}</div>}
            <div style={{fontSize:11,color:'var(--a-t3)'}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
        <div className="acard" style={{padding:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div><div style={{fontSize:13,fontWeight:600}}>Attendance Pulse</div><div style={{fontSize:10,color:'var(--a-t3)',fontFamily:'var(--a-mono)'}}>This month</div></div>
            <div style={{display:'flex',gap:12}}>
              {[{l:'Present',c:'#111827'},{l:'Absent',c:'#e5e7eb'}].map(x=>(
                <div key={x.l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--a-t3)'}}>
                  <div style={{width:18,height:2,background:x.c,borderRadius:1}}/>{x.l}
                </div>
              ))}
            </div>
          </div>
          <div style={{height:190}}>{pulse.length?<Line data={pulseData} options={CO}/>:<Empty label="No data yet"/>}</div>
        </div>
        <div className="acard" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>By Department</div>
          <div style={{fontSize:10,color:'var(--a-t3)',fontFamily:'var(--a-mono)',marginBottom:14}}>Headcount</div>
          <div style={{height:155}}>
            {(stats?.byDepartment?.length||0)>0
              ?<Doughnut data={deptData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:9,family:"'DM Mono',monospace"},color:'#9ca3af',boxWidth:8,padding:10}}},cutout:'65%'}}/>
              :<Empty label="No departments"/>}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="acard" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Payroll Trend</div>
          <div style={{fontSize:10,color:'var(--a-t3)',fontFamily:'var(--a-mono)',marginBottom:14}}>Net payout (₹K)</div>
          <div style={{height:150}}><Bar data={payData} options={CO}/></div>
        </div>

        <div className="acard" style={{padding:18}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Leave Overview</div>
          {[{l:'Approved',v:lstats.approved,c:'#16a34a'},{l:'Pending',v:lstats.pending,c:'#d97706'},{l:'Declined',v:lstats.declined,c:'#dc2626'}].map(item=>{
            const tot=(lstats.approved+lstats.pending+lstats.declined)||1;
            const pct=Math.round((item.v/tot)*100);
            return(
              <div key={item.l} style={{marginBottom:13}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'var(--a-t2)'}}>{item.l}</span>
                  <span style={{fontSize:12,fontFamily:'var(--a-mono)',fontWeight:500,color:'var(--a-text)'}}>{item.v}</span>
                </div>
                <div style={{height:4,background:'#f3f4f6',borderRadius:2,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:item.c,borderRadius:2,transition:'width .8s ease'}}/>
                </div>
              </div>
            );
          })}
          {(stats?.recentHires?.length||0)>0&&(<>
            <div className="adivider"/>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--a-t3)',marginBottom:9}}>Recent Hires</div>
            {stats.recentHires.slice(0,3).map(e=>(
              <div key={e._id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'#111827',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>{e.firstName?.charAt(0)}{e.lastName?.charAt(0)}</div>
                <div><div style={{fontSize:12,fontWeight:500,color:'var(--a-text)'}}>{e.firstName} {e.lastName}</div><div style={{fontSize:10,color:'var(--a-t3)',fontFamily:'var(--a-mono)'}}>{e.department?.name}</div></div>
              </div>
            ))}
          </>)}
        </div>
      </div>
    </div>
  );
}
function Empty({label}){return <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#d1d5db',fontFamily:"'DM Mono',monospace"}}>{label}</div>;}
