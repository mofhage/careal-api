// Dashboard.test.jsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Dashboard from "./Dashboard.jsx";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeFetch(status, deliveryMethod) {
  return vi.fn().mockImplementation((url) => {
    if (url.includes("/profile")) {
      return Promise.resolve({ ok: true, json: async () => ({ user: { first_name: "Test", last_name: "User", email: "t@t.com" } }) });
    }
    if (url.includes("/vehicles")) {
      return Promise.resolve({ ok: true, json: async () => ({ vehicles: [{ id: 1, plate_number: "ABC-123", make: "Toyota", color: "Black", created_at: "2024-01-01" }] }) });
    }
    if (url.includes("/payments")) {
      return Promise.resolve({ ok: true, json: async () => ([
        { id: 1, plate_number: "ABC-123", license: true, license_status: "Pending", license_amount: 2500,
          roadworthiness: false, roadworthiness_status: "N/A", roadworthiness_amount: 0,
          insurance: false, insurance_status: "N/A", insurance_amount: 0,
          amount: 2500, payment_ref: "REF-001", status, delivery_method: deliveryMethod }
      ]) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

beforeEach(() => {
  localStorage.setItem("careal_token", "test-token");
  mockNavigate.mockClear();
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("OrderProgressBar — stage mapping", () => {
  it("status paid: stage 1 dot is active", async () => {
    vi.stubGlobal("fetch", makeFetch("paid", "agent_delivery"));
    renderDashboard();
    await waitFor(() => screen.getByText("Paid"));
    const dots = document.querySelectorAll(".opb-dot");
    expect(dots[0].classList.contains("active")).toBe(true);
    expect(dots[1].classList.contains("active")).toBe(false);
  });

  it("status in_progress: stage 2 active, stage 1 done", async () => {
    vi.stubGlobal("fetch", makeFetch("in_progress", "agent_delivery"));
    renderDashboard();
    await waitFor(() => screen.getByText("In Progress"));
    const dots = document.querySelectorAll(".opb-dot");
    expect(dots[0].classList.contains("done")).toBe(true);
    expect(dots[1].classList.contains("active")).toBe(true);
  });

  it("status ready_for_delivery: stage 3 active", async () => {
    vi.stubGlobal("fetch", makeFetch("ready_for_delivery", "agent_delivery"));
    renderDashboard();
    await waitFor(() => screen.getByText("Ready"));
    const dots = document.querySelectorAll(".opb-dot");
    expect(dots[2].classList.contains("active")).toBe(true);
  });

  it("status delivered: stage 4 active", async () => {
    vi.stubGlobal("fetch", makeFetch("delivered", "agent_delivery"));
    renderDashboard();
    await waitFor(() => screen.getByText("Delivered"));
    const dots = document.querySelectorAll(".opb-dot");
    expect(dots[3].classList.contains("active")).toBe(true);
  });
});

describe("OrderProgressBar — delivery label", () => {
  it("final stage label is Delivered when delivery_method is agent_delivery", async () => {
    vi.stubGlobal("fetch", makeFetch("paid", "agent_delivery"));
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText("Delivered").length).toBeGreaterThan(0));
  });

  it("final stage label is Collected when delivery_method is personal_collection", async () => {
    vi.stubGlobal("fetch", makeFetch("paid", "personal_collection"));
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText("Collected").length).toBeGreaterThan(0));
  });
});

describe("OrderProgressBar — unknown status", () => {
  it("shows stage 1 active and raw status string for unknown status", async () => {
    vi.stubGlobal("fetch", makeFetch("unknown_xyz", "agent_delivery"));
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/unknown_xyz/)).toBeTruthy());
    const dots = document.querySelectorAll(".opb-dot");
    expect(dots[0].classList.contains("active")).toBe(true);
  });
});