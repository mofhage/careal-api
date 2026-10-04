// ResetPassword.test.jsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../../assets/images/Careal-logo-2.png", () => ({ default: "logo.png" }));
vi.mock("./Login.css", () => ({}));

import ResetPassword from "./ResetPassword.jsx";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderWithToken(token) {
  const url = token ? `/reset-password?token=${token}` : "/reset-password";
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ResetPassword — missing token", () => {
  it("shows invalid link error and no form when token is absent", () => {
    renderWithToken(null);
    expect(screen.getByText(/this link is invalid/i)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/new password/i)).toBeNull();
  });
});

describe("ResetPassword — validation", () => {
  it("shows inline error and does not call fetch when password is too short", async () => {
    renderWithToken("abc123");
    fireEvent.change(screen.getByPlaceholderText(/new password/i), { target: { value: "short" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 8 characters/i)).toBeTruthy();
  });

  it("shows mismatch error and does not call fetch when passwords differ", async () => {
    renderWithToken("abc123");
    fireEvent.change(screen.getByPlaceholderText(/new password/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/do not match/i)).toBeTruthy();
  });
});

describe("ResetPassword — API responses", () => {
  it("navigates to /login on 200 response", async () => {
    fetch.mockResolvedValueOnce({ status: 200, ok: true });
    renderWithToken("validtoken");
    fireEvent.change(screen.getByPlaceholderText(/new password/i), { target: { value: "newpassword1" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "newpassword1" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("shows expired error with forgot-password link on 400 response", async () => {
    fetch.mockResolvedValueOnce({ status: 400, ok: false });
    renderWithToken("expiredtoken");
    fireEvent.change(screen.getByPlaceholderText(/new password/i), { target: { value: "newpassword1" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "newpassword1" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() => expect(screen.getByText(/expired or is invalid/i)).toBeTruthy());
    expect(screen.getByRole("link", { name: /request a new link/i })).toBeTruthy();
  });

  it("shows generic error and retains form values on 500 response", async () => {
    fetch.mockResolvedValueOnce({ status: 500, ok: false });
    renderWithToken("sometoken");
    fireEvent.change(screen.getByPlaceholderText(/new password/i), { target: { value: "mypassword1" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "mypassword1" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeTruthy());
    expect(screen.getByPlaceholderText(/new password/i).value).toBe("mypassword1");
  });
});