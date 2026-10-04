import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffRouteGuard from '../../../components/staff/StaffRouteGuard.jsx';
import staffAxios from '../../../components/api/staffAxios.js';
import { validateInviteForm, validatePrice } from '../../../utils/validation.js';

const TABS = ['Orders','Agents','Prices','Messages'];

export default function SuperAdminDashboard() {
  return <StaffRouteGuard requiredRole='super_admin'><SAContent /></StaffRouteGuard>;
}

function SAContent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Orders');
  const logout = () => { localStorage.removeItem('staff_token'); navigate('/staff/login'); };
  return (
    <div style={{minHeight:'100vh',background:'#F8F6FF',fontFamily:'sans-serif'}}>
      <nav style={{background:'#fff',borderBottom:'1.5px solid #EDE9FE',padding:'0 28px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <span style={{fontWeight:800,fontSize:'18px',color:'#7C3AED'}}>CAREAL <span style={{fontSize:'10px',background:'#EDE9FE',color:'#7C3AED',padding:'3px 8px',borderRadius:'100px',verticalAlign:'middle'}}>Super Admin</span></span>
        <button onClick={logout} style={{fontSize:'13px',fontWeight:600,color:'#7C3AED',background:'#F5F3FF',border:'1.5px solid #EDE9FE',padding:'7px 14px',borderRadius:'10px',cursor:'pointer'}}>Log out</button>
      </nav>
      <div style={{background:'#fff',borderBottom:'1.5px solid #EDE9FE',padding:'0 28px',display:'flex',gap:4}}>
        {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'12px 18px',fontSize:'13px',fontWeight:600,background:'none',border:'none',borderBottom:tab===t?'2px solid #7C3AED':'2px solid transparent',color:tab===t?'#7C3AED':'#7C7CA0',cursor:'pointer'}}>{t}</button>)}
      </div>
      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'28px 24px'}}>
        {tab==='Orders' && <OrdersPanel/>}
        {tab==='Agents' && <AgentsPanel/>}
        {tab==='Prices' && <PricesPanel/>}
        {tab==='Messages' && <MessagesPanel/>}
      </div>
    </div>
  );
}

function OrdersPanel() {
  const [orders,setOrders]=useState([]);
  const [agents,setAgents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [sf,setSf]=useState('');
  const [df,setDf]=useState('');
  const load=async()=>{
    setLoading(true);setError('');
    try{const p=new URLSearchParams();if(sf)p.set('status',sf);if(df)p.set('delivery_method',df);
      const r=await staffAxios.get('/orders?'+p.toString());
      const d=r.data;setOrders(Array.isArray(d)?d:d.orders||[]);
    }catch{setError('Orders could not be loaded.');}finally{setLoading(false);}
  };
  useEffect(()=>{load();},[sf,df]);
  useEffect(()=>{staffAxios.get('/agents').then(r=>setAgents(Array.isArray(r.data)?r.data:r.data.agents||[])).catch(()=>{});},[]);
  const assign=async(id,aid)=>{if(!aid)return;try{await staffAxios.post('/orders/'+id+'/assign',{agent_id:aid});load();}catch{setError('Assignment failed.');}};
  const TH={padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#7C7CA0',fontSize:'11px',textTransform:'uppercase',borderBottom:'1.5px solid #EDE9FE',background:'#F8F6FF'};
  const TD={padding:'11px 14px',borderBottom:'1px solid #F3F0FF',color:'#1E1040',verticalAlign:'middle'};
  return (<div>
    <h2 style={{fontWeight:800,fontSize:'18px',color:'#1E1040',marginBottom:16}}>Orders</h2>
    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
      <select value={sf} onChange={e=>setSf(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid #EDE9FE',borderRadius:'10px',fontSize:'13px',background:'#fff',cursor:'pointer'}}>
        <option value=''>All Statuses</option>
        {['paid','assigned','in_progress','ready_for_delivery','ready_for_pickup','delivered','collected'].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <select value={df} onChange={e=>setDf(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid #EDE9FE',borderRadius:'10px',fontSize:'13px',background:'#fff',cursor:'pointer'}}>
        <option value=''>All Delivery Methods</option>
        <option value='agent_delivery'>Delivery</option>
        <option value='personal_collection'>Collection</option>
      </select>
      <button onClick={load} style={{padding:'8px 16px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Refresh</button>
    </div>
    {error&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',marginBottom:12}}>{error}</div>}
    {loading?<p style={{color:'#9CA3AF'}}>Loadingï¿½</p>:(<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
      <thead><tr>{['ID','Plate','Status','Delivery','Agent','Assign'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
      <tbody>
        {orders.length===0&&<tr><td colSpan={6} style={{...TD,textAlign:'center',color:'#9CA3AF'}}>No orders found.</td></tr>}
        {orders.map(o=>(<tr key={o.id}>
          <td style={TD}>{String(o.id).slice(0,8)}</td>
          <td style={TD}>{o.plate_number}</td>
          <td style={TD}><span style={{background:'#EDE9FE',color:'#7C3AED',padding:'3px 8px',borderRadius:'100px',fontSize:'11px',fontWeight:600}}>{o.status}</span></td>
          <td style={TD}>{o.delivery_method==='agent_delivery'?'Delivery':'Collection'}</td>
          <td style={TD}>{o.assigned_agent?o.assigned_agent.first_name+' '+o.assigned_agent.last_name:'ï¿½'}</td>
          <td style={TD}>{!o.assigned_agent&&<select defaultValue='' onChange={e=>assign(o.id,e.target.value)} style={{padding:'5px 8px',border:'1.5px solid #EDE9FE',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}><option value='' disabled>Select agent</option>{agents.map(a=><option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}</select>}</td>
        </tr>))}
      </tbody></table></div>)}
  </div>);
}

function AgentsPanel() {
  const [agents,setAgents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [form,setForm]=useState({first_name:'',last_name:'',email:'',role:'contact_agent'});
  const [invErr,setInvErr]=useState('');
  const [invOk,setInvOk]=useState('');
  const [inviting,setInviting]=useState(false);
  const load=()=>{setLoading(true);staffAxios.get('/agents').then(r=>{setAgents(Array.isArray(r.data)?r.data:r.data.agents||[]);setLoading(false);}).catch(()=>{setError('Could not load agents.');setLoading(false);});};
  useEffect(load,[]);
  const invite=async(e)=>{e.preventDefault();setInvErr('');setInvOk('');const ve=validateInviteForm(form);if(ve){setInvErr(ve.message);return;}setInviting(true);try{await staffAxios.post('/agents/invite',form);setInvOk('Invite sent to '+form.email);setForm({first_name:'',last_name:'',email:'',role:'contact_agent'});load();}catch(err){setInvErr(err.response?.data?.message||'Failed to send invite.');}finally{setInviting(false);}}
  const revoke=async id=>{try{await staffAxios.patch('/agents/'+id+'/revoke');load();}catch{setError('Revoke failed.');}};
  const reactivate=async id=>{try{await staffAxios.patch('/agents/'+id+'/reactivate');load();}catch{setError('Reactivate failed.');}};
  const TH={padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#7C7CA0',fontSize:'11px',textTransform:'uppercase',borderBottom:'1.5px solid #EDE9FE',background:'#F8F6FF'};
  const TD={padding:'11px 14px',borderBottom:'1px solid #F3F0FF',color:'#1E1040',verticalAlign:'middle'};
  const INP={padding:'10px 14px',border:'1.5px solid #EDE9FE',borderRadius:'10px',fontSize:'14px',color:'#1E1040',background:'#FAFAFE',outline:'none',boxSizing:'border-box'};
  const BTN={padding:'8px 16px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer'};
  return (<div>
    <h2 style={{fontWeight:800,fontSize:'18px',color:'#1E1040',marginBottom:16}}>Agents</h2>
    {error&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'10px',padding:'10px',fontSize:'13px',marginBottom:12}}>{error}</div>}
    {loading?<p style={{color:'#9CA3AF'}}>Loadingï¿½</p>:(<div style={{overflowX:'auto',marginBottom:28}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
      <thead><tr>{['Name','Email','Role','Status','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
      <tbody>{agents.map(a=>(<tr key={a.id}>
        <td style={TD}>{a.first_name} {a.last_name}</td>
        <td style={TD}>{a.email}</td>
        <td style={TD}>{a.role}</td>
        <td style={TD}><span style={{background:a.is_active===false?'#FEE2E2':'#DCFCE7',color:a.is_active===false?'#B91C1C':'#15803D',padding:'3px 8px',borderRadius:'100px',fontSize:'11px',fontWeight:600}}>{a.is_active===false?'Revoked':'Active'}</span></td>
        <td style={TD}>{a.is_active===false?<button onClick={()=>reactivate(a.id)} style={BTN}>Reactivate</button>:<button onClick={()=>revoke(a.id)} style={{...BTN,background:'#FEE2E2',color:'#B91C1C'}}>Revoke</button>}</td>
      </tr>))}</tbody>
    </table></div>)}
    <div style={{background:'#fff',border:'1.5px solid #EDE9FE',borderRadius:'16px',padding:'24px'}}>
      <h3 style={{fontSize:'15px',fontWeight:700,color:'#1E1040',marginBottom:14}}>Invite Staff Member</h3>
      {invErr&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'10px',padding:'10px',fontSize:'13px',marginBottom:10}}>{invErr}</div>}
      {invOk&&<div style={{background:'#F0FDF4',color:'#15803D',borderRadius:'10px',padding:'10px',fontSize:'13px',marginBottom:10}}>{invOk}</div>}
      <form onSubmit={invite} style={{display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <input placeholder='First name' value={form.first_name} onChange={e=>setForm(p=>({...p,first_name:e.target.value}))} style={INP}/>
          <input placeholder='Last name' value={form.last_name} onChange={e=>setForm(p=>({...p,last_name:e.target.value}))} style={INP}/>
        </div>
        <input type='email' placeholder='Email address' value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={INP}/>
        <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{padding:'10px 14px',border:'1.5px solid #EDE9FE',borderRadius:'10px',fontSize:'14px',background:'#fff',cursor:'pointer'}}>
          <option value='contact_agent'>Contact Agent</option>
          <option value='field_agent'>Field Agent</option>
        </select>
        <button type='submit' style={{...BTN,padding:'12px'}} disabled={inviting}>{inviting?'Sendingï¿½':'Send Invite'}</button>
      </form>
    </div>
  </div>);
}

function PricesPanel() {
  const API_BASE = import.meta.env.VITE_API_BASE || '/api';
  const [prices,setPrices]=useState(null);
  const [vals,setVals]=useState({});
  const [saving,setSaving]=useState({});
  const [errs,setErrs]=useState({});
  const [oks,setOks]=useState({});
  useEffect(()=>{fetch(API_BASE+'/prices').then(r=>r.json()).then(d=>{setPrices(d);setVals({licence:d.licence?.price,road_worthiness:d.road_worthiness?.price,insurance:d.insurance?.price});}).catch(()=>{});},[]);
  const save=async key=>{
    const ve=validatePrice(vals[key]);if(ve){setErrs(p=>({...p,[key]:ve}));return;}
    setErrs(p=>({...p,[key]:''}));setSaving(p=>({...p,[key]:true}));
    try{await staffAxios.put('/prices/'+key,{price:Number(vals[key])});
      setPrices(p=>({...p,[key]:{...p[key],price:Number(vals[key])}}));
      setOks(p=>({...p,[key]:'Saved!'}));setTimeout(()=>setOks(p=>({...p,[key]:''})),2500);
    }catch{setErrs(p=>({...p,[key]:'Save failed.'}));}finally{setSaving(p=>({...p,[key]:false}));}
  };
  const KEYS=[['licence','Vehicle Licence'],['road_worthiness','Road Worthiness'],['insurance','Motor Insurance']];
  return (<div><h2 style={{fontWeight:800,fontSize:'18px',color:'#1E1040',marginBottom:16}}>Service Prices</h2>
    {!prices?<p style={{color:'#9CA3AF'}}>Loadingï¿½</p>:(<div style={{display:'flex',flexDirection:'column',gap:14}}>
      {KEYS.map(([key,label])=>(<div key={key} style={{background:'#fff',border:'1.5px solid #EDE9FE',borderRadius:'16px',padding:'20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontWeight:600,color:'#1E1040'}}>{label}</span><span style={{color:'#7C3AED',fontWeight:700,fontSize:'18px'}}>&#8358;{prices[key]?.price?.toLocaleString()}</span></div>
        <div style={{display:'flex',gap:8,alignItems:'flex-start',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:120}}><input type='number' value={vals[key]||''} onChange={e=>setVals(p=>({...p,[key]:e.target.value}))} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #EDE9FE',borderRadius:'10px',fontSize:'14px',color:'#1E1040',background:'#FAFAFE',outline:'none',boxSizing:'border-box'}} placeholder='New price'/>{errs[key]&&<span style={{fontSize:'12px',color:'#DC2626'}}>{errs[key]}</span>}</div>
          <button onClick={()=>save(key)} style={{padding:'10px 16px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer'}} disabled={saving[key]}>{saving[key]?'Savingï¿½':'Save'}</button>
          {oks[key]&&<span style={{color:'#15803D',fontSize:'13px',alignSelf:'center'}}>&#10003; {oks[key]}</span>}
        </div>
      </div>))}
    </div>)}
  </div>);
}

function MessagesPanel() {
  const [threads,setThreads]=useState([]);
  const [sel,setSel]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [reply,setReply]=useState('');
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [sending,setSending]=useState(false);
  const [sendErr,setSendErr]=useState('');
  const load=()=>{setLoading(true);staffAxios.get('/messages/staff').then(r=>{setThreads(Array.isArray(r.data)?r.data:[]);setLoading(false);}).catch(()=>{setErr('Could not load messages.');setLoading(false);});};
  useEffect(load,[]); 
  const open=t=>{setSel(t);setSendErr('');staffAxios.get('/messages/staff/'+t.threadId).then(r=>setMsgs(r.data.messages||[])).catch(()=>setErr('Could not load thread.'));};
  const send=async()=>{if(!reply.trim()||!sel)return;setSending(true);setSendErr('');try{await staffAxios.post('/messages/staff/'+sel.threadId+'/reply',{message:reply});setReply('');staffAxios.get('/messages/staff/'+sel.threadId).then(r=>setMsgs(r.data.messages||[]));}catch{setSendErr('Could not send reply.');}finally{setSending(false);}};
  const close=async()=>{if(!sel)return;try{await staffAxios.patch('/messages/staff/'+sel.threadId+'/close');setSel(null);load();}catch{setErr('Could not close.');}};
  return(<div style={{display:'flex',gap:16,minHeight:420}}>
    <div style={{width:230,flexShrink:0,borderRight:'1.5px solid #EDE9FE',paddingRight:12,overflowY:'auto'}}>>      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontWeight:700,fontSize:'13px'}}>Threads</span><button onClick={load} style={{padding:'3px 8px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'6px',fontSize:'11px',cursor:'pointer'}}>&#8635;</button></div>
      {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'8px',padding:'8px',fontSize:'12px',marginBottom:8}}>{err}</div>}
      {loading?<p style={{color:'#9CA3AF',fontSize:'13px'}}>Loading…</p>:threads.length===0?<p style={{color:'#9CA3AF',fontSize:'13px'}}>No threads.</p>:threads.map(t=>(<div key={t.threadId} onClick={()=>open(t)} style={{padding:'9px 10px',borderRadius:'8px',cursor:'pointer',marginBottom:5,border:'1px solid #EDE9FE',background:sel?.threadId===t.threadId?'#EDE9FE':'#F8F6FF'}}><div style={{fontWeight:600,fontSize:'12px',color:'#1E1040'}}>{t.subject}</div>{t.lastMessage&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>{new Date(t.lastMessage).toLocaleDateString()}</div>}</div>))}
    </div>
    <div style={{flex:1,display:'flex',flexDirection:'column'}}>
      {!sel?<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF'}}>Select a thread</div>:(<>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><strong style={{fontSize:'14px'}}>{sel.subject}</strong><button onClick={close} style={{padding:'4px 12px',background:'#FEE2E2',color:'#B91C1C',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>Close Thread</button></div>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,paddingBottom:8}}>{msgs.map(m=>(<div key={m.id} style={{display:'flex',justifyContent:m.sender_type==='staff'?'flex-end':'flex-start'}}><div style={{maxWidth:'75%',padding:'8px 12px',borderRadius:m.sender_type==='staff'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.sender_type==='staff'?'#7C3AED':'#F3F4F6',color:m.sender_type==='staff'?'#fff':'#1a1a1a',fontSize:'13px'}}>{m.body}</div></div>))}</div>
        {sendErr&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'8px',borderRadius:'8px',fontSize:'12px',marginBottom:8}}>{sendErr}</div>}
        <div style={{display:'flex',gap:8}}><textarea value={reply} onChange={e=>setReply(e.target.value)} rows={2} placeholder='Type reply…' style={{flex:1,padding:'8px 12px',border:'1.5px solid #EDE9FE',borderRadius:'10px',resize:'none',fontSize:'13px',fontFamily:'inherit'}}/><button onClick={send} disabled={!reply.trim()||sending} style={{padding:'0 16px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'10px',fontWeight:600,fontSize:'13px',cursor:'pointer'}}>{sending?'…':'Send'}</button></div>
      </>)}
    </div>
  </div>);
}
