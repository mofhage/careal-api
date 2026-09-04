// services/bootstrapSuperAdmin.js
// Removes the manual-SQL step for creating the first Super Admin. On every
// server start, if SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASSWORD are set in .env
// and no staff account with that email exists yet, one is created as an
// active super_admin. If the account already exists, this does nothing —
// safe to leave the env vars in place permanently, it will never overwrite
// an existing password.
import bcrypt from 'bcryptjs';
import pool from '../db.js';

export async function bootstrapSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    return; // not configured — nothing to do, staff must be invited normally
  }

  if (password.length < 8) {
    console.warn('[bootstrapSuperAdmin] SUPER_ADMIN_PASSWORD is under 8 characters — skipping bootstrap. Use a real password.');
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM staff_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return; // already bootstrapped — do not touch it again
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO staff_users (first_name, last_name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'super_admin', 'active')`,
      [
        process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
        process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
        email,
        passwordHash,
      ]
    );

    console.log(`[bootstrapSuperAdmin] Created Super Admin account for ${email}. You can now log in via POST /api/agents/login.`);
  } catch (err) {
    console.error('[bootstrapSuperAdmin] failed:', err.message);
  }
}
