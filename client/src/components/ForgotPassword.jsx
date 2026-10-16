// ForgotPassword.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      // Don't redirect — just show the confirmation so the user
      // knows to check their inbox for the reset link.
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>Check Your Email</h2>
          <p style={{ fontSize: "14px", margin: "10px 0", color: "#15803D" }}>
            ✅ We've sent a password reset link to <strong>{email}</strong>.
          </p>
          <p style={{ fontSize: "13px", color: "#7C7CA0", marginTop: "10px", lineHeight: 1.6 }}>
            Click the link in the email to set a new password. The link expires after a short time —
            if you don't see it, check your spam folder.
          </p>
          <p style={{ fontSize: "13px", marginTop: "16px" }}>
            Didn't receive it?{" "}
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              style={{ background: "none", border: "none", color: "#7C3AED", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "13px" }}
            >
              Try again →
            </button>
          </p>
          <div style={{ marginTop: "16px" }}>
            <Link to="/login" style={{ fontSize: "13px", color: "#7C7CA0" }}>
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Reset Password</h2>
        <p style={{ fontSize: "14px", margin: "10px 0" }}>
          Enter your email address and we'll send you a reset link.
        </p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSendCode} className="login-form">
          <div className="input-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email Address"
            />
          </div>
          <button className="submit-btn" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <div style={{ marginTop: "16px" }}>
          <Link to="/login" style={{ fontSize: "13px", color: "#7C7CA0" }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
