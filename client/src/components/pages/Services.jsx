// Services.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../Header.jsx";
import { getPrices } from "../../utils/priceStore.js";
import "./Services.css";

const SERVICE_CONFIGS = {
  license: {
    key:      "license",
    priceKey: "licence",
    label:    "Vehicle Licence Renewal",
    desc:     "Renew your vehicle licence quickly and easily without visiting the office.",
    duration: "1–2 business days",
    docs:     "Vehicle licence copy, valid ID",
    icon:     "📋",
    color:    ["#7C3AED", "#A78BFA"],
    features: ["FRSC-verified processing", "No office visit required", "Digital confirmation sent"],
  },
  roadworthiness: {
    key:      "roadworthiness",
    priceKey: "road_worthiness",
    label:    "Road Worthiness Certificate",
    desc:     "Get your road worthiness certificate renewed hassle-free by certified agents.",
    duration: "2–3 business days",
    docs:     "Vehicle inspection report, valid ID",
    icon:     "🛡️",
    color:    ["#0F766E", "#34D399"],
    features: ["Certified agent inspection", "Physical delivery option", "Valid across all states"],
  },
  insurance: {
    key:      "insurance",
    priceKey: "insurance",
    label:    "Vehicle Insurance Renewal",
    desc:     "Renew your motor insurance with verified providers online.",
    duration: "1 business day",
    docs:     "Previous insurance document",
    icon:     "📄",
    color:    ["#0369A1", "#38BDF8"],
    features: ["NAICOM-approved providers", "Instant policy issuance", "Electronic certificate"],
  },
};

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/* ─── Public services showcase (not logged in) ─── */
function PublicServicesView() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const [prices,       setPrices]       = useState(null);
  const [pricesError,  setPricesError]  = useState(false);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    setPricesLoading(true);
    getPrices()
      .then(data => { setPrices(data); setPricesLoading(false); })
      .catch(() => { setPricesError(true); setPricesLoading(false); });
  }, []);

  const getPrice = (priceKey) => prices?.[priceKey]?.price ?? 0;

  return (
    <div className="pub-svc-root">
      <Header /> {/* 2. ✅ Minimal JSX Placement Change */}
      {/* Hero */}
      <div className="pub-svc-hero">
        <div className="pub-svc-hero-inner">
          <div className="pub-svc-eyebrow">Our Services</div>
          <h1 className="pub-svc-title">Renew Your Vehicle Documents Online</h1>
          <p className="pub-svc-sub">
            Fixed prices, no hidden charges. Handled by certified agents so you never
            have to visit a government office.
          </p>
          <div className="pub-svc-hero-btns">
            <button className="pub-svc-signin-btn" onClick={() => navigate("/login")}>
              Sign In to Get Started
            </button>
            <button className="pub-svc-signup-btn" onClick={() => navigate("/signup")}>
              Create Free Account
            </button>
          </div>
        </div>
      </div>

      {/* Price error banner */}
      {pricesError && (
        <div className="svc-error-banner" style={{ margin: "16px auto", maxWidth: 800 }}>
          ⚠️ Could not load service prices. Please refresh to try again.
        </div>
      )}

      {/* Service Cards */}
      <div className="pub-svc-cards-section">
        <div className="pub-svc-cards-grid">
          {Object.values(SERVICE_CONFIGS).map((svc) => {
            const [from, to] = svc.color;
            const isHovered  = hovered === svc.key;
            const price      = getPrice(svc.priceKey);
            return (
              <div
                key={svc.key}
                className={`pub-svc-card ${isHovered ? "pub-svc-card-hovered" : ""}`}
                onMouseEnter={() => setHovered(svc.key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate("/login")}
              >
                {/* Gradient accent top bar */}
                <div className="pub-svc-card-bar" style={{ background: `linear-gradient(90deg,${from},${to})` }} />

                <div className="pub-svc-card-icon" style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                  {svc.icon}
                </div>

                <div className="pub-svc-card-label">{svc.label}</div>
                <p className="pub-svc-card-desc">{svc.desc}</p>

                <ul className="pub-svc-card-features">
                  {svc.features.map(f => (
                    <li key={f}>
                      <span className="pub-svc-check" style={{ color: from }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                <div className="pub-svc-card-meta">
                  <span className="pub-svc-card-duration">⏱ {svc.duration}</span>
                  <span className="pub-svc-card-docs">📁 {svc.docs}</span>
                </div>

                <div className="pub-svc-card-bottom">
                  <div className="pub-svc-price" style={{ color: from }}>
                    {pricesLoading ? (
                      <span className="svc-price-skeleton">Loading…</span>
                    ) : pricesError ? (
                      <span className="svc-price-skeleton">—</span>
                    ) : (
                      <>
                        ₦{price.toLocaleString()}
                        <span className="pub-svc-price-label">Fixed Fee</span>
                      </>
                    )}
                  </div>
                  <button
                    className="pub-svc-cta-btn"
                    style={{ background: `linear-gradient(135deg,${from},${to})` }}
                    onClick={e => { e.stopPropagation(); navigate("/login"); }}
                  >
                    Sign In to Pay →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust badges */}
      <div className="pub-svc-trust">
        {[
          { icon: "🔒", label: "Secure Payments", sub: "Powered by Flutterwave" },
          { icon: "✅", label: "FRSC Verified",   sub: "National registry checks" },
          { icon: "⚡", label: "Fast Processing",  sub: "Within 1–3 business days" },
          { icon: "💬", label: "24/7 Support",     sub: "Always here to help" },
        ].map(t => (
          <div className="pub-svc-trust-item" key={t.label}>
            <span className="pub-svc-trust-icon">{t.icon}</span>
            <div>
              <div className="pub-svc-trust-label">{t.label}</div>
              <div className="pub-svc-trust-sub">{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Authenticated services view ─── */
export default function Services() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [user,         setUser]         = useState(null);
  const [vehicles,     setVehicles]     = useState([]);
  const [authLoading,  setAuthLoading]  = useState(true);
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  const [selected,     setSelected]     = useState({ license: false, roadworthiness: false, insurance: false });
  const [plateNumber,  setPlateNumber]  = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const [prices,        setPrices]        = useState(null);
  const [pricesError,   setPricesError]   = useState(false);
  const [pricesLoading, setPricesLoading] = useState(true);

  // Fetch prices on mount
  useEffect(() => {
    setPricesLoading(true);
    getPrices()
      .then(data => { setPrices(data); setPricesLoading(false); })
      .catch(() => { setPricesError(true); setPricesLoading(false); });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("careal_token");
    if (!token) { setAuthLoading(false); setIsLoggedIn(false); return; }

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/profile`,  { headers }),
      fetch(`${API_BASE}/vehicles`, { headers }),
    ])
      .then(async ([profRes, vehRes]) => {
        if (profRes.status === 401 || vehRes.status === 401) {
          localStorage.removeItem("careal_token");
          setIsLoggedIn(false);
          return;
        }
        const profData = await profRes.json();
        const vehData  = await vehRes.json();
        setUser(profData.user || null);
        const vlist = vehData.vehicles || [];
        setVehicles(vlist);
        setIsLoggedIn(true);
        const urlPlate = params.get("plate");
        if (urlPlate && vlist.some(v => v.plate_number === urlPlate)) setPlateNumber(urlPlate);
        else if (vlist.length > 0) setPlateNumber(vlist[0].plate_number);
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setAuthLoading(false));
  }, [navigate]);

  // Helper to get price for a service
  const getPrice = (priceKey) => prices?.[priceKey]?.price ?? 0;

  const selectedServices = Object.entries(SERVICE_CONFIGS).filter(([k]) => selected[k]);
  const total     = selectedServices.reduce((sum, [, s]) => sum + getPrice(s.priceKey), 0);
  const hasSelection = selectedServices.length > 0;
  const canProceed   = hasSelection && !!plateNumber && !pricesLoading && !pricesError;

  const disabledReason = !hasSelection && !plateNumber ? "Select a service and a vehicle to continue"
    : !hasSelection ? "Select at least one service to continue"
    : !plateNumber  ? "Select a vehicle plate to continue" : "";

  const toggle = (key) => setSelected(prev => ({ ...prev, [key]: !prev[key] }));

  const handleProceed = () => {
    setError(""); if (!canProceed) { setError(disabledReason); return; } setShowModal(true);
  };

  const handleConfirmPayment = async () => {
    setLoading(true); setError("");
    const token = localStorage.getItem("careal_token");
    try {
      const res = await fetch(`${API_BASE}/payments/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate_number: plateNumber, license: selected.license, roadworthiness: selected.roadworthiness, insurance: selected.insurance }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to initiate payment."); setLoading(false); return; }
      window.location.href = data.payment_link;
    } catch { setError("Network error. Please check your connection."); setLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="svc-loading-screen">
        <div className="svc-spinner" />
        <span className="svc-loading-text">Loading…</span>
      </div>
    );
  }

  // Not logged in → show public services page
  if (!isLoggedIn) return <PublicServicesView />;

  // Logged in but prices failed → show error banner, hide payment UI
  if (pricesError) {
    return (
      <>
        <div className="svc-root">
          <nav className="svc-nav">
            <div className="svc-nav-logo">CAR<span>EAL</span></div>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <button className="svc-dash-link" onClick={() => navigate("/dashboard")}>← Dashboard</button>
              <div className="svc-avatar">
                {user ? `${user.first_name?.[0]||""}${user.last_name?.[0]||""}` : "?"}
              </div>
            </div>
          </nav>
          <div className="svc-scroll">
            <div className="svc-page">
              <div className="svc-error-banner" style={{ marginTop: 32 }}>
                ⚠️ Could not load service prices. Please refresh to try again.
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Logged in → show the payment flow
  return (
    <>
      <div className="svc-root">
        <nav className="svc-nav">
          <div className="svc-nav-logo">CAR<span>EAL</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button className="svc-dash-link" onClick={() => navigate("/dashboard")}>← Dashboard</button>
            <div className="svc-avatar">
              {user ? `${user.first_name?.[0]||""}${user.last_name?.[0]||""}` : "?"}
            </div>
          </div>
        </nav>

        <div className="svc-scroll">
          <div className="svc-page">
            <div className="svc-header">
              <h1 className="svc-title">Renew Your Vehicle Documents</h1>
              <p className="svc-subtitle">Select one or more services below. Prices are fixed — no hidden charges.</p>
            </div>

            <div className="svc-plate-row">
              <label className="svc-plate-label">Vehicle Plate Number</label>
              {vehicles.length > 0 ? (
                <select className="plate-select" value={plateNumber} onChange={e => setPlateNumber(e.target.value)}>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate_number}>{v.plate_number}{v.make ? ` · ${v.make}` : ""}</option>
                  ))}
                </select>
              ) : (
                <div>
                  <div className="svc-no-vehicle-warn">
                    ⚠️ No registered vehicles.{" "}
                    <button onClick={() => navigate("/add-vehicle")} className="svc-link-btn">Add a vehicle →</button>{" "}
                    or type your plate number below.
                  </div>
                  <input placeholder="Enter plate number e.g. ABC-123-DE" value={plateNumber}
                    onChange={e => setPlateNumber(e.target.value.toUpperCase())} className="svc-plate-input" />
                </div>
              )}
            </div>

            <div className="svc-grid">
              {Object.values(SERVICE_CONFIGS).map((svc) => {
                const on    = selected[svc.key];
                const price = getPrice(svc.priceKey);
                return (
                  <div key={svc.key} className={`svc-card${on ? " selected" : ""}`}
                    onClick={() => toggle(svc.key)} role="checkbox" aria-checked={on}
                    tabIndex={0} onKeyDown={e => e.key === " " && toggle(svc.key)}>
                    <div className={`svc-check${on ? " on" : ""}`}>{on ? "✓" : ""}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                        <span style={{ fontSize:24 }}>{svc.icon}</span>
                        <span className="svc-card-title">{svc.label}</span>
                      </div>
                      <p className="svc-card-desc">{svc.desc}</p>
                      <div className="svc-card-meta">
                        <span>⏱ {svc.duration}</span>
                        <span>📁 {svc.docs}</span>
                      </div>
                    </div>
                    <div className="svc-price-tag" style={{ color: on ? "#7C3AED" : "#A78BFA" }}>
                      {pricesLoading ? (
                        <span className="svc-price-skeleton">Loading…</span>
                      ) : (
                        `₦${price.toLocaleString()}`
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && !showModal && <div className="svc-error-banner">⚠️ {error}</div>}
          </div>
        </div>

        <div className="svc-summary-bar">
          <div>
            {hasSelection ? (
              <>
                <div className="svc-summary-label">{selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected</div>
                <div className="svc-summary-total">
                  Total:{" "}
                  {pricesLoading ? (
                    <span className="svc-price-skeleton">Loading…</span>
                  ) : (
                    `₦${total.toLocaleString()}`
                  )}
                </div>
              </>
            ) : (
              <div className="svc-summary-label empty">Tick a service above to get started</div>
            )}
          </div>
          <div className="proceed-wrap">
            {!canProceed && <div className="proceed-tooltip">{disabledReason}</div>}
            <button className="svc-proceed-btn"
              style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed ? "pointer" : "not-allowed" }}
              onClick={handleProceed}>
              Proceed to Payment →
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="svc-overlay">
          <div className="svc-modal">
            <h2 className="svc-modal-title">Confirm Payment</h2>
            <p className="svc-modal-sub">Vehicle: <strong>{plateNumber}</strong></p>
            <div className="svc-divider" />
            {selectedServices.map(([, svc]) => {
              const price = getPrice(svc.priceKey);
              return (
                <div key={svc.key} className="svc-modal-row">
                  <span>{svc.icon} {svc.label}</span>
                  <span style={{ fontWeight:700 }}>₦{price.toLocaleString()}</span>
                </div>
              );
            })}
            <div className="svc-divider" />
            <div className="svc-modal-row" style={{ fontWeight:800, fontSize:17, color:"#7C3AED" }}>
              <span>Total</span><span>₦{total.toLocaleString()}</span>
            </div>
            <p className="svc-modal-note">
              🔒 You'll be securely redirected to Flutterwave to complete your payment.
            </p>
            {error && <div className="svc-error-banner" style={{ marginTop:12 }}>⚠️ {error}</div>}
            <div className="svc-modal-actions">
              <button className="svc-cancel-btn" onClick={() => { setShowModal(false); setError(""); }} disabled={loading}>Cancel</button>
              <button className="svc-confirm-btn" style={{ opacity: loading ? 0.7 : 1 }}
                onClick={handleConfirmPayment} disabled={loading}>
                {loading ? <><span className="spin-icon">⟳</span> Redirecting…</> : "Pay Now →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
