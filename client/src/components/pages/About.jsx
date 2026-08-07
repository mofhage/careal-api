// About.jsx — Redesigned
import React from "react";
import { useNavigate } from "react-router-dom";

const PILLARS = [
  {
    icon: "🚀",
    title: "Speed",
    text: "We handle paperwork so you don't have to. Most renewals are processed within 1–3 business days.",
  },
  {
    icon: "🔒",
    title: "Security",
    text: "Payments are handled by Flutterwave. Your data is encrypted and never shared with third parties.",
  },
  {
    icon: "✅",
    title: "Verified Data",
    text: "Every vehicle plate is checked against the FRSC national registry before registration is approved.",
  },
  {
    icon: "💬",
    title: "Transparency",
    text: "No hidden fees. Fixed pricing, real-time status updates, and clear communication at every step.",
  },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* Hero */}
      <div className="about-hero">
        <div className="about-hero-eyebrow">About CAREAL</div>
        <h1 className="about-hero-title">
          The Smarter Way to Manage<br />Your Vehicle Documents
        </h1>
        <p className="about-hero-sub">
          CAREAL is a Nigerian digital platform that empowers car owners to renew
          vehicle licences, road worthiness certificates, and motor insurance —
          all online, without stepping into a government office.
        </p>
        <button className="about-hero-btn" onClick={() => navigate("/signup")}>
          Get Started Free →
        </button>
      </div>

      {/* Pillars */}
      <div className="about-pillars-section">
        <div className="about-section-eyebrow">Our Promise</div>
        <h2 className="about-section-title">Built on Four Principles</h2>
        <div className="about-pillars-grid">
          {PILLARS.map((p) => (
            <div className="about-pillar-card" key={p.title}>
              <div className="about-pillar-icon">{p.icon}</div>
              <div className="about-pillar-title">{p.title}</div>
              <p className="about-pillar-text">{p.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="about-mission">
        <div className="about-mission-inner">
          <div className="about-section-eyebrow" style={{ color: "#C4B5FD" }}>Our Mission</div>
          <h2 className="about-mission-title">
            Making Vehicle Compliance Effortless for Every Nigerian
          </h2>
          <p className="about-mission-text">
            Millions of Nigerians lose hours — sometimes days — to government queues
            just to keep their vehicles legal. CAREAL exists to change that.
            We handle the full renewal process and tracked every step of the way.
          </p>
        </div>
      </div>
    </div>
  );
}

const S = { page: { paddingTop: 68 } };

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  .about-hero { text-align:center; padding:80px 24px 80px; background:#F8F6FF;
    border-bottom:1.5px solid #EDE9FE; }
  .about-hero-eyebrow { font-size:12px; font-weight:700; color:#7C3AED;
    text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; }
  .about-hero-title { font-family:'Syne',sans-serif; font-size:clamp(28px,4vw,46px);
    font-weight:800; color:#1E1040; line-height:1.1; letter-spacing:-0.5px;
    margin-bottom:18px; }
  .about-hero-sub { font-size:16px; color:#7C7CA0; line-height:1.7;
    max-width:600px; margin:0 auto 32px; }
  .about-hero-btn { display:inline-flex; align-items:center; gap:8px;
    background:linear-gradient(135deg,#7C3AED,#9D5CF6); color:#fff;
    font-family:'DM Sans',sans-serif; font-size:15px; font-weight:700;
    padding:14px 32px; border-radius:14px; border:none; cursor:pointer;
    box-shadow:0 6px 20px rgba(124,58,237,0.28); transition:transform 0.2s,box-shadow 0.2s; }
  .about-hero-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(124,58,237,0.38); }

  .about-pillars-section { padding:72px 40px; text-align:center; background:#fff; }
  .about-section-eyebrow { font-size:12px; font-weight:700; color:#7C3AED;
    text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
  .about-section-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3.5vw,36px);
    font-weight:800; color:#1E1040; margin-bottom:48px; letter-spacing:-0.3px; }
  .about-pillars-grid { display:grid; grid-template-columns:repeat(4,1fr);
    gap:22px; max-width:1100px; margin:0 auto; }
  .about-pillar-card { background:#F8F6FF; border:1.5px solid #EDE9FE;
    border-radius:20px; padding:30px 24px; text-align:left;
    transition:transform 0.2s,box-shadow 0.2s; }
  .about-pillar-card:hover { transform:translateY(-4px); box-shadow:0 10px 32px rgba(124,58,237,0.1); }
  .about-pillar-icon { font-size:32px; margin-bottom:14px; }
  .about-pillar-title { font-family:'Syne',sans-serif; font-size:16px;
    font-weight:700; color:#1E1040; margin-bottom:8px; }
  .about-pillar-text { font-size:13.5px; color:#7C7CA0; line-height:1.6; }

  .about-mission { background:linear-gradient(135deg,#6D28D9,#7C3AED,#9D5CF6);
    padding:72px 40px; text-align:center; }
  .about-mission-inner { max-width:680px; margin:0 auto; }
  .about-mission-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3.5vw,36px);
    font-weight:800; color:#fff; margin-bottom:18px; letter-spacing:-0.3px; }
  .about-mission-text { font-size:16px; color:rgba(255,255,255,0.75); line-height:1.75; }

  @media (max-width:900px) { .about-pillars-grid { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:560px) { .about-pillars-grid { grid-template-columns:1fr; }
    .about-pillars-section,.about-mission { padding:56px 20px; }
    .about-hero { padding:60px 20px; } }
`;
