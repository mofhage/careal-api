
//    payments.js needs FRONTEND_URL (singular) for the Flutterwave redirect_url.
//   //      FRONTEND_URL=http://localhost:5173
//
// UPDATE: adds delivery_method capture on /initiate, a /webhook endpoint as
// the source of truth for "paid" (independent of the client calling /verify),
// and a shared recordPayment() helper so /verify and /webhook can't drift.
import express from 'express';
import pool from '../db.js';
import { protect } from '../src/middleware/auth.js';
import { getServicePrices } from '../services/servicePriceService.js';
import axios from 'axios';
import crypto from 'crypto';
import { tryAutoAssign } from '../services/agentAssignmentService.js';

const router = express.Router();

// ─────────────────────────────────────────────
// Shared: record a verified Flutterwave payment into vehicle_payments.
// Used by both POST /verify (client-triggered, fast path for the redirect
// UX) and POST /webhook (server-triggered, the reconciliation source of
// truth). Idempotent on payment_ref either way.
// ─────────────────────────────────────────────
async function recordPayment(flwData) {
  const meta = flwData.meta || {};
  const reg_number = (meta.plate_number || '').toUpperCase();
  const license = meta.license === 'true';
  const roadworthiness = meta.roadworthiness === 'true';
  const insurance = meta.insurance === 'true';
  const license_amount = Number(meta.license_amount || 0);
  const roadworthiness_amount = Number(meta.roadworthiness_amount || 0);
  const insurance_amount = Number(meta.insurance_amount || 0);
  const amount = license_amount + roadworthiness_amount + insurance_amount;
  const delivery_method = meta.delivery_method === 'personal_collection' ? 'personal_collection' : 'agent_delivery';
  const tx_ref = flwData.tx_ref;
  const user_id = meta.user_id;

  if (!reg_number) {
    throw new Error('Payment meta missing plate number — cannot record.');
  }
  if (!user_id) {
    throw new Error('Payment meta missing user_id — cannot record.');
  }

  const existing = await pool.query('SELECT id FROM vehicle_payments WHERE payment_ref = $1', [tx_ref]);
  if (existing.rows.length > 0) {
    return { alreadyRecorded: true, payment: existing.rows[0] };
  }

  const result = await pool.query(
    `INSERT INTO vehicle_payments (
      user_id, reg_number,
      license, roadworthiness, insurance,
      license_amount, roadworthiness_amount, insurance_amount,
      amount, payment_ref, delivery_method,
      license_status, roadworthiness_status, insurance_status,
      status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, 'paid'
    ) RETURNING *`,
    [
      user_id,
      reg_number,
      license,
      roadworthiness,
      insurance,
      license_amount,
      roadworthiness_amount,
      insurance_amount,
      amount,
      tx_ref,
      delivery_method,
      license ? 'Pending' : 'N/A',
      roadworthiness ? 'Pending' : 'N/A',
      insurance ? 'Pending' : 'N/A',
    ]
  );

  return { alreadyRecorded: false, payment: result.rows[0] };
}

// ─────────────────────────────────────────────
// POST /api/payments/initiate
// body now also accepts: delivery_method ('agent_delivery' | 'personal_collection')
// ─────────────────────────────────────────────
router.post('/initiate', protect, async (req, res) => {
  const { plate_number, license, roadworthiness, insurance, delivery_method } = req.body;

  if (!plate_number) {
    return res.status(400).json({ message: 'plate_number is required' });
  }
  if (!license && !roadworthiness && !insurance) {
    return res.status(400).json({ message: 'At least one service must be selected' });
  }
  if (delivery_method && !['agent_delivery', 'personal_collection'].includes(delivery_method)) {
    return res.status(400).json({ message: 'delivery_method must be agent_delivery or personal_collection' });
  }

  const ServicePrice = await getServicePrices();

  const license_amount        = license        ? ServicePrice.licence.price        : 0;
  const roadworthiness_amount = roadworthiness ? ServicePrice.road_worthiness.price : 0;
  const insurance_amount      = insurance      ? ServicePrice.insurance.price      : 0;
  const total_amount          = license_amount + roadworthiness_amount + insurance_amount;

  const selectedServices = [];
  if (license)        selectedServices.push(ServicePrice.licence.name);
  if (roadworthiness) selectedServices.push(ServicePrice.road_worthiness.name);
  if (insurance)      selectedServices.push(ServicePrice.insurance.name);

  const tx_ref = `CAREAL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const user = req.user;

  // ✅ FRONTEND_URL (singular) — must be in .env
  //    Add:  FRONTEND_URL=http://localhost:5173
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    console.error('FRONTEND_URL is not set in .env — Flutterwave redirect will break!');
    return res.status(500).json({ message: 'Server misconfiguration: FRONTEND_URL not set' });
  }

  try {
    const flwPayload = {
      tx_ref,
      amount:       total_amount,
      currency:     'NGN',
      // ✅ This is what was undefined before — now uses the correct env var
      redirect_url: `${frontendUrl}/payment/verify`,
      customer: {
        email:       user.email,
        name:        `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        phonenumber: user.phone || '',
      },
      meta: {
        user_id:               user.id,
        plate_number:          plate_number.toUpperCase(),
        license:               license        ? 'true' : 'false',
        roadworthiness:        roadworthiness ? 'true' : 'false',
        insurance:             insurance      ? 'true' : 'false',
        license_amount,
        roadworthiness_amount,
        insurance_amount,
        delivery_method:       delivery_method || 'agent_delivery',
      },
      customizations: {
        title:       'CAREAL Services',
        description: selectedServices.join(', '),
        logo:        `${frontendUrl}/logo.png`,
      },
      payment_options: 'card,banktransfer,ussd',
    };

    const flwRes = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      flwPayload,
      {
        headers: {
          Authorization:  `Bearer ${process.env.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (flwRes.data.status !== 'success') {
      console.error('Flutterwave initiation failed:', flwRes.data);
      return res.status(502).json({ message: 'Payment gateway error. Please try again.' });
    }

    return res.status(200).json({
      message:      'Payment initiated',
      payment_link: flwRes.data.data.link,
      tx_ref,
    });

  } catch (err) {
    console.error('Initiate payment error:', err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to initiate payment', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payments/verify
// Called by PaymentVerify.jsx after Flutterwave redirect. Fast path for the
// user's own UX — /webhook below is the reconciliation source of truth.
// ─────────────────────────────────────────────
router.post('/verify', protect, async (req, res) => {
  const { transaction_id, tx_ref } = req.body;

  if (!transaction_id || !tx_ref) {
    return res.status(400).json({ message: 'transaction_id and tx_ref are required' });
  }

  try {
    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
    );

    const flwData = verifyRes.data?.data;

    if (
      !flwData ||
      verifyRes.data.status !== 'success' ||
      flwData.status !== 'successful' ||
      flwData.tx_ref !== tx_ref
    ) {
      return res.status(402).json({ message: 'Payment verification failed or payment was not successful.' });
    }

    const { alreadyRecorded, payment } = await recordPayment(flwData);

    if (alreadyRecorded) {
      return res.status(200).json({ message: 'Payment already recorded', payment_id: payment.id });
    }

    // Best-effort — auto-assignment failures should never break the user's
    // "your payment succeeded" response.
    tryAutoAssign(payment.id).catch((err) =>
      console.error('tryAutoAssign (via /verify) failed:', err.message)
    );

    return res.status(201).json({
      message: 'Payment verified and recorded successfully',
      payment,
    });

  } catch (err) {
    console.error('Verify payment error:', err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to verify payment', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payments/webhook
// Flutterwave server-to-server webhook — configure this URL in your
// Flutterwave dashboard, with FLW_SECRET_HASH set to the same value there.
// This is what makes "money in" reliable even if the user closes the tab
// before /verify ever fires.
// No auth middleware — Flutterwave calls this directly; verif-hash is the auth.
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== process.env.FLW_SECRET_HASH) {
    console.warn('Webhook received with missing/invalid verif-hash');
    return res.status(401).json({ message: 'Invalid signature' });
  }

  // Acknowledge immediately — Flutterwave retries on non-2xx/timeout, and we
  // don't want a slow DB/email call to cause duplicate deliveries.
  res.status(200).json({ message: 'Received' });

  try {
    const event = req.body;
    if (event.event !== 'charge.completed' || event.data?.status !== 'successful') {
      return; // ignore anything that isn't a successful charge
    }

    const { alreadyRecorded, payment } = await recordPayment(event.data);
    if (alreadyRecorded) {
      return;
    }

    await tryAutoAssign(payment.id);
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    // Already responded 200 to Flutterwave — this is now purely internal
    // logging. If this happens often, check the FLW dashboard's delivery
    // log and re-trigger, or reconcile manually via GET /api/orders.
  }
});

// ─────────────────────────────────────────────
// GET /api/payments
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vehicle_payments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
  }
});

export default router;
