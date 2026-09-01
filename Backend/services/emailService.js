// services/emailService.js
// Thin wrapper around Resend. Every call degrades gracefully (logs + skips)
// if RESEND_API_KEY isn't set yet, so the rest of the API keeps working in
// dev even before Resend is configured.
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'CAREAL <onboarding@resend.dev>';

async function send({ to, subject, html }) {
  if (!resend) {
    console.warn(`[emailService] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      console.error('[emailService] Resend returned an error:', result.error);
    }
    return result;
  } catch (err) {
    // Never let an email failure break the request that triggered it —
    // log and move on. Callers should not await-fail on this.
    console.error('[emailService] send failed:', err.message);
    return { error: err.message };
  }
}

export const sendForgotPasswordEmail = (to, resetLink) =>
  send({
    to,
    subject: 'Reset your CAREAL password',
    html: `
      <p>We received a request to reset your CAREAL password.</p>
      <p><a href="${resetLink}">Click here to reset your password</a> — this link expires in 30 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

export const sendAgentInviteEmail = (to, inviteLink, role) =>
  send({
    to,
    subject: 'You\'ve been invited to join CAREAL',
    html: `
      <p>You've been invited to join CAREAL as a <strong>${role.replace('_', ' ')}</strong>.</p>
      <p><a href="${inviteLink}">Accept the invite and set your password</a> — this link expires in 48 hours.</p>
      <p>If you weren't expecting this, you can ignore this email.</p>
    `,
  });

export const sendAgentAssignmentEmail = (to, { orderRef, services }) =>
  send({
    to,
    subject: `New order assigned — ${orderRef}`,
    html: `
      <p>A new order (<strong>${orderRef}</strong>) for <strong>${services}</strong> has been assigned to you.</p>
      <p>Log in to your agent dashboard to view details and begin.</p>
    `,
  });

export const sendDeliveryConfirmationEmail = (to, { orderRef, services }) =>
  send({
    to,
    subject: `Update on your order ${orderRef}`,
    html: `
      <p>Good news — <strong>${services}</strong> for order <strong>${orderRef}</strong> has been marked as delivered.</p>
      <p>Log in to your CAREAL dashboard to view the details.</p>
    `,
  });
