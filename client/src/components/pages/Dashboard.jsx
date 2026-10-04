// Dashboard.jsx — Redesigned with animated cards
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { statusToStage, getDeliveryLabel } from "../../utils/orderStatus.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const statusConfig = {
  Pending:    { bg: "#FFF7ED", text: "#C2570A", dot: "#F97316", label: "Pending" },
  Processing: { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6", label: "Processing" },
  Delivered:  { bg: "#F0FDF4", text: "#15803D", dot: "#22C55E", label: "Completed" },
  Done:       { bg: "#F0FDF4", text: "#15803D", dot: "#22C55E", label: "Completed" },
  "N/A":      { bg: "#F9FAFB", text: "#9CA3AF", dot: "#D1D5DB", label: "N/A" },
};

function StatusBadge({ label }) {
  const cfg = statusConfig[label] || statusConfig["Pending"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
      background: cfg.bg, color: cfg.text,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {label}
    </span>
  );
}

function expandServices(pmt) {
  const rows = [];
  if (pmt.license && pmt.license_status !== "N/A")
    rows.push({ id: `${pmt.id}-license`, name: "Vehicle License", icon: "📋",
      amount: pmt.license_amount, status: pmt.license_status || "Pending", ref: pmt.payment_ref,
      orderStatus: pmt.status, deliveryMethod: pmt.delivery_method });
  if (pmt.roadworthiness && pmt.roadworthiness_status !== "N/A")
    rows.push({ id: `${pmt.id}-roadworthiness`, name: "Road Worthiness", icon: "🛡️",
      amount: pmt.roadworthiness_amount, status: pmt.roadworthiness_status || "Pending", ref: pmt.payment_ref,
      orderStatus: pmt.status, deliveryMethod: pmt.delivery_method });
  if (pmt.insurance && pmt.insurance_status !== "N/A")
    rows.push({ id: `${pmt.id}-insurance`, name: "Motor Insurance", icon: "📄",
      amount: pmt.insurance_amount, status: pmt.insurance_status || "Pending", ref: pmt.payment_ref,
      orderStatus: pmt.status, deliveryMethod: pmt.delivery_method });
  return rows;
}

function normalisePmt(pmt) {
  return { ...pmt, plate_number: pmt.plate_number || pmt.reg_number || "" };
}

const STAGE_LABELS = ["Paid", "In Progress", "Ready", "Delivered"];

function OrderProgressBar({ status, deliveryMethod }) {
  const activeStage = statusToStage(status);
  const finalLabel = getDeliveryLabel(deliveryMethod);
  const labels = ["Paid", "In Progress", "Ready", finalLabel];
  const isUnknown = !["paid","assigned","in_progress","ready_for_delivery","ready_for_pickup","delivered","collected"].includes(status);

  return (
    <div className="opb-root">
      <div className="opb-track">
        {labels.map((label, idx) => {
          const stageNum = idx + 1;
          const isDone   = stageNum < activeStage;
          const isActive = stageNum === activeStage;
          return (
            <React.Fragment key={label}>
              <div className="opb-step">
                <div className={`opb-dot ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
                  {isDone ? "✓" : stageNum}
                </div>
                <div className={`opb-label ${isActive ? "active" : ""}`}>{label}</div>
              </div>
              {idx < labels.length - 1 && (
                <div className={`opb-line ${stageNum < activeStage ? "done" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isUnknown && status && (
        <div className="opb-unknown">Status: {status}</div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, payments, onPayService, index }) {
  const [expanded, setExpanded] = useState(true);
  const vehiclePayments = payments.filter(p =>
    (p.plate_number || p.reg_number || "") === vehicle.plate_number
  );
  const serviceRows = vehiclePayments.flatMap(expandServices);
  const grandTotal  = vehiclePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const cardColors = [
    ["#7C3AED", "#A78BFA"],
    ["#0F766E", "#34D399"],
    ["#B45309", "#FBBF24"],
    ["#0369A1", "#38BDF8"],
  ];
  const [from, to] = cardColors[index % cardColors.length];

  return (
    <div className="vehicle-card" style={{ animationDelay: `${index * 80}ms` }}>
      <div
        className={`vehicle-card-header ${expanded ? "expanded" : ""}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="vehicle-card-left">
          <div className="vehicle-icon-wrap" style={{ background: `linear-gradient(135deg,${from},${to})` }}>
            🚗
          </div>
          <div className="vehicle-info">
            <div className="vehicle-plate">{vehicle.plate_number}</div>
            <div className="vehicle-meta">
              {vehicle.make || "—"} &bull; {vehicle.color || "—"}
            </div>
            <div className="vehicle-dates">
              Added {new Date(vehicle.created_at).toLocaleDateString("en-NG", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </div>
          </div>
        </div>

        <div className="vehicle-card-right">
          <button
            className="pay-btn"
            style={{ background: `linear-gradient(135deg,${from},${to})` }}
            onClick={e => { e.stopPropagation(); onPayService(vehicle); }}
          >
            Renew Docs
          </button>
          <span className={`chevron ${expanded ? "up" : ""}`}>▾</span>
        </div>
      </div>

      {expanded && (
        <div className="vehicle-card-body">
          {serviceRows.length === 0 ? (
            <div className="vehicle-empty-services">
              <div className="vehicle-empty-icon">📁</div>
              <p>No services recorded yet for this vehicle.</p>
              <button
                className="vehicle-empty-btn"
                style={{ background: `linear-gradient(135deg,${from},${to})` }}
                onClick={() => onPayService(vehicle)}
              >
                + Request a Service
              </button>
            </div>
          ) : (
            <>
              {vehiclePayments.map(pmt => (
                <div key={`opb-${pmt.id}`} style={{ marginBottom: 16 }}>
                  <OrderProgressBar
                    status={pmt.status}
                    deliveryMethod={pmt.delivery_method}
                  />
                </div>
              ))}
              <div className="services-table-head">
                <span>Service</span>
                <span>Status</span>
                <span>Amount</span>
              </div>
              {serviceRows.map((row, i) => (
                <div
                  key={row.id}
                  className="services-table-row"
                  style={{ borderBottom: i < serviceRows.length - 1 ? "1px solid #F5F3FF" : "none" }}
                >
                  <div className="service-name-cell">
                    <span className="service-icon">{row.icon}</span>
                    <div>
                      <div className="service-name">{row.name}</div>
                      {row.ref && <div className="service-ref">Ref: {row.ref}</div>}
                    </div>
                  </div>
                  <StatusBadge label={row.status} />
                  <span className="service-amount">
                    {row.amount != null && Number(row.amount) > 0
                      ? `₦${Number(row.amount).toLocaleString()}` : "—"}
                  </span>
                </div>
              ))}
              <div className="services-total-row">
                <span className="services-total-label">Grand Total</span>
                <span className="services-total-value" style={{ color: from }}>
                  ₦{grandTotal.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [user,     setUser]     = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState("");
  const [time]                  = useState(new Date());

  useEffect(() => {
    if (params.get("payment") === "success") {
      setToast("🎉 Payment confirmed! Your services are now being processed.");
      window.history.replaceState({}, "", "/dashboard");
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("careal_token") || "";
        if (!token) throw new Error("No token found. Please log in again.");
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
        const [profileRes, vehiclesRes, paymentsRes] = await Promise.all([
          fetch(`${API_BASE}/profile`,  { headers }),
          fetch(`${API_BASE}/vehicles`, { headers }),
          fetch(`${API_BASE}/payments`, { headers }),
        ]);
        if (!profileRes.ok)  throw new Error(`Could not load profile (${profileRes.status})`);
        if (!vehiclesRes.ok) throw new Error(`Could not load vehicles (${vehiclesRes.status})`);
        if (!paymentsRes.ok) throw new Error(`Could not load payments (${paymentsRes.status})`);
        const [profileData, vehiclesData, paymentsData] = await Promise.all([
          profileRes.json(), vehiclesRes.json(), paymentsRes.json(),
        ]);
        setUser(profileData.user || null);
        setVehicles(vehiclesData.vehicles || []);
        const raw = Array.isArray(paymentsData) ? paymentsData : paymentsData.payments || [];
        setPayments(raw.map(normalisePmt));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const handlePayService  = v => navigate(`/services?plate=${encodeURIComponent(v.plate_number)}`);
  const handleAddVehicle  = () => navigate("/add-vehicle");
  const handleLogout      = () => { localStorage.removeItem("careal_token"); navigate("/login"); };
  const handleCtaServices = () => {
    if (vehicles.length > 0) navigate(`/services?plate=${encodeURIComponent(vehicles[0].plate_number)}`);
    else navigate("/services");
  };

  const pendingCount = payments.filter(p =>
    p.license_status === "Pending" || p.roadworthiness_status === "Pending" || p.insurance_status === "Pending"
  ).length;

  const deliveredCount = payments.filter(p =>
    ["Delivered","Done"].includes(p.license_status) ||
    ["Delivered","Done"].includes(p.roadworthiness_status) ||
    ["Delivered","Done"].includes(p.insurance_status)
  ).length;

  const totalSpent = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <>
      <style>{DASH_STYLES}</style>
      {toast && <div className="dash-toast">{toast}</div>}

      <div className="dash-root">
        {/* Nav */}
        <nav className="dash-nav">
          <div className="dash-nav-logo">CAR<span>EAL</span></div>
          <div className="dash-nav-right">
            <button className="dash-logout-btn" onClick={handleLogout}>Log out</button>
            <div className="dash-avatar">
              {user ? `${user.first_name?.[0]||""}${user.last_name?.[0]||""}` : "?"}
            </div>
          </div>
        </nav>

        <div className="dash-content">
          {/* Loading */}
          {loading && (
            <div className="dash-loading">
              <div className="dash-spinner" />
              <span>Loading your dashboard…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="dash-error-box">
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <strong>Could not load dashboard</strong>
              <p>{error}</p>
              <button onClick={() => navigate("/login")} className="dash-error-btn">Go to Login</button>
            </div>
          )}

          {!loading && !error && user && (
            <>
              {/* Welcome Banner */}
              <div className="dash-banner">
                <div className="dash-banner-bg-circle dash-banner-bg-circle-1" />
                <div className="dash-banner-bg-circle dash-banner-bg-circle-2" />
                <div className="dash-banner-content">
                  <div className="dash-banner-greeting">{greeting()},</div>
                  <div className="dash-banner-name">{user.first_name} {user.last_name} 👋</div>
                  <div className="dash-banner-meta">
                    {user.email}
                    {vehicles.length > 0 && (
                      <> &nbsp;·&nbsp; Primary plate: <strong>{vehicles[0].plate_number}</strong></>
                    )}
                  </div>
                </div>
                <div className="dash-banner-car-emoji">🚗</div>
              </div>

              {/* Stat Cards */}
              <div className="dash-stats">
                {[
                  { label: "Vehicles", value: vehicles.length, sub: "Registered", icon: "🚗", color: "#7C3AED", delay: 0 },
                  { label: "In Progress", value: pendingCount, sub: "Active services", icon: "⏳", color: "#F97316", delay: 60 },
                  { label: "Completed", value: deliveredCount, sub: "Delivered", icon: "✅", color: "#16A34A", delay: 120 },
                  { label: "Total Spent", value: `₦${totalSpent.toLocaleString()}`, sub: "Lifetime", icon: "💳", color: "#0369A1", delay: 180, small: true },
                ].map((stat) => (
                  <div className="dash-stat-card" key={stat.label} style={{ animationDelay: `${stat.delay}ms` }}>
                    <div className="dash-stat-icon-wrap" style={{ background: `${stat.color}15` }}>
                      <span>{stat.icon}</span>
                    </div>
                    <div className="dash-stat-body">
                      <div className="dash-stat-label">{stat.label}</div>
                      <div className="dash-stat-value" style={{ color: stat.color, fontSize: stat.small ? 22 : 34 }}>
                        {stat.value}
                      </div>
                      <div className="dash-stat-sub">{stat.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vehicles Section */}
              <div className="dash-section-header">
                <div className="dash-section-title">My Vehicles</div>
                <button className="dash-add-btn" onClick={handleAddVehicle}>
                  <span>＋</span> Add Vehicle
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-icon">🚗</div>
                  <h3>No vehicles yet</h3>
                  <p>Add your first vehicle to start renewing your documents.</p>
                  <button className="dash-add-btn" onClick={handleAddVehicle} style={{ margin: "0 auto" }}>
                    <span>＋</span> Add Vehicle
                  </button>
                </div>
              ) : (
                vehicles.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} payments={payments}
                    onPayService={handlePayService} index={i} />
                ))
              )}

              {/* CTA Row */}
              <div className="dash-cta-row">
                <div className="dash-cta-text">
                  <h3>Ready to renew a document?</h3>
                  <p>Vehicle License · Road Worthiness · Motor Insurance — all in one place.</p>
                </div>
                <button className="dash-cta-btn" onClick={handleCtaServices}>
                  Pay for Service →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const DASH_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F8F6FF; font-family: 'DM Sans', sans-serif; color: #1E1040; }

/* Animations */
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeUp  { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }

/* Layout */
.dash-root { min-height:100vh; display:flex; flex-direction:column; }

/* Nav */
.dash-nav { background:#fff; border-bottom:1.5px solid #EDE9FE; padding:0 40px; height:68px;
  display:flex; align-items:center; justify-content:space-between;
  position:sticky; top:0; z-index:100; box-shadow:0 2px 16px rgba(124,58,237,0.06); }
.dash-nav-logo { font-family:'Syne',sans-serif; font-weight:800; font-size:22px; color:#7C3AED; letter-spacing:-0.5px; }
.dash-nav-logo span { color:#1E1040; }
.dash-nav-right { display:flex; align-items:center; gap:14px; }
.dash-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#7C3AED,#C4B5FD);
  display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:15px;
  box-shadow:0 3px 10px rgba(124,58,237,0.25); }
.dash-logout-btn { font-size:13px; font-weight:600; color:#7C3AED; background:#F5F3FF;
  border:1.5px solid #EDE9FE; padding:7px 16px; border-radius:10px; cursor:pointer;
  transition:background 0.15s, border-color 0.15s; }
.dash-logout-btn:hover { background:#EDE9FE; border-color:#C4B5FD; }

/* Content */
.dash-content { max-width:960px; margin:0 auto; padding:36px 28px 72px; width:100%; }

/* Toast */
.dash-toast { position:fixed; top:84px; left:50%; transform:translateX(-50%);
  background:#1E1040; color:#fff; padding:12px 28px; border-radius:100px;
  font-size:14px; font-weight:600; box-shadow:0 8px 32px rgba(124,58,237,0.28);
  animation:slideDown 0.3s ease; z-index:999; white-space:nowrap; }

/* Loading */
.dash-loading { display:flex; flex-direction:column; align-items:center;
  justify-content:center; min-height:60vh; gap:16px; color:#7C3AED; }
.dash-spinner { width:42px; height:42px; border-radius:50%; border:3px solid #EDE9FE;
  border-top-color:#7C3AED; animation:spin 0.8s linear infinite; }

/* Error */
.dash-error-box { background:#FEF2F2; border:1.5px solid #FECACA; border-radius:20px;
  padding:40px; text-align:center; color:#B91C1C; }
.dash-error-box p { margin-top:8px; font-size:14px; }
.dash-error-btn { margin-top:20px; background:#7C3AED; color:#fff; border:none;
  border-radius:10px; padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; }

/* Banner */
.dash-banner { background:linear-gradient(120deg,#7C3AED 0%,#9D5CF6 55%,#C4B5FD 100%);
  border-radius:24px; padding:36px 40px; color:#fff; margin-bottom:28px;
  position:relative; overflow:hidden; animation:fadeUp 0.5s ease both; }
.dash-banner-bg-circle { position:absolute; border-radius:50%; pointer-events:none; }
.dash-banner-bg-circle-1 { width:300px; height:300px; background:rgba(255,255,255,0.07);
  top:-120px; right:-80px; }
.dash-banner-bg-circle-2 { width:160px; height:160px; background:rgba(255,255,255,0.05);
  bottom:-60px; left:40px; }
.dash-banner-content { position:relative; z-index:1; }
.dash-banner-greeting { font-size:14px; font-weight:500; opacity:0.8; margin-bottom:4px; }
.dash-banner-name { font-family:'Syne',sans-serif; font-size:30px; font-weight:800;
  margin-bottom:6px; letter-spacing:-0.5px; }
.dash-banner-meta { font-size:13px; opacity:0.72; }
.dash-banner-car-emoji { position:absolute; right:36px; top:50%; transform:translateY(-50%);
  font-size:90px; opacity:0.12; pointer-events:none; z-index:0; }

/* Stats */
.dash-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:32px; }
.dash-stat-card { background:#fff; border:1.5px solid #EDE9FE; border-radius:18px;
  padding:20px 22px; box-shadow:0 2px 14px rgba(124,58,237,0.05);
  display:flex; align-items:center; gap:14px;
  animation:fadeUp 0.5s ease both; transition:transform 0.2s ease, box-shadow 0.2s ease; }
.dash-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(124,58,237,0.1); }
.dash-stat-icon-wrap { width:46px; height:46px; border-radius:14px;
  display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
.dash-stat-label { font-size:11px; color:#A78BFA; font-weight:700; text-transform:uppercase;
  letter-spacing:0.8px; margin-bottom:4px; }
.dash-stat-value { font-family:'Syne',sans-serif; font-size:34px; font-weight:800;
  color:#1E1040; line-height:1; }
.dash-stat-sub { font-size:12px; color:#9CA3AF; margin-top:4px; }

/* Section header */
.dash-section-header { display:flex; justify-content:space-between;
  align-items:center; margin-bottom:18px; }
.dash-section-title { font-family:'Syne',sans-serif; font-size:18px;
  font-weight:700; color:#1E1040; }
.dash-add-btn { display:inline-flex; align-items:center; gap:7px;
  background:#fff; border:2px dashed #C4B5FD; color:#7C3AED;
  font-weight:700; font-size:13px; padding:9px 18px; border-radius:12px;
  cursor:pointer; transition:background 0.15s, border-color 0.15s; }
.dash-add-btn:hover { background:#F5F3FF; border-color:#7C3AED; }

/* Empty state */
.dash-empty { text-align:center; padding:56px 24px; background:#fff;
  border:2px dashed #EDE9FE; border-radius:22px; animation:fadeUp 0.5s ease; }
.dash-empty-icon { font-size:52px; margin-bottom:14px; }
.dash-empty h3 { font-family:'Syne',sans-serif; font-size:18px;
  color:#1E1040; margin-bottom:8px; }
.dash-empty p { font-size:13px; color:#7C7CA0; margin-bottom:20px; }

/* Vehicle Cards */
.vehicle-card { background:#fff; border:1.5px solid #EDE9FE; border-radius:20px;
  margin-bottom:18px; overflow:hidden; box-shadow:0 3px 18px rgba(124,58,237,0.07);
  animation:fadeUp 0.5s ease both; transition:box-shadow 0.2s ease; }
.vehicle-card:hover { box-shadow:0 8px 32px rgba(124,58,237,0.12); }
.vehicle-card-header { display:flex; align-items:center; justify-content:space-between;
  padding:20px 26px; cursor:pointer; transition:background 0.15s;
  border-bottom:1.5px solid transparent; }
.vehicle-card-header.expanded { background:linear-gradient(90deg,rgba(124,58,237,0.04),#fff);
  border-bottom-color:#F3F0FF; }
.vehicle-card-left { display:flex; align-items:center; gap:16px; flex:1; min-width:0; }
.vehicle-icon-wrap { width:50px; height:50px; border-radius:16px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:24px;
  box-shadow:0 4px 14px rgba(124,58,237,0.22); }
.vehicle-plate { font-family:'Syne',sans-serif; font-weight:700; font-size:17px; color:#1E1040; }
.vehicle-meta { font-size:13px; color:#7C7CA0; margin-top:2px; }
.vehicle-dates { font-size:11px; color:#C4B5FD; margin-top:3px; }
.vehicle-card-right { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.pay-btn { color:#fff; border:none; border-radius:12px; padding:9px 20px;
  font-size:12px; font-weight:700; cursor:pointer;
  box-shadow:0 3px 12px rgba(124,58,237,0.22); white-space:nowrap;
  transition:opacity 0.15s, transform 0.15s; }
.pay-btn:hover { opacity:0.88; transform:translateY(-1px); }
.chevron { color:#A78BFA; font-size:20px; transition:transform 0.25s ease; display:inline-block; }
.chevron.up { transform:rotate(180deg); }

/* Vehicle body */
.vehicle-card-body { padding:4px 26px 22px; animation:fadeUp 0.25s ease; }
.vehicle-empty-services { text-align:center; padding:28px 0; }
.vehicle-empty-services p { color:#A78BFA; font-size:13px; margin-bottom:14px; }
.vehicle-empty-icon { font-size:36px; margin-bottom:8px; }
.vehicle-empty-btn { color:#fff; border:none; border-radius:12px; padding:10px 24px;
  font-size:13px; font-weight:700; cursor:pointer; }

/* Service table */
.services-table-head { display:grid; grid-template-columns:1fr 130px 110px;
  gap:8px; padding:12px 0 8px; border-bottom:1px solid #F3F0FF;
  font-size:11px; font-weight:700; color:#A78BFA;
  letter-spacing:1px; text-transform:uppercase; }
.services-table-row { display:grid; grid-template-columns:1fr 130px 110px;
  gap:8px; align-items:center; padding:14px 0; }
.service-name-cell { display:flex; align-items:center; gap:10px; }
.service-icon { font-size:18px; }
.service-name { font-weight:600; color:#2D1B6B; font-size:14px; }
.service-ref { font-size:11px; color:#C4B5FD; margin-top:2px; }
.service-amount { font-weight:700; color:#1E1040; font-size:14px; }
.services-total-row { display:flex; justify-content:flex-end; align-items:center;
  gap:14px; padding-top:14px; border-top:1.5px solid #F3F0FF; margin-top:4px; }
.services-total-label { font-size:13px; color:#7C7CA0; font-weight:600; }
.services-total-value { font-family:'Syne',sans-serif; font-weight:800; font-size:20px; }

/* CTA row */
.dash-cta-row { margin-top:32px; background:#fff; border:1.5px solid #EDE9FE;
  border-radius:22px; padding:26px 32px; display:flex; align-items:center;
  justify-content:space-between; box-shadow:0 2px 14px rgba(124,58,237,0.05); gap:16px; }
.dash-cta-text h3 { font-family:'Syne',sans-serif; font-size:17px;
  font-weight:700; color:#1E1040; margin-bottom:4px; }
.dash-cta-text p { font-size:13px; color:#7C7CA0; }
.dash-cta-btn { background:linear-gradient(135deg,#7C3AED,#A78BFA); color:#fff;
  border:none; border-radius:14px; padding:13px 28px; font-size:14px;
  font-weight:700; cursor:pointer; white-space:nowrap;
  box-shadow:0 6px 20px rgba(124,58,237,0.28);
  transition:opacity 0.15s, transform 0.15s; flex-shrink:0; }
.dash-cta-btn:hover { opacity:0.88; transform:translateY(-2px); }

/* Responsive */
@media (max-width:860px) {
  .dash-stats { grid-template-columns:repeat(2,1fr); }
  .dash-nav { padding:0 20px; }
  .dash-content { padding:24px 16px 60px; }
  .dash-banner { padding:26px 24px; }
  .dash-banner-name { font-size:22px; }
  .dash-banner-car-emoji { display:none; }
}
@media (max-width:580px) {
  .dash-stats { grid-template-columns:1fr 1fr; }
  .vehicle-card-header { padding:16px 18px; }
  .vehicle-card-body { padding:4px 18px 18px; }
  .services-table-head, .services-table-row { grid-template-columns:1fr auto; }
  .services-table-head span:last-child, .service-amount { display:none; }
  .dash-cta-row { flex-direction:column; text-align:center; }
  .dash-toast { font-size:12px; padding:10px 18px; white-space:normal; text-align:center; max-width:90vw; }
}

/* Order Progress Bar */
.opb-root { margin: 8px 0 16px; }
.opb-track { display:flex; align-items:center; gap:0; }
.opb-step { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
.opb-dot {
  width:28px; height:28px; border-radius:50%;
  background:#E5E7EB; color:#9CA3AF;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; border:2px solid #E5E7EB;
  transition:all 0.2s;
}
.opb-dot.active { background:#7C3AED; color:#fff; border-color:#7C3AED; }
.opb-dot.done   { background:#22C55E; color:#fff; border-color:#22C55E; }
.opb-label { font-size:10px; color:#9CA3AF; margin-top:4px; white-space:nowrap; }
.opb-label.active { color:#7C3AED; font-weight:700; }
.opb-line { flex:1; height:2px; background:#E5E7EB; min-width:16px; margin-bottom:14px; }
.opb-line.done { background:#22C55E; }
.opb-unknown { font-size:11px; color:#9CA3AF; margin-top:4px; font-style:italic; }
`;
