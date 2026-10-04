// StaffRouteGuard.test.jsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import StaffRouteGuard from "./StaffRouteGuard.jsx";

// Helpers
function makeToken(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

function renderGuard(requiredRole, token) {
  if (token) localStorage.setItem("staff_token", token);
  else localStorage.removeItem("staff_token");
  return render(
    <MemoryRouter>
      <StaffRouteGuard requiredRole={requiredRole}>
        <div>Protected Content</div>
      </StaffRouteGuard>
    </MemoryRouter>
  );
}

beforeEach(() => { mockNavigate.mockClear(); localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe("StaffRouteGuard", () => {
  it("redirects to /staff/login when no staff_token in localStorage", async () => {
    renderGuard("super_admin", null);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff/login", { replace: true }));
  });

  it("redirects when token is expired", async () => {
    const expiredToken = makeToken({ role: "super_admin", exp: Math.floor(Date.now() / 1000) - 10 });
    renderGuard("super_admin", expiredToken);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff/login", { replace: true }));
  });

  it("redirects when role does not match requiredRole", async () => {
    const token = makeToken({ role: "field_agent", exp: Math.floor(Date.now() / 1000) + 3600 });
    renderGuard("super_admin", token);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff/login", { replace: true }));
  });

  it("renders children when token is valid and no requiredRole specified", async () => {
    const token = makeToken({ role: "contact_agent", exp: Math.floor(Date.now() / 1000) + 3600 });
    renderGuard(undefined, token);
    await waitFor(() => expect(screen.getByText("Protected Content")).toBeTruthy());
  });

  it("renders children when token is valid and role matches requiredRole", async () => {
    const token = makeToken({ role: "super_admin", exp: Math.floor(Date.now() / 1000) + 3600 });
    renderGuard("super_admin", token);
    await waitFor(() => expect(screen.getByText("Protected Content")).toBeTruthy());
  });
});