// ResetPassword.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import logo from "../../assets/images/Careal-logo-2.png";
import { validatePasswordReset } from "../../utils/validation.js";
import "./Login.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState(null); // { field, message }
  const [apiError, setApiError] = useState(""); // banner-level error
  const [apiErrorType, setApiErrorType] = useState(""); // "expired" | "generic"
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ── Missing / empty token ────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src={logo} alt="Careal logo" className="login-logo" />
            <h1>Reset Password</h1>
          </div>
          <p className="error" style={{ marginBottom: 0 }}>
            This link is invalid.
          </p>
          <div className="signup-section">
            <p>
              <Link to="/forgot-password" className="link">
                Request a new link →
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Form submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError(null);
    setApiError("");
    setApiErrorType("");

    // Client-side validation first — no API call on failure
    const validationError = validatePasswordReset({ newPassword, confirmPassword });
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Deliberately NO Authorization header (Req 1.6)
        body: JSON.stringify({ token, newPassword }),
      });

      if (res.status === 200) {
        navigate("/login");
        return;
      }

      if (res.status === 400 || res.status === 401) {
        setApiError(
          "This link has expired or is invalid."
        );
        setApiErrorType("expired");
        return;
      }

      // 500 or any other status
      setApiError("Something went wrong. Please try again.");
      setApiErrorType("generic");
    } catch {
      // Network error — keep form values (state already retained), allow retry
      setApiError("Something went wrong. Please try again.");
      setApiErrorType("generic");
    } finally {
      setLoading(false);
    }
  };

  // ── Render form ──────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Careal logo" className="login-logo" />
          <h1>Reset Password</h1>
          <p>Enter your new password below.</p>
        </div>

        {/* Banner-level API errors */}
        {apiError && (
          <p className="error">
            {apiError}
            {apiErrorType === "expired" && (
              <>
                {" "}
                <Link to="/forgot-password" className="link">
                  Request a new link →
                </Link>
              </>
            )}
          </p>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="input-group">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              minLength={8}
              maxLength={128}
              required
              aria-describedby={
                fieldError?.field === "newPassword"
                  ? "new-password-error"
                  : undefined
              }
              aria-invalid={fieldError?.field === "newPassword" || undefined}
            />
            {fieldError?.field === "newPassword" && (
              <p
                id="new-password-error"
                className="error"
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                {fieldError.message}
              </p>
            )}
          </div>

          <div className="input-group">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              aria-describedby={
                fieldError?.field === "confirmPassword"
                  ? "confirm-password-error"
                  : undefined
              }
              aria-invalid={
                fieldError?.field === "confirmPassword" || undefined
              }
            />
            {fieldError?.field === "confirmPassword" && (
              <p
                id="confirm-password-error"
                className="error"
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                {fieldError.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            style={loading ? { opacity: 0.7, cursor: "not-allowed" } : {}}
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        <div className="signup-section">
          <p>
            Remembered your password?{" "}
            <Link to="/login" className="link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
