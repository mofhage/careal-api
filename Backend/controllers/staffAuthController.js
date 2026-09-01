// controllers/staffAuthController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db.js';
import { sendAgentInviteEmail } from '../services/emailService.js';

const STAFF_SECRET = process.env.STAFF_JWT_SECRET || process.env.JWT_SECRET;
const INVITE_EXPIRY_HOURS = Number(process.env.AGENT_INVITE_EXPIRY_HOURS || 48);

// ──────────────────────────────────────────────
// POST /api/agents/invite  (super_admin only)
// body: { first_name, last_name, email, role }
// ──────────────────────────────────────────────
export const inviteAgent = async (req, res) => {
  const { first_name, last_name, email, role } = req.body;

  if (!first_name || !last_name || !email || !role) {
    return res.status(400).json({ message: 'first_name, last_name, email and role are required' });
  }
  if (!['contact_agent', 'field_agent', 'super_admin'].includes(role)) {
    return res.status(400).json({ message: 'role must be contact_agent, field_agent or super_admin' });
  }

  try {
    const existing = await pool.query('SELECT id FROM staff_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'A staff account with this email already exists' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO staff_users (first_name, last_name, email, role, status, invite_token, invite_expires_at, invited_by)
       VALUES ($1, $2, $3, $4, 'invited', $5, $6, $7)
       RETURNING id, first_name, last_name, email, role, status, created_at`,
      [first_name, last_name, email, role, inviteToken, expiresAt, req.staff.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || '';
    const inviteLink = `${frontendUrl}/staff/accept-invite?token=${inviteToken}`;
    await sendAgentInviteEmail(email, inviteLink, role);

    return res.status(201).json({ message: 'Invite sent', staff: result.rows[0] });
  } catch (err) {
    console.error('inviteAgent error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────
// POST /api/agents/accept-invite  (public — token proves identity)
// body: { token, password }
// ──────────────────────────────────────────────
export const acceptInvite = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'token and password are required' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM staff_users WHERE invite_token = $1 AND status = 'invited'`,
      [token]
    );
    const staff = result.rows[0];
    if (!staff) {
      return res.status(400).json({ message: 'Invalid or already-used invite link' });
    }
    if (new Date(staff.invite_expires_at) < new Date()) {
      return res.status(400).json({ message: 'This invite link has expired — ask your Super Admin to resend it' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE staff_users
          SET password_hash = $1, status = 'active', invite_token = NULL, invite_expires_at = NULL, updated_at = now()
        WHERE id = $2`,
      [passwordHash, staff.id]
    );

    return res.status(200).json({ message: 'Account activated — you can now log in' });
  } catch (err) {
    console.error('acceptInvite error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────
// POST /api/agents/login  (public)
// body: { email, password }
// ──────────────────────────────────────────────
export const staffLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM staff_users WHERE email = $1', [email]);
    const staff = result.rows[0];

    if (!staff || staff.status !== 'active' || !staff.password_hash) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, staff.password_hash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, staff: true },
      STAFF_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (err) {
    console.error('staffLogin error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────
// GET /api/agents  (super_admin only)
// ──────────────────────────────────────────────
export const listAgents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, status, is_online, rating, created_at
         FROM staff_users ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('listAgents error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────
// PATCH /api/agents/:id/revoke  (super_admin only)
// ──────────────────────────────────────────────
export const revokeAgent = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE staff_users SET status = 'suspended', updated_at = now() WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    return res.json({ message: 'Agent access revoked', staff: result.rows[0] });
  } catch (err) {
    console.error('revokeAgent error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────
// PATCH /api/agents/:id/reactivate  (super_admin only)
// ──────────────────────────────────────────────
export const reactivateAgent = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE staff_users SET status = 'active', updated_at = now() WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    return res.json({ message: 'Agent reactivated', staff: result.rows[0] });
  } catch (err) {
    console.error('reactivateAgent error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────
// PATCH /api/agents/me/availability  (field_agent, contact_agent)
// body: { is_online: boolean }
// ──────────────────────────────────────────────
export const setMyAvailability = async (req, res) => {
  const { is_online } = req.body;
  if (typeof is_online !== 'boolean') {
    return res.status(400).json({ message: 'is_online (boolean) is required' });
  }
  try {
    const result = await pool.query(
      `UPDATE staff_users SET is_online = $1, updated_at = now() WHERE id = $2 RETURNING id, is_online`,
      [is_online, req.staff.id]
    );
    return res.json({ message: 'Availability updated', staff: result.rows[0] });
  } catch (err) {
    console.error('setMyAvailability error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
