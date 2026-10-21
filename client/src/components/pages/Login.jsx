// Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../../assets/images/Careal-logo-2.png'; 
import "./Pages.css";
import "./Login.css";

const API_BASE = import.meta.env.VITE_API_BASE || "https://careal-backend.onrender.com/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        `${API_BASE}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      // Save token — same key used across Dashboard, Services, AddVehicle
      localStorage.setItem("careal_token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">
          <img src={logo} alt="Careal logo" className="login-logo" />
          
          <h1>Sign in</h1>

          <p>
            Use your CAREAL account to continue
          </p>
        </div>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">

          <div className="input-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>

          <div className="forgot-password">
            <span onClick={() => navigate("/forgot-password")}>
              Forgot password?
            </span>
          </div>

          <button className="submit-btn">
            Login
          </button>
        </form>

        <div className="signup-section">
          <p>
            Don't have an account?{" "}
            <span
              className="link"
              onClick={() => navigate("/signup")}
            >
              Create account
            </span>
          </p>
        </div>

      </div>

    </div>
  );
}

export default Login;