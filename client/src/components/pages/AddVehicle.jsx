// AddVehicle.jsx — src/components/pages/AddVehicle.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


// ✅ Two-fold deployment strategy:
//    Single host (now):     falls back to "/api" — Vite proxy (dev) / Express (prod)
//    Separate host (later): set VITE_API_BASE in Render env — no code changes needed
const API_BASE = import.meta.env.VITE_API_BASE || "https://careal-backend.onrender.com/api";

const VERIFY_IDLE      = "idle";
const VERIFY_CHECKING  = "checking";
const VERIFY_VALID     = "valid";
const VERIFY_INVALID   = "invalid";
const VERIFY_UNKNOWN   = "unknown";
const VERIFY_DUPLICATE = "duplicate";

export default function AddVehicle() {
  const navigate = useNavigate();

  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [plateInput,  setPlateInput]  = useState("");
  const [verifyState, setVerifyState] = useState(VERIFY_IDLE);
  const [verifyData,  setVerifyData]  = useState(null);
  const [serverError, setServerError] = useState("");
  const [success,     setSuccess]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("careal_token");
    if (!token) { navigate("/login", { replace: true }); return; }

    fetch(`${API_BASE}/profile`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("careal_token");
          navigate("/login", { replace: true });
          return;
        }
        const data = await res.json();
        setUser(data.user || null);
      })
      .catch(() => navigate("/login", { replace: true }))
      .finally(() => setAuthLoading(false));
  }, [navigate]);

  const resetVerify = () => {
    setVerifyState(VERIFY_IDLE);
    setVerifyData(null);
    setServerError("");
  };

  const handlePlateChange = (e) => {
    setPlateInput(e.target.value.toUpperCase());
    resetVerify();
  };

  const handleVerify = async () => {
    const plate = plateInput.trim();
    if (!plate) { setServerError("Please enter a plate number first."); return; }

    setVerifyState(VERIFY_CHECKING);
    setVerifyData(null);
    setServerError("");

    const token = localStorage.getItem("careal_token");
    try {
      const res = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plateNumber: plate }),
      });
      const data = await res.json();

      setVerifyData({ make: data.make || null, color: data.color || null,
                      status: data.status, message: data.message });

      if (data.status === "VALID")                                        setVerifyState(VERIFY_VALID);
      else if (data.status === "NOT FOUND" || data.status === "INVALID") setVerifyState(VERIFY_INVALID);
      else                                                                setVerifyState(VERIFY_UNKNOWN);
    } catch {
      setVerifyState(VERIFY_UNKNOWN);
      setVerifyData({ status: "ERROR", message: "Could not reach verification server." });
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setServerError("");
    const token = localStorage.getItem("careal_token");
    try {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plateNumber: plateInput.trim() }),
      });
      const data = await res.json();

      if (res.status === 409) { setVerifyState(VERIFY_DUPLICATE); setSubmitting(false); return; }
      if (!res.ok) {
        setServerError(data.details ? `${data.message}: ${data.details}` : data.message || "Failed to add vehicle.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.spinner} />
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:"#7C3AED" }}>Loading…</span>
      </div>
    );
  }

  if (success) {
    return (
      <>
        <style>{baseStyles}</style>
        <AppNav user={user} navigate={navigate} />
        <div style={S.page}>
          <div style={S.successCard}>
            <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
            <h2 style={S.successTitle}>Vehicle Added!</h2>
            <p style={S.successSub}>
              <strong>{plateInput.trim()}</strong> has been verified and registered to your account.
            </p>
            <p style={{ ...S.successSub, marginTop:8, color:"#A78BFA" }}>Redirecting to dashboard…</p>
          </div>
        </div>
      </>
    );
  }

  const canVerify  = plateInput.trim().length >= 3 && verifyState === VERIFY_IDLE;
  const canSave    = (verifyState === VERIFY_VALID || verifyState === VERIFY_UNKNOWN) && !submitting;
  const showResult = verifyState !== VERIFY_IDLE && verifyState !== VERIFY_CHECKING;

  return (
    <>
      <style>{baseStyles}</style>
      <AppNav user={user} navigate={navigate} />

      <div style={S.page}>
        <div style={S.card}>

          <div style={S.cardHeader}>
            <div style={S.cardIcon}>🚗</div>
            <div>
              <h1 style={S.cardTitle}>Add a Vehicle</h1>
              <p style={S.cardSub}>
                Enter your plate number — we'll verify it with the FRSC registry before saving.
              </p>
            </div>
          </div>

          <div style={S.divider} />

          <div style={S.fieldGroup}>
            <label style={S.label}>
              Plate Number <span style={{ color:"#EF4444" }}>*</span>
            </label>
            <div style={{ display:"flex", gap:10 }}>
              <input
                className="crl-input"
                value={plateInput}
                onChange={handlePlateChange}
                placeholder="e.g. ABC-123-DE"
                maxLength={20}
                disabled={verifyState === VERIFY_CHECKING || submitting}
                style={{ flex:1, textTransform:"uppercase" }}
              />
              <button
                style={{ ...S.verifyBtn, opacity: canVerify ? 1 : 0.5,
                          cursor: canVerify ? "pointer" : "not-allowed" }}
                onClick={handleVerify}
                disabled={!canVerify}
              >
                {verifyState === VERIFY_CHECKING ? (
                  <><span className="spin-icon">⟳</span> Checking…</>
                ) : verifyState !== VERIFY_IDLE ? "Re-verify" : "Verify →"}
              </button>
            </div>
            <p style={{ fontSize:11, color:"#C4B5FD", marginTop:5 }}>
              Checked against the FRSC national vehicle registry (nvis.frsc.gov.ng).
            </p>
          </div>

          {verifyState === VERIFY_CHECKING && (
            <div style={{ ...S.resultCard, background:"#F5F3FF", borderColor:"#DDD6FE" }}>
              <span className="spin-icon" style={{ fontSize:20, color:"#7C3AED" }}>⟳</span>
              <div>
                <div style={{ fontWeight:700, color:"#7C3AED", fontSize:14 }}>Checking FRSC registry…</div>
                <div style={{ fontSize:12, color:"#A78BFA", marginTop:3 }}>This may take up to 15 seconds</div>
              </div>
            </div>
          )}

          {showResult && verifyState === VERIFY_VALID && (
            <div style={{ ...S.resultCard, background:"#F0FDF4", borderColor:"#BBF7D0" }}>
              <span style={{ fontSize:24 }}>✅</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:"#15803D", fontSize:14, marginBottom:6 }}>
                  Plate Verified — Valid &amp; Assigned
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {verifyData?.make  && <span style={S.chip("#DCFCE7","#15803D")}>🚗 {verifyData.make}</span>}
                  {verifyData?.color && <span style={S.chip("#DCFCE7","#15803D")}>🎨 {verifyData.color}</span>}
                  <span style={{ fontSize:11, color:"#6B7280", alignSelf:"center" }}>via FRSC</span>
                </div>
              </div>
            </div>
          )}

          {showResult && verifyState === VERIFY_INVALID && (
            <div style={{ ...S.resultCard, background:"#FEF2F2", borderColor:"#FECACA" }}>
              <span style={{ fontSize:24 }}>❌</span>
              <div>
                <div style={{ fontWeight:700, color:"#B91C1C", fontSize:14, marginBottom:3 }}>
                  Plate Not Found in FRSC Registry
                </div>
                <div style={{ fontSize:12, color:"#B91C1C" }}>
                  {verifyData?.message || "This plate number is not registered."}
                </div>
                <div style={{ fontSize:12, color:"#7C7CA0", marginTop:6 }}>
                  Double-check for typos. If correct, contact FRSC to register your vehicle first.
                </div>
              </div>
            </div>
          )}

          {showResult && verifyState === VERIFY_UNKNOWN && (
            <div style={{ ...S.resultCard, background:"#FFFBEB", borderColor:"#FDE68A" }}>
              <span style={{ fontSize:24 }}>⚠️</span>
              <div>
                <div style={{ fontWeight:700, color:"#92400E", fontSize:14, marginBottom:3 }}>
                  Verification Inconclusive
                </div>
                <div style={{ fontSize:12, color:"#92400E" }}>
                  {verifyData?.message || "The FRSC portal couldn't confirm this plate right now."}
                </div>
                <div style={{ fontSize:12, color:"#7C7CA0", marginTop:6 }}>
                  You can still add the vehicle — it will be flagged for manual review.
                </div>
              </div>
            </div>
          )}

          {showResult && verifyState === VERIFY_DUPLICATE && (
            <div style={{ ...S.resultCard, background:"#EFF6FF", borderColor:"#BFDBFE" }}>
              <span style={{ fontSize:24 }}>ℹ️</span>
              <div>
                <div style={{ fontWeight:700, color:"#1D4ED8", fontSize:14, marginBottom:3 }}>
                  Vehicle Already on Your Account
                </div>
                <div style={{ fontSize:12, color:"#1D4ED8" }}>
                  This plate number is already registered. Go to your dashboard to manage it.
                </div>
              </div>
            </div>
          )}

          {serverError && <div style={S.errorBanner}>⚠️ {serverError}</div>}

          {canSave && (
            <>
              <div style={S.divider} />
              <p style={{ fontSize:13, color:"#7C7CA0", marginBottom:14 }}>
                {verifyState === VERIFY_VALID
                  ? "Vehicle confirmed. Click below to add it to your account."
                  : "FRSC check was inconclusive. You can still add this vehicle for manual review."}
              </p>
              <div style={S.actions}>
                <button style={S.cancelBtn} onClick={resetVerify} disabled={submitting}>
                  ← Re-enter Plate
                </button>
                <button
                  style={{ ...S.submitBtn, opacity: submitting ? 0.7 : 1,
                            cursor: submitting ? "not-allowed" : "pointer" }}
                  onClick={handleSave}
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="spin-icon">⟳</span> Saving…</>
                    : `Add ${plateInput.trim()} →`}
                </button>
              </div>
            </>
          )}

          {(verifyState === VERIFY_IDLE || verifyState === VERIFY_INVALID || verifyState === VERIFY_DUPLICATE) && (
            <div style={{ marginTop: 8 }}>
              <button style={S.cancelBtn} onClick={() => navigate("/dashboard")}>
                ← Back to Dashboard
              </button>
            </div>
          )}

        </div>

        <div style={S.note}>
          <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
          <span>
            Verification uses the FRSC national vehicle registry. Make and colour are pulled automatically
            when the plate is valid. The FRSC portal can be slow — if it times out, try again in a moment.
          </span>
        </div>
      </div>
    </>
  );
}

function AppNav({ user, navigate }) {
  return (
    <nav style={S.nav}>
      <div style={S.navLogo}>CAR<span style={{ color:"#1E1040" }}>EAL</span></div>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <button style={S.dashLink} onClick={() => navigate("/dashboard")}>← Dashboard</button>
        <div style={S.avatar}>
          {user ? `${user.first_name?.[0]||""}${user.last_name?.[0]||""}` : "?"}
        </div>
      </div>
    </nav>
  );
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #F8F6FF; font-family: 'DM Sans', sans-serif; color: #1E1040; }
  .crl-input { width: 100%; padding: 12px 16px; border: 2px solid #EDE9FE; border-radius: 12px; font-size: 15px; font-family: 'DM Sans', sans-serif; color: #1E1040; background: #fff; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .crl-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,0.10); }
  .crl-input::placeholder { color: #C4B5FD; }
  .crl-input:disabled { opacity: 0.6; cursor: not-allowed; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin-icon { display: inline-block; animation: spin 0.8s linear infinite; }
`;

const S = {
  loadingScreen: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:16 },
  spinner: { width:40, height:40, borderRadius:"50%", border:"3px solid #EDE9FE", borderTopColor:"#7C3AED", animation:"spin 0.8s linear infinite" },
  nav: { background:"#fff", borderBottom:"1.5px solid #EDE9FE", padding:"0 32px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 },
  navLogo: { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:"#7C3AED", letterSpacing:-0.5 },
  dashLink: { fontSize:13, fontWeight:600, color:"#7C3AED", background:"#F5F3FF", border:"none", padding:"6px 14px", borderRadius:8, cursor:"pointer" },
  avatar: { width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#7C3AED,#C4B5FD)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:15 },
  page: { maxWidth:600, margin:"0 auto", padding:"40px 24px 80px" },
  card: { background:"#fff", border:"1.5px solid #EDE9FE", borderRadius:22, padding:"32px 28px", boxShadow:"0 6px 32px rgba(124,58,237,0.09)", marginBottom:20 },
  cardHeader: { display:"flex", alignItems:"flex-start", gap:16, marginBottom:20 },
  cardIcon: { width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#7C3AED,#A78BFA)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 },
  cardTitle: { fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#1E1040", marginBottom:4 },
  cardSub: { fontSize:13, color:"#7C7CA0", lineHeight:1.55 },
  divider: { borderTop:"1.5px solid #F3F0FF", margin:"0 0 20px" },
  fieldGroup: { display:"flex", flexDirection:"column", gap:4, marginBottom:16 },
  label: { fontSize:12, fontWeight:700, color:"#A78BFA", textTransform:"uppercase", letterSpacing:1, marginBottom:4 },
  verifyBtn: { padding:"12px 18px", background:"#7C3AED", color:"#fff", border:"none", borderRadius:12, fontWeight:700, fontSize:14, whiteSpace:"nowrap", transition:"opacity 0.15s", display:"flex", alignItems:"center", gap:6 },
  resultCard: { display:"flex", alignItems:"flex-start", gap:12, border:"1.5px solid", borderRadius:12, padding:"14px 16px", marginBottom:16 },
  chip: (bg, text) => ({ fontSize:12, fontWeight:600, color:text, background:bg, padding:"2px 8px", borderRadius:6 }),
  errorBanner: { background:"#FEF2F2", border:"1.5px solid #FECACA", color:"#B91C1C", borderRadius:10, padding:"12px 16px", fontSize:13, fontWeight:500, marginBottom:16 },
  actions: { display:"flex", gap:12 },
  cancelBtn: { flex:1, padding:"12px", border:"2px solid #EDE9FE", borderRadius:12, background:"#fff", color:"#7C7CA0", fontWeight:600, fontSize:14, cursor:"pointer" },
  submitBtn: { flex:2, padding:"13px", background:"linear-gradient(135deg,#7C3AED,#A78BFA)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, boxShadow:"0 4px 14px rgba(124,58,237,0.28)", transition:"opacity 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
  note: { display:"flex", alignItems:"flex-start", gap:10, background:"#FAF5FF", border:"1.5px solid #EDE9FE", borderRadius:12, padding:"14px 16px", fontSize:13, color:"#7C7CA0", lineHeight:1.55 },
  successCard: { background:"#fff", border:"1.5px solid #D1FAE5", borderRadius:22, padding:"48px 28px", boxShadow:"0 6px 32px rgba(22,163,74,0.08)", textAlign:"center" },
  successTitle: { fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#1E1040", marginBottom:10 },
  successSub: { fontSize:14, color:"#7C7CA0", lineHeight:1.6 },
};