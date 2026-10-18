import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffRouteGuard from '../../../components/staff/StaffRouteGuard.jsx';
import staffAxios from '../../../components/api/staffAxios.js';

export default function FieldAgentDashboard() {
  return <StaffRouteGuard requiredRole='field_agent'><FAContent /></StaffRouteGuard>;
}

function FAContent() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [pending, setPending] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [pendingErr, setPendingErr] = useState('');
  const [myErr, setMyErr] = useState('');
  const [pickMsgs, setPickMsgs] = useState({});
  const [picking, setPicking] = useState({});
  const [statusErr, setStatusErr] = useState({});
  const [updating, setUpdating] = useState({});
  const [selectedStatus, setSelectedStatus] = useState({});
  const logout=()=>{localStorage.removeItem('staff_token');navigate('/staff/login');};
  const loadPending=()=>{staffAxios.get('/orders/pending').then(r=>{const d=r.data;setPending(Array.isArray(d)?d:d.orders||[]);setPendingErr('');}).catch(()=>setPendingErr('Could not load pending orders.'));};
  const loadMine=()=>{staffAxios.get('/orders/mine').then(r=>{const d=r.data;setMyOrders(Array.isArray(d)?d:d.orders||[]);setMyErr('');}).catch(()=>setMyErr('Could not load your orders.'));};
  useEffect(()=>{loadPending();loadMine();},[]);

  const toggle=async()=>{
    setToggling(true);
    try{await staffAxios.patch('/agents/me/availability',{is_online:!online});setOnline(o=>!o);}
    catch{/* silent */}finally{setToggling(false);}
  };

  const pick=async(id)=>{
    setPicking(p=>({...p,[id]:true}));
    setPickMsgs(p=>({...p,[id]:''}));
    try{
      await staffAxios.post('/orders/'+id+'/pick');
      loadPending();loadMine();
    }catch(err){
      if(err.response?.status===409){
        setPickMsgs(p=>({...p,[id]:'Order already taken — refreshing list'}));
        loadPending();
      }else{
        setPickMsgs(p=>({...p,[id]:'Failed to pick order. Please try again.'}));
      }
      setPicking(p=>({...p,[id]:false}));
    }
  };

  const updateStatus=async(id)=>{
    const status=selectedStatus[id];
    if(!status)return;
    setUpdating(p=>({...p,[id]:true}));setStatusErr(p=>({...p,[id]:''}));
    try{await staffAxios.patch('/orders/'+id+'/status',{status});loadMine();}
    catch{setStatusErr(p=>({...p,[id]:'Status update failed.'}));}
    finally{setUpdating(p=>({...p,[id]:false}));}
  };

  const BTN={minHeight:'44px',padding:'0 20px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:600,cursor:'pointer',width:'100%'};
  const CARD={background:'#fff',border:'1.5px solid #EDE9FE',borderRadius:'16px',padding:'16px',marginBottom:'12px'};

  return(
    <div style={{minHeight:'100vh',background:'#F8F6FF',fontFamily:'sans-serif'}}>
      <nav style={{background:'#fff',borderBottom:'1.5px solid #EDE9FE',padding:'0 20px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <span style={{fontWeight:800,fontSize:'18px',color:'#7C3AED'}}>CAREAL <span style={{fontSize:'10px',background:'#EDE9FE',color:'#7C3AED',padding:'3px 8px',borderRadius:'100px',verticalAlign:'middle'}}>Field Agent</span></span>
        <button onClick={logout} style={{fontSize:'13px',fontWeight:600,color:'#7C3AED',background:'#F5F3FF',border:'1.5px solid #EDE9FE',padding:'7px 14px',borderRadius:'10px',cursor:'pointer',minHeight:'44px'}}>Log out</button>
      </nav>

      <div style={{maxWidth:'600px',margin:'0 auto',padding:'20px 16px'}}>

        {/* Availability toggle */}
        <div style={{...CARD,display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
          <div>
            <div style={{fontWeight:700,fontSize:'15px',color:'#1E1040'}}>Availability</div>
            <div style={{fontSize:'13px',color:online?'#15803D':'#9CA3AF',marginTop:2}}>{online?'● Online':'○ Offline'}</div>
          </div>
          <button onClick={toggle} disabled={toggling} style={{minHeight:'44px',padding:'0 24px',background:online?'#DCFCE7':'#EDE9FE',color:online?'#15803D':'#7C3AED',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>
            {toggling?'…':online?'Go Offline':'Go Online'}
          </button>
        </div>

        {/* Pending Orders */}
        <div style={{marginBottom:'28px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <h2 style={{fontWeight:800,fontSize:'17px',color:'#1E1040',margin:0}}>Pending Orders</h2>
            <button onClick={loadPending} style={{padding:'6px 14px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer',minHeight:'36px'}}>Refresh</button>
          </div>
          {pendingErr&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'10px',padding:'10px',fontSize:'13px',marginBottom:10}}>{pendingErr}<button onClick={loadPending} style={{marginLeft:10,color:'#7C3AED',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Retry</button></div>}
          {pending.length===0&&!pendingErr&&<p style={{color:'#9CA3AF',fontSize:'13px'}}>No pending orders.</p>}
          {pending.map(o=>(
            <div key={o.id} style={CARD}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,color:'#1E1040'}}>{o.plate_number}</div>
                  <div style={{fontSize:'12px',color:'#7C7CA0',marginTop:2}}>{o.delivery_method==='agent_delivery'?'🚚 Delivery':'🏢 Collection'} · ID: {String(o.id).slice(0,8)}</div>
                </div>
              </div>
              {pickMsgs[o.id]&&<div style={{background:'#FFF7ED',color:'#C2570A',borderRadius:'8px',padding:'8px 10px',fontSize:'12px',marginBottom:8}}>{pickMsgs[o.id]}</div>}
              <button onClick={()=>pick(o.id)} disabled={!!picking[o.id]} style={{...BTN,background:picking[o.id]?'#A78BFA':'#7C3AED'}}>
                {picking[o.id]?'Picking…':'Pick Up'}
              </button>
            </div>
          ))}
        </div>

        {/* My Orders */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <h2 style={{fontWeight:800,fontSize:'17px',color:'#1E1040',margin:0}}>My Orders</h2>
            <button onClick={loadMine} style={{padding:'6px 14px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer',minHeight:'36px'}}>Refresh</button>
          </div>
          {myErr&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'10px',padding:'10px',fontSize:'13px',marginBottom:10}}>{myErr}<button onClick={loadMine} style={{marginLeft:10,color:'#7C3AED',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Retry</button></div>}
          {myOrders.length===0&&!myErr&&<p style={{color:'#9CA3AF',fontSize:'13px'}}>No active orders.</p>}
          {myOrders.map(o=>(
            <div key={o.id} style={CARD}>
              <div style={{marginBottom:10}}>
                <div style={{fontWeight:700,color:'#1E1040'}}>{o.plate_number}</div>
                <div style={{fontSize:'12px',color:'#7C7CA0',marginTop:2}}>Status: <span style={{background:'#EDE9FE',color:'#7C3AED',padding:'2px 8px',borderRadius:'100px',fontSize:'11px',fontWeight:600}}>{o.status}</span></div>
              </div>
              {statusErr[o.id]&&<div style={{background:'#FEF2F2',color:'#B91C1C',borderRadius:'8px',padding:'8px',fontSize:'12px',marginBottom:8}}>{statusErr[o.id]}</div>}
              <div style={{display:'flex',gap:8}}>
                <select value={selectedStatus[o.id]||''} onChange={e=>setSelectedStatus(p=>({...p,[o.id]:e.target.value}))} style={{flex:1,padding:'10px 12px',border:'1.5px solid #EDE9FE',borderRadius:'10px',fontSize:'13px',background:'#fff',minHeight:'44px'}}>
                  <option value='' disabled>Update status…</option>
                  {['in_progress','ready_for_delivery','ready_for_pickup','delivered','collected'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={()=>updateStatus(o.id)} disabled={!selectedStatus[o.id]||updating[o.id]} style={{...BTN,width:'auto',padding:'0 18px',opacity:!selectedStatus[o.id]?0.5:1}}>
                  {updating[o.id]?'…':'Update'}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
