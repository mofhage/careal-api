// routes/messages.js
// Split into /mine (logged-in users) and /staff (contact_agent, super_admin)
// on purpose, rather than one dual-auth route — keeps the auth check simple
// and matches the stated access rule: only registered users, admins and
// agents can reach any of this; logged-out visitors get static contact info
// only (phone/email/address), served from the frontend, no API needed.
import express from 'express';
import pool from '../db.js';
import { protect } from '../src/middleware/auth.js';
import { protectStaff, requireRole } from '../src/middleware/staffAuth.js';

const router = express.Router();

// ─────────────────────────────────────────────
// USER SIDE
// ─────────────────────────────────────────────

// POST /api/messages/contact  — the Contact Us form, logged-in users only.
// Creates a new general-support thread with the form content as the first message.
router.post('/contact', protect, async (req, res) => {
  const { subject, message } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'message is required' });
  }

  try {
    const thread = await pool.query(
      `INSERT INTO message_threads (subject, context_type, user_id) VALUES ($1, 'general', $2) RETURNING *`,
      [subject || 'Contact form enquiry', req.user.id]
    );

    await pool.query(
      `INSERT INTO messages (thread_id, sender_type, sender_id, body) VALUES ($1, 'user', $2, $3)`,
      [thread.rows[0].id, req.user.id, message]
    );

    res.status(201).json({ message: 'Enquiry sent', thread: thread.rows[0] });
  } catch (err) {
    console.error('POST /messages/contact error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/messages/mine — list the logged-in user's threads
router.get('/mine', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM message_threads WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /messages/mine error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/messages/mine/:threadId — thread + all messages (must own it)
router.get('/mine/:threadId', protect, async (req, res) => {
  try {
    const thread = await pool.query(
      `SELECT * FROM message_threads WHERE id = $1 AND user_id = $2`,
      [req.params.threadId, req.user.id]
    );
    if (thread.rows.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const messages = await pool.query(
      `SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [req.params.threadId]
    );
    res.json({ thread: thread.rows[0], messages: messages.rows });
  } catch (err) {
    console.error('GET /messages/mine/:threadId error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/messages/mine/:threadId/reply — user replies in their own thread
router.post('/mine/:threadId/reply', protect, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'message is required' });
  }

  try {
    const thread = await pool.query(
      `SELECT * FROM message_threads WHERE id = $1 AND user_id = $2`,
      [req.params.threadId, req.user.id]
    );
    if (thread.rows.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const result = await pool.query(
      `INSERT INTO messages (thread_id, sender_type, sender_id, body) VALUES ($1, 'user', $2, $3) RETURNING *`,
      [req.params.threadId, req.user.id, message]
    );
    await pool.query(`UPDATE message_threads SET updated_at = now(), status = 'open' WHERE id = $1`, [
      req.params.threadId,
    ]);

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('POST /messages/mine/:threadId/reply error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// STAFF SIDE — contact_agent, super_admin only
// ─────────────────────────────────────────────

// GET /api/messages/staff?status=open — inbox
router.get('/staff', protectStaff, requireRole('contact_agent', 'super_admin'), async (req, res) => {
  const { status } = req.query;
  try {
    const result = status
      ? await pool.query(`SELECT * FROM message_threads WHERE status = $1 ORDER BY updated_at DESC`, [status])
      : await pool.query(`SELECT * FROM message_threads ORDER BY updated_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /messages/staff error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/messages/staff/:threadId
router.get('/staff/:threadId', protectStaff, requireRole('contact_agent', 'super_admin'), async (req, res) => {
  try {
    const thread = await pool.query(`SELECT * FROM message_threads WHERE id = $1`, [req.params.threadId]);
    if (thread.rows.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    const messages = await pool.query(
      `SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [req.params.threadId]
    );
    res.json({ thread: thread.rows[0], messages: messages.rows });
  } catch (err) {
    console.error('GET /messages/staff/:threadId error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/messages/staff/:threadId/reply
router.post('/staff/:threadId/reply', protectStaff, requireRole('contact_agent', 'super_admin'), async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'message is required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO messages (thread_id, sender_type, sender_id, body) VALUES ($1, 'staff', $2, $3) RETURNING *`,
      [req.params.threadId, req.staff.id, message]
    );
    await pool.query(
      `UPDATE message_threads SET updated_at = now(), assigned_staff_id = COALESCE(assigned_staff_id, $2) WHERE id = $1`,
      [req.params.threadId, req.staff.id]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('POST /messages/staff/:threadId/reply error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/messages/staff/:threadId/close
router.patch('/staff/:threadId/close', protectStaff, requireRole('contact_agent', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE message_threads SET status = 'closed', updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.threadId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    res.json({ message: 'Thread closed', thread: result.rows[0] });
  } catch (err) {
    console.error('PATCH /messages/staff/:threadId/close error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
