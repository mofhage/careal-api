// controllers/passwordResetController.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db.js';
import { sendForgotPasswordEmail } from '../services/emailService.js';

const RESET_EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || 30);

// ──────────────────────────────────────────────
// POST /api/auth/forgot-password
// body: { email }
// Always returns a generic success message, whether or not the email
// exists — prevents attackers from using this endpoint to enumerate users.
// ──────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  const genericResponse = {
    message: 'If an account exists for that email, a reset link has been sent.',
  };

  try {
    const userResult = await pool.query('SELECT id FROM vehicle_users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      const frontendUrl = process.env.FRONTEND_URL || '';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;
      await sendForgotPasswordEmail(email, resetLink);
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    // Still return the generic message — don't leak internal state via errors either.
    return res.status(200).json(genericResponse);
  }
};

// ──────────────────────────────────────────────
// POST /api/auth/reset-password
// body: { token, newPassword }
// ──────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'token and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const tokenResult = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false`,
      [token]
    );
    const record = tokenResult.rows[0];

    if (!record) {
      return res.status(400).json({ message: 'Invalid or already-used reset link' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: 'This reset link has expired — request a new one' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE vehicle_users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      record.user_id,
    ]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [record.id]);

    return res.status(200).json({ message: 'Password reset successfully — you can now log in' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
