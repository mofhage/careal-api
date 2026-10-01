// Contact.jsx — Static info + authenticated ContactForm
import React, { useState, useEffect } from "react";
import { validateContactForm } from "../../utils/validation.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const CHANNELS = [
  {
    icon: "📧",
    label: "Email Support",
    value: "support@careal.com",
    hint: "We typically reply within 24 hours",
    href: "mailto:support@careal.com",
  },
  {
    icon: "📱",
    label: "Phone / WhatsApp",
    value: "+234 800 000 0000",
    hint: "Monday – Friday, 9am – 6pm WAT",
    href: "tel:+2348000000000",
  },
  {
    icon: "🐦",
    label: "Twitter / X",
    value: "@devcareal",
    hint: "Fastest for quick questions",
    href: "https://x.com/devcareal",
  },
];

function ContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSuccessMsg("");
    setErrorMsg("");

    const validationError = validateContactForm({ subject, message });
    if (validationError) {
      setErrors({ [validationError.field]: validationError.message });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("careal_token");
      const res = await fetch(`${API_BASE}/messages/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, message }),
      });

      if (res.status === 201) {
        setSuccessMsg("Message sent! We'll get back to you soon.");
        setSubject("");
        setMessage("");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message || "Submission failed. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cf-section">
      <h2 className="cf-heading">Send Us a Message</h2>
      <p className="cf-sub">
        Logged-in users can send us a direct message and we'll reply in the app.
      </p>

      <form className="cf-form" onSubmit={handleSubmit} noValidate>
        <div className="cf-field">
          <label className="cf-label" htmlFor="cf-subject">
            Subject <span className="cf-required">*</span>
          </label>
          <input
            id="cf-subject"
            type="text"
            className={`cf-input${errors.subject ? " cf-input--error" : ""}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder="e.g. Issue with my payment"
            disabled={submitting}
            aria-describedby={errors.subject ? "cf-subject-err" : undefined}
          />
          {errors.subject && (
            <span id="cf-subject-err" className="cf-error" role="alert">
              {errors.subject}
            </span>
          )}
        </div>

        <div className="cf-field">
          <label className="cf-label" htmlFor="cf-message">
            Message <span className="cf-required">*</span>
          </label>
          <textarea
            id="cf-message"
            className={`cf-textarea${errors.message ? " cf-input--error" : ""}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            placeholder="Describe your issue or question in detail…"
            rows={6}
            disabled={submitting}
            aria-describedby={errors.message ? "cf-message-err" : undefined}
          />
          <div className="cf-char-count">{message.length} / 2000</div>
          {errors.message && (
            <span id="cf-message-err" className="cf-error" role="alert">
              {errors.message}
            </span>
          )}
        </div>

        {successMsg && (
          <div className="cf-banner cf-banner--success" role="status">
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="cf-banner cf-banner--error" role="alert">
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="cf-submit"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Sending…" : "Send Message"}
        </button>
      </form>
    </div>
  );
}

export default function Contact() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("careal_token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div style={{ paddingTop: 68 }}>
      <style>{CSS}</style>

      <div className="contact-hero">
        <div className="contact-eyebrow">Contact Us</div>
        <h1 className="contact-title">We're Here to Help</h1>
        <p className="contact-sub">
          Questions about your vehicle documents, payment issues, or anything else?
          Reach us through any of the channels below.
        </p>
      </div>

      <div className="contact-cards-section">
        <div className="contact-cards-grid">
          {CHANNELS.map((ch) => (
            <a
              key={ch.label}
              href={ch.href}
              target={ch.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-card-icon">{ch.icon}</div>
              <div className="contact-card-label">{ch.label}</div>
              <div className="contact-card-value">{ch.value}</div>
              <div className="contact-card-hint">{ch.hint}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="contact-note">
        <div className="contact-note-inner">
          <span style={{ fontSize: 20 }}>ℹ️</span>
          <span>
            For payment-related issues, please have your transaction reference
            number (tx_ref) ready when contacting support. It helps us resolve
            your case much faster.
          </span>
        </div>
      </div>

      {isAuthenticated && <ContactForm />}
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  .contact-hero { text-align:center; padding:72px 24px 60px; background:#F8F6FF;
    border-bottom:1.5px solid #EDE9FE; }
  .contact-eyebrow { font-size:12px; font-weight:700; color:#7C3AED;
    text-transform:uppercase; letter-spacing:2px; margin-bottom:12px; }
  .contact-title { font-family:'Syne',sans-serif; font-size:clamp(28px,4vw,44px);
    font-weight:800; color:#1E1040; margin-bottom:14px; letter-spacing:-0.5px; }
  .contact-sub { font-size:16px; color:#7C7CA0; line-height:1.65;
    max-width:520px; margin:0 auto; }

  .contact-cards-section { padding:64px 40px; background:#fff; }
  .contact-cards-grid { display:grid; grid-template-columns:repeat(3,1fr);
    gap:20px; max-width:900px; margin:0 auto; }
  .contact-card { display:flex; flex-direction:column; gap:6px;
    background:#F8F6FF; border:1.5px solid #EDE9FE; border-radius:20px;
    padding:30px 26px; text-decoration:none; cursor:pointer;
    transition:transform 0.2s,box-shadow 0.2s,border-color 0.2s; }
  .contact-card:hover { transform:translateY(-4px);
    box-shadow:0 10px 32px rgba(124,58,237,0.12); border-color:#C4B5FD; }
  .contact-card-icon { font-size:32px; margin-bottom:8px; }
  .contact-card-label { font-size:11px; font-weight:700; color:#A78BFA;
    text-transform:uppercase; letter-spacing:1px; }
  .contact-card-value { font-family:'Syne',sans-serif; font-size:16px;
    font-weight:700; color:#1E1040; }
  .contact-card-hint { font-size:13px; color:#7C7CA0; line-height:1.4; }

  .contact-note { background:#FAF5FF; border-top:1.5px solid #EDE9FE; padding:28px 40px; }
  .contact-note-inner { max-width:900px; margin:0 auto; display:flex;
    align-items:flex-start; gap:12px; font-size:14px; color:#7C7CA0; line-height:1.6; }

  @media (max-width:700px) {
    .contact-cards-grid { grid-template-columns:1fr; max-width:420px; }
    .contact-cards-section,.contact-note { padding:48px 20px; }
    .contact-hero { padding:60px 20px; }
  }

  /* ── ContactForm ── */
  .cf-section { max-width:620px; margin:0 auto; padding:64px 40px 80px; }
  .cf-heading { font-family:'Syne',sans-serif; font-size:clamp(22px,3vw,32px);
    font-weight:800; color:#1E1040; margin-bottom:8px; letter-spacing:-0.3px; }
  .cf-sub { font-size:15px; color:#7C7CA0; margin-bottom:36px; line-height:1.6; }

  .cf-form { display:flex; flex-direction:column; gap:22px; }
  .cf-field { display:flex; flex-direction:column; gap:6px; }
  .cf-label { font-size:13px; font-weight:600; color:#4B3D8A; }
  .cf-required { color:#7C3AED; }

  .cf-input, .cf-textarea {
    width:100%; padding:12px 14px; font-size:15px; font-family:'DM Sans',sans-serif;
    border:1.5px solid #DDD6FE; border-radius:12px; background:#FDFCFF;
    color:#1E1040; outline:none; transition:border-color 0.2s, box-shadow 0.2s;
    box-sizing:border-box;
  }
  .cf-input:focus, .cf-textarea:focus {
    border-color:#7C3AED; box-shadow:0 0 0 3px rgba(124,58,237,0.12);
  }
  .cf-input--error { border-color:#DC2626 !important; }
  .cf-textarea { resize:vertical; min-height:140px; }

  .cf-char-count { font-size:12px; color:#A78BFA; text-align:right; margin-top:4px; }

  .cf-error { font-size:12px; color:#DC2626; font-weight:500; }

  .cf-banner { padding:12px 16px; border-radius:10px; font-size:14px;
    font-weight:500; line-height:1.5; }
  .cf-banner--success { background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; }
  .cf-banner--error   { background:#FEF2F2; color:#991B1B; border:1px solid #FECACA; }

  .cf-submit {
    align-self:flex-start; padding:13px 32px; font-size:15px; font-weight:700;
    font-family:'Syne',sans-serif; color:#fff; background:#7C3AED;
    border:none; border-radius:12px; cursor:pointer;
    transition:background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow:0 4px 14px rgba(124,58,237,0.25);
  }
  .cf-submit:hover:not(:disabled) {
    background:#6D28D9; transform:translateY(-2px);
    box-shadow:0 8px 20px rgba(124,58,237,0.3);
  }
  .cf-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

  @media (max-width:700px) {
    .cf-section { padding:48px 20px 64px; }
    .cf-submit { width:100%; text-align:center; }
  }
`;
