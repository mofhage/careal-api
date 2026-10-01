// StaffRouteGuard.jsx
// Wraps a staff dashboard page. Redirects to /staff/login if:
//   - no staff_token in localStorage
//   - token is expired (exp < now)
//   - token role doesn't match requiredRole prop (if provided)
// Usage: <StaffRouteGuard requiredRole="super_admin"><SuperAdminDashboard /></StaffRouteGuard>

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function StaffRouteGuard({ requiredRole, children }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("staff_token");
    if (!token) {
      navigate("/staff/login", { replace: true });
      return;
    }
    try {
      // Decode JWT payload (base64url)
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

      // Check expiry
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error("expired");
      }
      // Check role if required
      if (requiredRole && payload.role !== requiredRole) {
        throw new Error("wrong_role");
      }
      setAllowed(true);
    } catch {
      localStorage.removeItem("staff_token");
      navigate("/staff/login", { replace: true });
    }
  }, [navigate, requiredRole]);

  if (!allowed) return null;
  return children;
}
