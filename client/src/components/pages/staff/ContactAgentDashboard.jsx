import React, { useState, useEffect } from 'react';
import StaffRouteGuard from '../../../components/staff/StaffRouteGuard.jsx';
import staffAxios from '../../../components/api/staffAxios.js';

export default function ContactAgentDashboard() {
  return <StaffRouteGuard requiredRole='contact_agent'><Content /></StaffRouteGuard>;
}

function Content() {
  const [tab, setTab] = useState('Messages');
  const logout = () => { localStorage.removeItem('staff_token'); window.location.href = '/staff/login'; };
  return (
    <div style={{minHeight:'100vh',background:'#F8F6FF',fontFamily:'sans-serif'}}>
      <nav style={{background:'#fff',borderBottom:'1.5px solid #EDE9FE',padding:'0 28px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <span style={{fontWeight:800,fontSize:'18px',color:'#7C3AED'}}>CAREAL <span style={{fontSize:'10px',background:'#EDE9FE',color:'#7C3AED',padding:'3px 8px',borderRadius:'100px',verticalAlign:'middle'}}>Contact Agent</span></span>
        <button onClick={logout} style={{fontSize:'13px',fontWeight:600,color:'#7C3AED',background:'#F5F3FF',border:'1.5px solid #EDE9FE',padding:'7px 14px',borderRadius:'10px',cursor:'pointer'}}>Log out</button>
      </nav>
      <div style={{background:'#fff',borderBottom:'1.5px solid #EDE9FE',padding:'0 28px',display:'flex',gap:4}}>
        {['Messages','Orders'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{padding:'12px 18px',fontSize:'13px',fontWeight:600,background:'none',border:'none',borderBottom:tab===t?'2px solid #7C3AED':'2px solid transparent',color:tab===t?'#7C3AED':'#7C7CA0',cursor:'pointer'}}>{t}</button>
        ))}
      </div>
      <div style={{maxWidth:'1000px',margin:'0 auto',padding:'28px 24px'}}>
        {tab === 'Messages' && <MessagesPanel />}
        {tab === 'Orders' && <OrdersPanel />}
      </div>
    </div>
  );
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
  const loadThreads=()=>{setLoading(true);staffAxios.get('/messages/staff').then(r=>{setThreads(Array.isArray(r.data)?r.data:[]);setLoading(false);}).catch(()=>{setErr('Could not load messages.');setLoading(false);});};
  useEffect(loadThreads,[]);
  const open=t=>{setSel(t);setSendErr('');staffAxios.get('/messages/staff/'+t.threadId).then(r=>setMsgs(r.data.messages||[])).catch(()=>setErr('Could not load thread.'));};
  const send=async()=>{if(!reply.trim()||!sel)return;setSending(true);setSendErr('');try{await staffAxios.post('/messages/staff/'+sel.threadId+'/reply',{message:reply});setReply('');staffAxios.get('/messages/staff/'+sel.threadId).then(r=>setMsgs(r.data.messages||[]));}catch{setSendErr('Could not send reply.');}finally{setSending(false);}}
  const closeThread=async()=>{if(!sel)return;try{await staffAxios.patch('/messages/staff/'+sel.threadId+'/close');setSel(null);loadThreads();}catch{setErr('Could not close thread.');}}
  return (
    <div style={{display:'flex',gap:16,minHeight:420}}>
      <div style={{width:230,flexShrink:0,borderRight:'1.5px solid #EDE9FE',paddingRight:12,overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:'13px',color:'#1E1040'}}>Threads</span>
          <button onClick={loadThreads} style={{padding:'3px 8px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'6px',fontSize:'11px',cursor:'pointer'}}>&#8635;</button>
        </div>
        {err && <div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'8px',padding:'8px',fontSize:'12px',marginBottom:8}}>{err}</div>}
        {loading ? <p style={{color:'#9CA3AF',fontSize:'13px'}}>Loading…</p> : threads.length===0 ? <p style={{color:'#9CA3AF',fontSize:'13px'}}>No open threads.</p> :
          threads.map(t => (
            <div key={t.threadId} onClick={()=>open(t)} style={{padding:'9px 10px',borderRadius:'8px',cursor:'pointer',marginBottom:5,border:'1px solid #EDE9FE',background:sel?.threadId===t.threadId?'#EDE9FE':'#F8F6FF'}}>
              <div style={{fontWeight:600,fontSize:'12px',color:'#1E1040'}}>{t.subject}</div>
              {t.lastMessage&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>{new Date(t.lastMessage).toLocaleDateString()}</div>}
            </div>
          ))
        }
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        {!sel ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF',fontSize:'14px'}}>Select a thread</div> : (<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <strong style={{fontSize:'14px'}}>{sel.subject}</strong>
            <button onClick={closeThread} style={{padding:'4px 12px',background:'#FEE2E2',color:'#B91C1C',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>Close Thread</button>
          </div>
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,paddingBottom:8}}>
            {msgs.map(m=>(<div key={m.id} style={{display:'flex',justifyContent:m.sender_type==='staff'?'flex-end':'flex-start'}}><div style={{maxWidth:'75%',padding:'8px 12px',borderRadius:m.sender_type==='staff'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.sender_type==='staff'?'#7C3AED':'#F3F4F6',color:m.sender_type==='staff'?'#fff':'#1a1a1a',fontSize:'13px'}}>{m.body}</div></div>))}
          </div>
          {sendErr && <div style={{background:'#FEF2F2',color:'#B91C1C',padding:'8px',borderRadius:'8px',fontSize:'12px',marginBottom:8}}>{sendErr}</div>}
          <div style={{display:'flex',gap:8}}>
            <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={2} placeholder='Type reply…' style={{flex:1,padding:'8px 12px',border:'1.5px solid #EDE9FE',borderRadius:'10px',resize:'none',fontSize:'13px',fontFamily:'inherit'}}/>
            <button onClick={send} disabled={!reply.trim()||sending} style={{padding:'0 16px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'10px',fontWeight:600,fontSize:'13px',cursor:'pointer'}}>{sending?'…':'Send'}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

function OrdersPanel() {
  const [orders,setOrders]=useState([]);
  const [agents,setAgents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const load=()=>{setLoading(true);staffAxios.get('/orders?status=assigned').then(r=>{const d=r.data;setOrders(Array.isArray(d)?d:d.orders||[]);setLoading(false);}).catch(()=>{setErr('Could not load orders.');setLoading(false);});};
  useEffect(()=>{load();staffAxios.get('/agents').then(r=>setAgents(Array.isArray(r.data)?r.data:r.data.agents||[])).catch(()=>{});},[]);
  const assign=async(id,aid)=>{if(!aid)return;try{await staffAxios.post('/orders/'+id+'/assign',{agent_id:aid});load();}catch{setErr('Assignment failed.');}}
  const updateStatus=async(id,status)=>{if(!status)return;try{await staffAxios.patch('/orders/'+id+'/status',{status});load();}catch{setErr('Status update failed.');}}
  return (
    <div>
      <h2 style={{fontWeight:800,fontSize:'18px',color:'#1E1040',marginBottom:16}}>Order Management</h2>
      {err && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',color:'#B91C1C',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',marginBottom:12}}>{err}</div>}
      {loading ? <p style={{color:'#9CA3AF'}}>Loading…</p> : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead><tr>{['ID','Plate','Status','Delivery','Assign Agent','Mark Status'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#7C7CA0',fontSize:'11px',textTransform:'uppercase',borderBottom:'1.5px solid #EDE9FE',background:'#F8F6FF'}}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.length===0 && <tr><td colSpan={6} style={{padding:'20px',textAlign:'center',color:'#9CA3AF'}}>No orders.</td></tr>}
              {orders.map(o=>(<tr key={o.id}>
                <td style={{padding:'11px 14px',borderBottom:'1px solid #F3F0FF'}}>{String(o.id).slice(0,8)}</td>
                <td style={{padding:'11px 14px',borderBottom:'1px solid #F3F0FF'}}>{o.plate_number}</td>
                <td style={{padding:'11px 14px',borderBottom:'1px solid #F3F0FF'}}><span style={{background:'#EDE9FE',color:'#7C3AED',padding:'3px 8px',borderRadius:'100px',fontSize:'11px',fontWeight:600}}>{o.status}</span></td>
                <td style={{padding:'11px 14px',borderBottom:'1px solid #F3F0FF'}}>{o.delivery_method==='agent_delivery'?'Delivery':'Collection'}</td>
                <td style={{padding:'11px 14px',borderBottom:'1px solid #F3F0FF'}}><select defaultValue='' onChange={e=>assign(o.id,e.target.value)} style={{padding:'5px 8px',border:'1.5px solid #EDE9FE',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}><option value='' disabled>Select</option>{agents.map(a=><option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}</select></td>
                <td style={{padding:'11px 14px',borderBottom:'1px solid #F3F0FF'}}><select defaultValue='' onChange={e=>updateStatus(o.id,e.target.value)} style={{padding:'5px 8px',border:'1.5px solid #EDE9FE',borderRadius:'8px',fontSize:'12px',cursor:'pointer'}}><option value='' disabled>Update</option><option value='delivered'>delivered</option><option value='collected'>collected</option></select></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
