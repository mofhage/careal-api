import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const BRAND = "#7C3AED";
const BRAND_LIGHT = "#EDE9FE";
const BRAND_DARK = "#5B21B6";

const styles = {
  /* Floating toggle button */
  toggleBtn: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: BRAND,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    zIndex: 9999,
    transition: "background-color 0.15s",
  },

  /* Main panel */
  panel: {
    position: "fixed",
    bottom: "90px",
    right: "24px",
    width: "340px",
    height: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9998,
    fontFamily: "inherit",
    fontSize: "14px",
  },

  /* Panel header bar */
  panelHeader: {
    backgroundColor: BRAND,
    color: "#fff",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  panelHeaderTitle: {
    fontWeight: 600,
    fontSize: "15px",
    margin: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: 1,
    padding: "0 4px",
  },

  /* Scrollable body */
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },

  /* Thread list */
  threadItem: {
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "6px",
    backgroundColor: "#F5F3FF",
    border: `1px solid ${BRAND_LIGHT}`,
    transition: "background-color 0.1s",
  },
  threadSubject: {
    fontWeight: 500,
    color: "#1a1a1a",
    margin: 0,
  },
  threadMeta: {
    fontSize: "11px",
    color: "#6B7280",
    marginTop: "2px",
  },

  /* Message bubbles */
  msgRow: (isUser) => ({
    display: "flex",
    justifyContent: isUser ? "flex-end" : "flex-start",
    marginBottom: "8px",
  }),
  bubble: (isUser) => ({
    maxWidth: "75%",
    padding: "8px 12px",
    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    backgroundColor: isUser ? BRAND : "#F3F4F6",
    color: isUser ? "#fff" : "#1a1a1a",
    fontSize: "13px",
    lineHeight: "1.45",
    wordBreak: "break-word",
  }),
  bubbleTime: (isUser) => ({
    fontSize: "10px",
    color: isUser ? "rgba(255,255,255,0.7)" : "#9CA3AF",
    marginTop: "3px",
    textAlign: isUser ? "right" : "left",
  }),

  /* Reply area */
  replyArea: {
    borderTop: "1px solid #E5E7EB",
    padding: "8px",
    display: "flex",
    gap: "8px",
    flexShrink: 0,
    backgroundColor: "#FAFAFA",
  },
  replyInput: {
    flex: 1,
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "13px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "1.4",
    maxHeight: "80px",
  },
  sendBtn: (disabled) => ({
    backgroundColor: disabled ? "#C4B5FD" : BRAND,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0 14px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: "13px",
    transition: "background-color 0.15s",
    flexShrink: 0,
  }),

  /* Status messages */
  emptyState: {
    textAlign: "center",
    color: "#6B7280",
    padding: "32px 16px",
    lineHeight: "1.6",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#DC2626",
    fontSize: "13px",
    marginBottom: "8px",
  },
  retryBtn: {
    backgroundColor: BRAND,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "12px",
    marginTop: "6px",
  },
  loadingText: {
    textAlign: "center",
    color: "#9CA3AF",
    padding: "20px 0",
  },
  successBox: {
    backgroundColor: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#16A34A",
    fontSize: "13px",
    marginBottom: "8px",
  },
};

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatWidget() {
  const token = localStorage.getItem("careal_token");

  // Don't render anything if no user token
  if (!token) return null;

  return <ChatWidgetInner token={token} />;
}

function ChatWidgetInner({ token }) {
  const [open, setOpen] = useState(false);

  // "list" | "thread"
  const [view, setView] = useState("list");

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState(null);

  const [selectedThread, setSelectedThread] = useState(null); // { threadId, subject }
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const pollingRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ─── Fetch thread list ────────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    setThreadsLoading(true);
    setThreadsError(null);
    try {
      const res = await fetch(`${API_BASE}/messages/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      setThreadsError("Could not load conversations. Please try again.");
    } finally {
      setThreadsLoading(false);
    }
  }, [token]);

  // ─── Fetch a single thread ────────────────────────────────────────────────
  const fetchThread = useCallback(
    async (threadId) => {
      setThreadLoading(true);
      setThreadError(null);
      try {
        const res = await fetch(`${API_BASE}/messages/mine/${threadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (err) {
        setThreadError("Could not load messages. Please try again.");
      } finally {
        setThreadLoading(false);
      }
    },
    [token]
  );

  // ─── Start / stop polling ─────────────────────────────────────────────────
  const startPolling = useCallback(
    (threadId) => {
      stopPolling();
      pollingRef.current = setInterval(() => {
        fetchThread(threadId);
      }, 15000);
    },
    [fetchThread]
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ─── Open / close widget ──────────────────────────────────────────────────
  const handleToggle = () => {
    if (!open) {
      // Re-fetch thread list whenever widget opens
      setView("list");
      setSelectedThread(null);
      setMessages([]);
      setThreadError(null);
      setSendError(null);
      fetchThreads();
    } else {
      // Closing: stop polling
      stopPolling();
    }
    setOpen((prev) => !prev);
  };

  // ─── Select a thread ──────────────────────────────────────────────────────
  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    setMessages([]);
    setThreadError(null);
    setSendError(null);
    setView("thread");
    fetchThread(thread.threadId);
    startPolling(thread.threadId);
  };

  // ─── Back to list ─────────────────────────────────────────────────────────
  const handleBack = () => {
    stopPolling();
    setView("list");
    setSelectedThread(null);
    setMessages([]);
    setThreadError(null);
    setSendError(null);
    setReply("");
  };

  // ─── Send reply ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!reply.trim() || !selectedThread) return;
    if (reply.length > 2000) {
      setSendError("Message must not exceed 2000 characters.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(
        `${API_BASE}/messages/mine/${selectedThread.threadId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: reply }),
        }
      );
      if (res.status !== 201) throw new Error(`HTTP ${res.status}`);
      setReply("");
      // Immediately re-fetch thread to confirm and refresh
      await fetchThread(selectedThread.threadId);
    } catch (err) {
      setSendError("Could not send message. Please try again.");
      // Draft is preserved — reply state is not cleared on failure
    } finally {
      setSending(false);
    }
  };

  // Allow Enter to send (Shift+Enter for new line)
  const handleReplyKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (reply.trim() && !sending) handleSend();
    }
  };

  // ─── Auto-scroll messages to bottom ──────────────────────────────────────
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating toggle button */}
      <button
        style={styles.toggleBtn}
        onClick={handleToggle}
        aria-label={open ? "Close chat" : "Open chat"}
        title={open ? "Close chat" : "Support chat"}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={styles.panel} role="dialog" aria-label="Support chat">
          {/* Header */}
          <div style={styles.panelHeader}>
            {view === "thread" && (
              <button
                style={styles.backBtn}
                onClick={handleBack}
                aria-label="Back to conversation list"
              >
                ←
              </button>
            )}
            <p style={styles.panelHeaderTitle}>
              {view === "list"
                ? "Support"
                : selectedThread?.subject || "Conversation"}
            </p>
            <button
              style={styles.backBtn}
              onClick={handleToggle}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* ── Thread list view ── */}
          {view === "list" && (
            <div style={styles.body}>
              {threadsLoading && (
                <p style={styles.loadingText}>Loading conversations…</p>
              )}

              {!threadsLoading && threadsError && (
                <div style={styles.errorBox}>
                  {threadsError}
                  <br />
                  <button style={styles.retryBtn} onClick={fetchThreads}>
                    Retry
                  </button>
                </div>
              )}

              {!threadsLoading && !threadsError && threads.length === 0 && (
                <div style={styles.emptyState}>
                  <span style={{ fontSize: "32px" }}>💬</span>
                  <p>No conversations yet.</p>
                  <p style={{ fontSize: "12px" }}>
                    Use the Contact page to start a conversation.
                  </p>
                </div>
              )}

              {!threadsLoading &&
                !threadsError &&
                threads.map((t) => (
                  <div
                    key={t.threadId}
                    style={styles.threadItem}
                    onClick={() => handleSelectThread(t)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSelectThread(t)
                    }
                    aria-label={`Open conversation: ${t.subject}`}
                  >
                    <p style={styles.threadSubject}>{t.subject}</p>
                    {t.lastMessage && (
                      <p style={styles.threadMeta}>
                        Last message:{" "}
                        {new Date(t.lastMessage).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* ── Thread detail view ── */}
          {view === "thread" && (
            <>
              <div style={styles.body}>
                {threadLoading && messages.length === 0 && (
                  <p style={styles.loadingText}>Loading messages…</p>
                )}

                {!threadLoading && threadError && (
                  <div style={styles.errorBox}>
                    {threadError}
                    <br />
                    <button
                      style={styles.retryBtn}
                      onClick={() => fetchThread(selectedThread.threadId)}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!threadError &&
                  messages.map((msg) => {
                    const isUser = msg.sender_type === "user";
                    return (
                      <div key={msg.id} style={styles.msgRow(isUser)}>
                        <div>
                          <div style={styles.bubble(isUser)}>{msg.body}</div>
                          <div style={styles.bubbleTime(isUser)}>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {sendError && (
                  <div style={styles.errorBox}>{sendError}</div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply area */}
              <div style={styles.replyArea}>
                <textarea
                  style={styles.replyInput}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={2}
                  maxLength={2000}
                  disabled={sending}
                  aria-label="Reply message"
                />
                <button
                  style={styles.sendBtn(!reply.trim() || sending)}
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  aria-label="Send reply"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
