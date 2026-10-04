import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const ROLE_ROUTES={super_admin:"/staff/super-admin",contact_agent:"/staff/contact-agent",field_agent:"/staff/field-agent"};
export default function StaffLogin() {
  const navigate=useNavigate();
  const [email,setEmail]=React.useState("");
  const [password,setPassword]=React.useState("");
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState("");
  const [fe,setFe]=React.useState({});
  const handleSubmit=async(e)=>{
    e.preventDefault();setError("");
    const errs={};
    if(!email.trim())errs.email="Email is required.";
    if(!password.trim())errs.password="Password is required.";
    if(Object.keys(errs).length){setFe(errs);return;}
    setFe({});setLoading(true);
    try{
      const res=await fetch(API_BASE+"/agents/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await res.json().catch(()=>({}));
      if(res.status===200){
        const role=data.staff?.role;
        const route=ROLE_ROUTES[role];
        if(!route){setError("Your account role is not recognised. Contact your administrator.");return;}
        localStorage.setItem("staff_token",data.token);
        navigate(route);return;
      }
      if(res.status===400||res.status===401){setError("Invalid email or password.");return;}
      setError("Something went wrong. Please try again.");
    }catch{setError("Something went wrong. Please try again.");}finally{setLoading(false);}
  };
  return (<div style={{minHeight:"100vh",background:"#F8F6FF",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
    <div style={{background:"#fff",borderRadius:"24px",padding:"48px 40px",maxWidth:"420px",width:"100%",boxShadow:"0 8px 40px rgba(124,58,237,0.12)",textAlign:"center"}}>
      <div style={{fontWeight:800,fontSize:"28px",color:"#7C3AED",marginBottom:"12px"}}>CAR<span style={{color:"#1E1040"}}>EAL</span></div>
      <div style={{display:"inline-block",background:"#EDE9FE",color:"#7C3AED",fontWeight:700,fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.5px",padding:"4px 12px",borderRadius:"100px",marginBottom:"20px"}}>Staff Portal</div>
      <h1 style={{fontWeight:800,fontSize:"24px",color:"#1E1040",marginBottom:"8px"}}>Staff Sign In</h1>
      <p style={{fontSize:"13px",color:"#7C7CA0",marginBottom:"28px"}}>Access is invite-only.</p>
      {error&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",color:"#B91C1C",borderRadius:"10px",padding:"10px 14px",fontSize:"13px",marginBottom:"16px"}}>{error}</div>}
      <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"12px",textAlign:"left"}} noValidate>
        <div><input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:"13px 16px",border:fe.email?"1.5px solid #DC2626":"1.5px solid #EDE9FE",borderRadius:"12px",fontSize:"15px",color:"#1E1040",background:"#FAFAFE",outline:"none",boxSizing:"border-box"}} disabled={loading}/>{fe.email&&<span style={{fontSize:"12px",color:"#DC2626"}}>{fe.email}</span>}</div>
        <div><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"100%",padding:"13px 16px",border:fe.password?"1.5px solid #DC2626":"1.5px solid #EDE9FE",borderRadius:"12px",fontSize:"15px",color:"#1E1040",background:"#FAFAFE",outline:"none",boxSizing:"border-box"}} disabled={loading}/>{fe.password&&<span style={{fontSize:"12px",color:"#DC2626"}}>{fe.password}</span>}</div>
        <button type="submit" style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#7C3AED,#A78BFA)",color:"#fff",border:"none",borderRadius:"12px",fontWeight:700,fontSize:"15px",cursor:"pointer",opacity:loading?0.7:1}} disabled={loading}>{loading?"Signing in…":"Sign In"}</button>
      </form>
      <p style={{marginTop:"20px",fontSize:"13px",color:"#7C7CA0"}}>Not staff? <Link to="/login" style={{color:"#7C3AED",fontWeight:600}}>User login →</Link></p>
    </div>
  </div>);
}