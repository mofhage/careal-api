// PaymentVerify.jsx — src/components/pages/PaymentVerify.jsx
// Flutterwave redirects here with ?transaction_id=xxx&tx_ref=yyy&status=zzz
// We call POST /api/payments/verify, then navigate to /login

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function PaymentVerify() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();

  const [stage,   setStage]   = useState("verifying"); // verifying | success | failed
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    const transaction_id = params.get("transaction_id");
    const tx_ref         = params.get("tx_ref");
    const status         = params.get("status");   // "successful" | "cancelled" | "failed"

    // User cancelled on Flutterwave page
    if (status === "cancelled") {
      setStage("failed");
      setMessage("Payment was cancelled. No charge was made.");
      return;
    }

    if (!transaction_id || !tx_ref) {
      setStage("failed");
      setMessage("Invalid payment callback — missing transaction details.");
      return;
    }

    const token = localStorage.getItem("careal_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Call backend to verify + record the payment
    fetch(`${API_BASE}/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transaction_id, tx_ref }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setPayment(data.payment || null);
          setStage("success");
          // ✅ After 2.5s redirect to login
          setTimeout(() => navigate("/login"), 2500);
        } else {
          setStage("failed");
          setMessage(data.message || "Payment verification failed.");
        }
      })
      .catch(() => {
        setStage("failed");
        setMessage("Network error during verification. Please contact support.");
      });
  }, []); // run once on mount

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F6FF; font-family: 'DM Sans', sans-serif; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(20px); }
                             to   { opacity:1; transform:translateY(0); } }
        .spin-icon { display:inline-block; animation:spin 0.8s linear infinite; }
        .fade-up   { animation: fadeUp 0.4s ease both; }
      `}</style>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navLogo}>CAR<span style={{ color:"#1E1040" }}>EAL</span></div>
      </nav>

      <div style={S.page}>
        <div style={S.card} className="fade-up">

          {/* ── Verifying ── */}
          {stage === "verifying" && (
            <div style={S.center}>
              <div style={{ ...S.iconRing, borderColor:"#DDD6FE" }}>
                <span className="spin-icon" style={{ fontSize:32, color:"#7C3AED" }}>⟳</span>
              </div>
              <h2 style={S.heading}>Verifying your payment…</h2>
              <p style={S.sub}>
                Please wait — we're confirming your transaction with Flutterwave.
                Do not close this page.
              </p>
            </div>
          )}

          {/* ── Success ── */}
          {stage === "success" && (
            <div style={S.center}>
              <div style={{ ...S.iconRing, borderColor:"#BBF7D0", background:"#F0FDF4" }}>
                <span style={{ fontSize:36 }}>✅</span>
              </div>
              <h2 style={{ ...S.heading, color:"#15803D" }}>Payment Confirmed!</h2>
              <p style={S.sub}>
                Your payment was successful. Your documents are now being processed.
              </p>

              {payment && (
                <div style={S.receipt}>
                  <div style={S.receiptRow}>
                    <span style={S.receiptLabel}>Plate Number</span>
                    <span style={S.receiptValue}>{payment.plate_number || payment.reg_number}</span>
                  </div>
                  <div style={S.receiptRow}>
                    <span style={S.receiptLabel}>Reference</span>
                    <span style={{ ...S.receiptValue, fontSize:11, color:"#A78BFA" }}>
                      {payment.payment_ref}
                    </span>
                  </div>
                  <div style={S.receiptRow}>
                    <span style={S.receiptLabel}>Amount Paid</span>
                    <span style={{ ...S.receiptValue, color:"#7C3AED", fontWeight:800 }}>
                      ₦{Number(payment.amount).toLocaleString()}
                    </span>
                  </div>
                  {payment.license && (
                    <div style={S.receiptRow}>
                      <span style={S.receiptLabel}>Vehicle License</span>
                      <span style={S.statusBadge("#FFF7ED","#C2570A")}>Pending</span>
                    </div>
                  )}
                  {payment.roadworthiness && (
                    <div style={S.receiptRow}>
                      <span style={S.receiptLabel}>Road Worthiness</span>
                      <span style={S.statusBadge("#FFF7ED","#C2570A")}>Pending</span>
                    </div>
                  )}
                  {payment.insurance && (
                    <div style={S.receiptRow}>
                      <span style={S.receiptLabel}>Motor Insurance</span>
                      <span style={S.statusBadge("#FFF7ED","#C2570A")}>Pending</span>
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize:13, color:"#A78BFA", marginTop:16 }}>
                Redirecting to login…
              </p>
            </div>
          )}

          {/* ── Failed ── */}
          {stage === "failed" && (
            <div style={S.center}>
              <div style={{ ...S.iconRing, borderColor:"#FECACA", background:"#FEF2F2" }}>
                <span style={{ fontSize:36 }}>❌</span>
              </div>
              <h2 style={{ ...S.heading, color:"#B91C1C" }}>Payment Not Confirmed</h2>
              <p style={S.sub}>{message || "We could not verify your payment."}</p>
              <p style={{ fontSize:13, color:"#7C7CA0", marginTop:8 }}>
                If money was deducted from your account, please contact support with your reference number.
              </p>
              <div style={{ display:"flex", gap:12, marginTop:24 }}>
                <button
                  style={S.cancelBtn}
                  onClick={() => navigate("/services")}
                >
                  Try Again
                </button>
                <button
                  style={S.primaryBtn}
                  onClick={() => navigate("/login")}
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

const S = {
  nav: {
    background:"#fff", borderBottom:"1.5px solid #EDE9FE",
    padding:"0 32px", height:64,
    display:"flex", alignItems:"center",
  },
  navLogo: {
    fontFamily:"'Syne',sans-serif", fontWeight:800,
    fontSize:22, color:"#7C3AED", letterSpacing:-0.5,
  },
  page: {
    maxWidth:500, margin:"0 auto",
    padding:"60px 24px 80px",
    display:"flex", flexDirection:"column", alignItems:"center",
  },
  card: {
    background:"#fff", border:"1.5px solid #EDE9FE",
    borderRadius:22, padding:"40px 32px",
    boxShadow:"0 8px 40px rgba(124,58,237,0.10)",
    width:"100%",
  },
  center: { display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" },
  iconRing: {
    width:72, height:72, borderRadius:"50%",
    border:"2px solid", background:"#F5F3FF",
    display:"flex", alignItems:"center", justifyContent:"center",
    marginBottom:20,
  },
  heading: {
    fontFamily:"'Syne',sans-serif", fontSize:22,
    fontWeight:800, color:"#1E1040", marginBottom:10,
  },
  sub: { fontSize:14, color:"#7C7CA0", lineHeight:1.6, maxWidth:340 },
  receipt: {
    width:"100%", background:"#FAF5FF",
    border:"1.5px solid #EDE9FE", borderRadius:14,
    padding:"16px 18px", marginTop:20,
    display:"flex", flexDirection:"column", gap:10,
  },
  receiptRow: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    fontSize:13,
  },
  receiptLabel: { color:"#7C7CA0", fontWeight:500 },
  receiptValue: { fontWeight:700, color:"#1E1040" },
  statusBadge: (bg, text) => ({
    fontSize:11, fontWeight:700, padding:"2px 10px",
    borderRadius:20, background:bg, color:text,
  }),
  cancelBtn: {
    flex:1, padding:"11px 20px",
    border:"2px solid #EDE9FE", borderRadius:12,
    background:"#fff", color:"#7C7CA0",
    fontWeight:600, fontSize:14, cursor:"pointer",
  },
  primaryBtn: {
    flex:1, padding:"11px 20px",
    background:"linear-gradient(135deg,#7C3AED,#A78BFA)",
    border:"none", borderRadius:12, color:"#fff",
    fontWeight:700, fontSize:14, cursor:"pointer",
  },
};