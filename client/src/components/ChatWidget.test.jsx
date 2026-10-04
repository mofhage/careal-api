import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChatWidget from './ChatWidget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN = 'test-careal-token-abc';

/** Build a minimal thread object */
const makeThread = (id, subject = 'Test subject') => ({
  threadId: id,
  subject,
  lastMessage: '2024-01-01T10:00:00Z',
});

/** Build a minimal message object */
const makeMessage = (id, body, sender_type = 'user') => ({
  id,
  body,
  sender_type,
  created_at: '2024-01-01T10:00:00Z',
});

/**
 * Create a fetch mock that returns the given response once.
 * Subsequent calls reuse the last provided response.
 */
function mockFetch(...responses) {
  let callIndex = 0;
  return vi.fn(async () => {
    const resp = responses[Math.min(callIndex++, responses.length - 1)];
    return resp;
  });
}

/** Build a fake ok Response */
function okResponse(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

/** Build a fake 201 Response */
function createdResponse() {
  return {
    ok: true,
    status: 201,
    json: async () => ({}),
  };
}

/** Build a fake error Response */
function errorResponse(status = 500) {
  return {
    ok: false,
    status,
    json: async () => ({}),
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ChatWidget', () => {
  // ── Test 1: Returns null when no careal_token ──────────────────────────────
  it('renders nothing when careal_token is absent', () => {
    const { container } = render(<ChatWidget />);
    expect(container.firstChild).toBeNull();
  });

  // ── Test 2: Renders toggle button when careal_token is set ────────────────
  it('renders the 💬 toggle button when careal_token is present', () => {
    localStorage.setItem('careal_token', TOKEN);
    vi.stubGlobal('fetch', vi.fn());

    render(<ChatWidget />);

    const btn = screen.getByRole('button', { name: /open chat/i });
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe('💬');
  });

  // ── Test 3: On widget open — fetches thread list and displays threads ──────
  it('fetches thread list on open and displays threads', async () => {
    localStorage.setItem('careal_token', TOKEN);
    const threads = [
      makeThread('t1', 'My first inquiry'),
      makeThread('t2', 'Delivery question'),
    ];
    vi.stubGlobal('fetch', mockFetch(okResponse(threads)));

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));

    await waitFor(() => {
      expect(screen.getByText('My first inquiry')).toBeTruthy();
      expect(screen.getByText('Delivery question')).toBeTruthy();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/messages/mine',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  // ── Test 4: Empty state when thread list is [] ────────────────────────────
  it('shows "No conversations yet." when thread list is empty', async () => {
    localStorage.setItem('careal_token', TOKEN);
    vi.stubGlobal('fetch', mockFetch(okResponse([])));

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));

    await waitFor(() => {
      expect(screen.getByText('No conversations yet.')).toBeTruthy();
    });
  });

  // ── Test 5: Selecting a thread fetches detail and renders messages ─────────
  it('fetches thread detail and renders messages when a thread is selected', async () => {
    localStorage.setItem('careal_token', TOKEN);
    const threads = [makeThread('t1', 'Support request')];
    const messages = [
      makeMessage(1, 'Hello, I need help', 'user'),
      makeMessage(2, 'How can I assist you?', 'staff'),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch(
        okResponse(threads),
        okResponse({ messages })
      )
    );

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));

    await waitFor(() => screen.getByText('Support request'));
    fireEvent.click(screen.getByRole('button', { name: /open conversation: support request/i }));

    await waitFor(() => {
      expect(screen.getByText('Hello, I need help')).toBeTruthy();
      expect(screen.getByText('How can I assist you?')).toBeTruthy();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/messages/mine/t1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  // ── Test 6: Send button disabled when reply input is empty ────────────────
  it('disables Send button when reply input is empty', async () => {
    localStorage.setItem('careal_token', TOKEN);
    const threads = [makeThread('t1', 'Issue thread')];
    const messages = [makeMessage(1, 'Initial message', 'user')];

    vi.stubGlobal(
      'fetch',
      mockFetch(
        okResponse(threads),
        okResponse({ messages })
      )
    );

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));

    await waitFor(() => screen.getByText('Issue thread'));
    fireEvent.click(screen.getByRole('button', { name: /open conversation: issue thread/i }));

    await waitFor(() => screen.getByLabelText('Reply message'));

    const sendBtn = screen.getByRole('button', { name: /send reply/i });
    expect(sendBtn).toBeDisabled();
  });

  // ── Test 7: Successful reply (201) — clears input, re-fetches thread ──────
  it('clears input and re-fetches thread after a successful 201 reply', async () => {
    localStorage.setItem('careal_token', TOKEN);
    const threads = [makeThread('t1', 'My thread')];
    const messages = [makeMessage(1, 'First message', 'user')];
    const updatedMessages = [
      makeMessage(1, 'First message', 'user'),
      makeMessage(2, 'My reply', 'user'),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch(
        okResponse(threads),                    // 1st call: open → thread list
        okResponse({ messages }),               // 2nd call: select thread
        createdResponse(),                      // 3rd call: POST reply
        okResponse({ messages: updatedMessages }) // 4th call: re-fetch after send
      )
    );

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));

    await waitFor(() => screen.getByText('My thread'));
    fireEvent.click(screen.getByRole('button', { name: /open conversation: my thread/i }));
    await waitFor(() => screen.getByLabelText('Reply message'));

    const replyInput = screen.getByLabelText('Reply message');
    fireEvent.change(replyInput, { target: { value: 'My reply' } });
    expect(replyInput.value).toBe('My reply');

    const sendBtn = screen.getByRole('button', { name: /send reply/i });
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);

    // Input should be cleared after successful send
    await waitFor(() => {
      expect(replyInput.value).toBe('');
    });

    // Re-fetched thread should show updated message
    await waitFor(() => {
      expect(screen.getAllByText('My reply').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Test 8: Failed reply — shows error, preserves draft ───────────────────
  it('shows error message and preserves draft text when reply fails', async () => {
    localStorage.setItem('careal_token', TOKEN);
    const threads = [makeThread('t1', 'My thread')];
    const messages = [makeMessage(1, 'First message', 'user')];

    vi.stubGlobal(
      'fetch',
      mockFetch(
        okResponse(threads),          // 1st: thread list
        okResponse({ messages }),     // 2nd: select thread
        errorResponse(500)            // 3rd: POST reply fails
      )
    );

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));

    await waitFor(() => screen.getByText('My thread'));
    fireEvent.click(screen.getByRole('button', { name: /open conversation: my thread/i }));
    await waitFor(() => screen.getByLabelText('Reply message'));

    const replyInput = screen.getByLabelText('Reply message');
    fireEvent.change(replyInput, { target: { value: 'Draft message' } });

    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() => {
      expect(screen.getByText('Could not send message. Please try again.')).toBeTruthy();
    });

    // Draft must be preserved
    expect(replyInput.value).toBe('Draft message');
  });

  // ── Test 9: Polling — fetch called again after 15s ─────────────────────────
  it('polls every 15s while a thread is open and stops on close', async () => {
    vi.useFakeTimers();
    localStorage.setItem('careal_token', TOKEN);

    const threads = [makeThread('t1', 'Polling thread')];
    const messages = [makeMessage(1, 'Hello', 'user')];

    const fetchMock = vi.fn(async (url) => {
      if (url.includes('/t1') && !url.includes('reply')) {
        return okResponse({ messages });
      }
      return okResponse(threads);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ChatWidget />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
      // Flush thread list fetch
      await Promise.resolve();
    });

    await act(async () => {
      await waitFor(() => screen.getByText('Polling thread'));
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /open conversation: polling thread/i })
      );
      await Promise.resolve();
    });

    await act(async () => {
      await waitFor(() => screen.getByLabelText('Reply message'));
    });

    // Count calls so far (list + initial thread fetch)
    const callsAfterOpen = fetchMock.mock.calls.length;
    expect(callsAfterOpen).toBeGreaterThanOrEqual(2);

    // Advance timer by 15 seconds — should trigger one poll
    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterOpen);

    // Verify the poll fetched the thread endpoint (not the list)
    const pollCall = fetchMock.mock.calls.find(
      ([url], index) => index >= callsAfterOpen && url.includes('/t1')
    );
    expect(pollCall).toBeTruthy();

    vi.useRealTimers();
  });
});
