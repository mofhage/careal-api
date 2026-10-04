// Contact.test.jsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import Contact from "./Contact.jsx";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("Contact — unauthenticated view", () => {
  it("shows static contact details and no message form when not logged in", () => {
    render(<Contact />);
    expect(screen.getByText(/we're here to help/i)).toBeTruthy();
    expect(screen.queryByText(/send us a message/i)).toBeNull();
  });
});

describe("Contact — authenticated view", () => {
  beforeEach(() => localStorage.setItem("careal_token", "test-token-123"));

  it("renders the ContactForm for logged-in users", async () => {
    render(<Contact />);
    await waitFor(() => expect(screen.getByText(/send us a message/i)).toBeTruthy());
  });

  it("shows subject field error when subject exceeds 120 chars and does not call fetch", async () => {
    render(<Contact />);
    await waitFor(() => screen.getByText(/send us a message/i));
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "a".repeat(121) } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "This is a valid message body." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/must not exceed 120/i)).toBeTruthy();
  });

  it("shows message field error when message is too short and does not call fetch", async () => {
    render(<Contact />);
    await waitFor(() => screen.getByText(/send us a message/i));
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Help needed" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Too short" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 10 characters/i)).toBeTruthy();
  });

  it("calls fetch with correct body and Authorization header on valid submit", async () => {
    fetch.mockResolvedValueOnce({ status: 201, ok: true, json: async () => ({}) });
    render(<Contact />);
    await waitFor(() => screen.getByText(/send us a message/i));
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Payment issue" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "I have a problem with my recent payment." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/messages/contact");
    expect(opts.headers.Authorization).toBe("Bearer test-token-123");
    const body = JSON.parse(opts.body);
    expect(body.subject).toBe("Payment issue");
  });

  it("shows success message and clears form on 201 response", async () => {
    fetch.mockResolvedValueOnce({ status: 201, ok: true, json: async () => ({}) });
    render(<Contact />);
    await waitFor(() => screen.getByText(/send us a message/i));
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "My subject here" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "This is my detailed message content." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/message sent/i)).toBeTruthy());
    expect(screen.getByLabelText(/subject/i).value).toBe("");
  });

  it("shows error message and retains form values on non-201 response", async () => {
    fetch.mockResolvedValueOnce({ status: 500, ok: false, json: async () => ({}) });
    render(<Contact />);
    await waitFor(() => screen.getByText(/send us a message/i));
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "My subject" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "This is my detailed message here." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/submission failed|something went wrong/i)).toBeTruthy());
    expect(screen.getByLabelText(/subject/i).value).toBe("My subject");
  });

  it("disables submit button while request is in-flight", async () => {
    let resolve;
    fetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<Contact />);
    await waitFor(() => screen.getByText(/send us a message/i));
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Test subject" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Long enough message content here." } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /sending/i }).disabled).toBe(true));
    resolve({ status: 201, ok: true, json: async () => ({}) });
  });
});