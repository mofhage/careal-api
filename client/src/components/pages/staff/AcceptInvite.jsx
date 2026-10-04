// AcceptInvite.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>CAR<span style={{ color: "#1E1040" }}>EAL</span></div>
          <h1 style={styles.title}>Invalid Link</h1>
          <p style={styles.error}>This invite link is invalid or missing a token.</p>
          <p style={styles.hint}>Please ask your administrator to send a new invite.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password.length > 128) { setError("Password must not exceed 128 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agents/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.status === 200) { navigate("/staff/login"); return; }
      if (res.status === 400 || res.status === 401) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "This invite link has expired or is invalid. Please request a new one.");
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>CAR<span style={{ color: "#1E1040" }}>EAL</span></div>
        <h1 style={styles.title}>Set Your Password</h1>
        <p style={styles.subtitle}>Create a password to activate your staff account.</p>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <input
            type="password"
            placeholder="Set Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            minLength={8}
            maxLength={128}
            required
            disabled={loading}
          />
          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Activating…" : "Activate Account"}
          </button>
        </form>
        <p style={styles.footerLink}>
          Already have an account?{" "}
          <Link to="/staff/login" style={{ color: "#7C3AED", fontWeight: 600 }}>Staff Login →</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#F8F6FF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px" },
  card: { background: "#fff", borderRadius: "24px", padding: "48px 40px", maxWidth: "420px", width: "100%", boxShadow: "0 8px 40px rgba(124,58,237,0.12)", textAlign: "center" },
  logo: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "28px", color: "#7C3AED", letterSpacing: "-0.5px", marginBottom: "24px" },
  title: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "24px", color: "#1E1040", marginBottom: "8px" },
  subtitle: { fontSize: "14px", color: "#7C7CA0", marginBottom: "28px", lineHeight: 1.6 },
  error: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px" },
  hint: { fontSize: "13px", color: "#7C7CA0", marginTop: "8px" },
  form: { display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" },
  input: { width: "100%", padding: "13px 16px", border: "1.5px solid #EDE9FE", borderRadius: "12px", fontSize: "15px", fontFamily: "inherit", color: "#1E1040", background: "#FAFAFE", outline: "none", boxSizing: "border-box" },
  btn: { width: "100%", padding: "14px", background: "linear-gradient(135deg,#7C3AED,#A78BFA)", color: "#fff", border: "none", borderRadius: "12px", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "15px", cursor: "pointer" },
  footerLink: { marginTop: "20px", fontSize: "13px", color: "#7C7CA0" },
};