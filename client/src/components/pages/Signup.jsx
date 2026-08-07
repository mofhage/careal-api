// Signup.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Pages.css";
import "./Signup.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function Signup() {
  const [formData, setFormData] = useState({
    firstName:       "",
    otherName:       "",
    lastName:        "",
    plateNumber:     "",
    chassis:         "",
    email:           "",
    password:        "",
    confirmPassword: "",
  });

  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Google-style visibility toggle state
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setFormData({
      firstName:       "",
      otherName:       "",
      lastName:        "",
      plateNumber:     "",
      chassis:         "",
      email:           "",
      password:        "",
      confirmPassword: "",
    });
    setAgreeToTerms(false);
    setShowPassword(false);
  }, []);

  // const handleChange = (e) => {
  //   setFormData({ ...formData, [e.target.name]: e.target.value });
  // };

  const handleChange = (e) => {
    let value = e.target.value;
    
    // Explicitly enforce alphanumeric + hyphens uppercase sanitation for plate numbers
    if (e.target.name === "plateNumber") {
      value = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    }
    
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreeToTerms) {
      setError("You must agree to the Terms of Use and Privacy Policy.");
      return;
    }

    try {
      const { confirmPassword, ...signupPayload } = formData;
      const res = await axios.post(
        `${API_BASE}/auth/signup`,
        signupPayload,
        { withCredentials: true }
      );

      if (res.data.token) {
        localStorage.setItem("careal_token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
      // navigate("/dashboard");
      navigate("/login");
    } catch (err) {
      console.error("Signup error:", err.response?.data || err.message);
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <h2>Registration</h2>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          
          {/* Row 1: Names (Becomes side-by-side on desktop) */}
          <div className="form-row">
            <div className="input-group">
              <input
                type="text"
                name="firstName"
                placeholder=" "
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <span className="floating-placeholder">First Name</span>
            </div>

            <div className="input-group">
              <input
                type="text"
                name="lastName"
                placeholder=" "
                value={formData.lastName}
                onChange={handleChange}
                required
              />
              <span className="floating-placeholder">Last Name</span>
            </div>
          </div>

          {/* Row 2: Optional Middle Identity */}
          <div className="input-group">
            <input
              type="text"
              name="otherName"
              placeholder=" "
              value={formData.otherName}
              onChange={handleChange}
            />
            <span className="floating-placeholder">Other Name (Optional)</span>
          </div>

          {/* Row 3: Vehicle Data Metrics */}
          <div className="form-row">
            <div className="input-group">
              <input
                type="text"
                name="plateNumber"
                placeholder=" "
                autoCapitalize="characters"
                value={formData.plateNumber}
                onChange={handleChange}
                required
              />
              <span className="floating-placeholder">Plate Number</span>
            </div>

            <div className="input-group">
              <input
                type="text"
                name="chassis"
                placeholder=" "
                autoCapitalize="characters"
                value={formData.chassis}
                onChange={handleChange}
                required
              />
              <span className="floating-placeholder">Chassis Number</span>
            </div>
          </div>

          {/* Row 4: Core Contact Information */}
          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <span className="floating-placeholder">Email Address</span>
          </div>

          {/* Row 5: Security Credentials */}
          <div className="form-row">
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder=" "
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <span className="floating-placeholder">Password</span>
            </div>

            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder=" "
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <span className="floating-placeholder">Repeat Password</span>
            </div>
          </div>

          {/* Google-Style Password Visibility Checkbox */}
          <div className="checkbox-group" style={{ marginBottom: "10px" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <span>Show password</span>
            </label>
          </div>

          {/* Legal Compliance Checkbox */}
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
              />
              <span>
                I agree to the{" "}
                <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="link-inline">
                  Terms of Use
                </a>{" "}
                and{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="link-inline">
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          <button type="submit" className="submit-btn">
            Create Account
          </button>
        </form>

        <p className="toggle-text">
          Already have an account?{" "}
          <span className="link" onClick={() => navigate("/login")}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default Signup;