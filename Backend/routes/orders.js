// routes/orders.js
// Agent/admin-facing order lifecycle operations, separate from routes/payments.js
// (which stays user-facing: initiate/verify/webhook/list-own-payments).
import express from 'express';
import pool from '../db.js';
import { protectStaff, requireRole } from '../src/middleware/staffAuth.js';
import { sendAgentAssignmentEmail, sendDeliveryConfirmationEmail } from '../services/emailService.js';
import { validId } from '../src/middleware/validateParams.js';

const router = express.Router();
router.param('id', validId); // malformed ids -> 400 instead of a Postgres 500

// Every order list returns the same enriched shape the dashboards are built on:
//   - plate_number  : alias of reg_number (the column name in vehicle_payments)
//   - assigned_agent: { id, first_name, last_name, email } or null
//   - customer      : { first_name, last_name, email } of the paying user
// All original columns (reg_number, assigned_agent_id, ...) are still returned.
const ORDER_SELECT = `
  SELECT vp.*,
         vp.reg_number AS plate_number,
         CASE WHEN s.id IS NULL THEN NULL
              ELSE json_build_object('id', s.id, 'first_name', s.first_name,
                                     'last_name', s.last_name, 'email', s.email) END AS assigned_agent,
         json_build_object('first_name', u.first_name, 'last_name', u.last_name, 'email', u.email) AS customer
    FROM vehicle_payments vp
    LEFT JOIN staff_users  s ON s.id = vp.assigned_agent_id
    LEFT JOIN vehicle_users u ON u.id = vp.user_id`;

const ALLOWED_STATUSES = [
  'paid',
  'assigned',
  'in_progress',
  'ready_for_delivery',
  'ready_for_pickup',
  'delivered',
  'collected',
];

function servicesLabel(order) {
  const list = [];
  if (order.license) list.push('Vehicle Licence');
  if (order.roadworthiness) list.push('Road Worthiness');
  if (order.insurance) list.push('Insurance');
  return list.join(', ') || 'Service';
}

async function logStatus(paymentId, status, changedByType, changedById, note = null) {
  await pool.query(
    `INSERT INTO order_status_history (payment_id, status, changed_by_type, changed_by_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [paymentId, status, changedByType, changedById, note]
  );
}

// ─────────────────────────────────────────────
// GET /api/orders/pending
// field_agent, contact_agent, super_admin — unassigned paid orders
// ─────────────────────────────────────────────
router.get('/pending', protectStaff, requireRole('field_agent', 'contact_agent', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `${ORDER_SELECT} WHERE vp.assigned_agent_id IS NULL AND vp.status = 'paid' ORDER BY vp.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /orders/pending error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/orders
// super_admin + contact_agent — full list with optional filters (reconciliation / support)
// query: ?status=&delivery_method=
// ─────────────────────────────────────────────
router.get('/', protectStaff, requireRole('super_admin', 'contact_agent'), async (req, res) => {
  const { status, delivery_method } = req.query;
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`vp.status = $${values.length}`);
  }
  if (delivery_method) {
    values.push(delivery_method);
    conditions.push(`vp.delivery_method = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `${ORDER_SELECT} ${where} ORDER BY vp.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /orders error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/orders/mine
// field_agent, contact_agent — orders assigned to me
// ─────────────────────────────────────────────
router.get('/mine', protectStaff, requireRole('field_agent', 'contact_agent'), async (req, res) => {
  try {
    const result = await pool.query(
      `${ORDER_SELECT} WHERE vp.assigned_agent_id = $1 ORDER BY vp.created_at DESC`,
      [req.staff.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /orders/mine error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/orders/:id/pick
// field_agent only — self-assign an unassigned order (atomic, race-safe)
// ─────────────────────────────────────────────
router.post('/:id/pick', protectStaff, requireRole('field_agent'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE vehicle_payments
          SET assigned_agent_id = $1, status = 'assigned'
        WHERE id = $2 AND assigned_agent_id IS NULL
        RETURNING *, reg_number AS plate_number`,
      [req.staff.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'This order was already picked up by another agent' });
    }

    await logStatus(req.params.id, 'assigned', 'staff', req.staff.id, 'self-picked by field agent');
    res.json({ message: 'Order picked up', order: result.rows[0] });
  } catch (err) {
    console.error('POST /orders/:id/pick error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/orders/:id/assign
// super_admin OR contact_agent — manually assign to a chosen field agent
// body: { agent_id }
// ─────────────────────────────────────────────
router.post('/:id/assign', protectStaff, requireRole('super_admin', 'contact_agent'), async (req, res) => {
  const { agent_id } = req.body;
  if (!agent_id) {
    return res.status(400).json({ message: 'agent_id is required' });
  }

  try {
    const agentResult = await pool.query(
      `SELECT id, email, first_name FROM staff_users WHERE id = $1 AND role = 'field_agent' AND status = 'active'`,
      [agent_id]
    );
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Active field agent not found' });
    }

    const result = await pool.query(
      `UPDATE vehicle_payments SET assigned_agent_id = $1, status = 'assigned' WHERE id = $2 RETURNING *, reg_number AS plate_number`,
      [agent_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await logStatus(req.params.id, 'assigned', 'staff', req.staff.id, `manually assigned by ${req.staff.role}`);

    const order = result.rows[0];
    await sendAgentAssignmentEmail(agentResult.rows[0].email, {
      orderRef: order.payment_ref,
      services: servicesLabel(order),
    });

    res.json({ message: 'Order assigned', order });
  } catch (err) {
    console.error('POST /orders/:id/assign error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/orders/:id/status
// field_agent (own orders), contact_agent, super_admin
// body: { status, note? }
// ─────────────────────────────────────────────
router.patch(
  '/:id/status',
  protectStaff,
  requireRole('field_agent', 'contact_agent', 'super_admin'),
  async (req, res) => {
    const { status, note } = req.body;
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    try {
      const existing = await pool.query('SELECT * FROM vehicle_payments WHERE id = $1', [req.params.id]);
      const order = existing.rows[0];
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // field_agent can only update orders assigned to them; contact_agent and
      // super_admin can update any (contact_agent's stated role includes
      // "confirming delivery status").
      if (req.staff.role === 'field_agent' && order.assigned_agent_id !== req.staff.id) {
        return res.status(403).json({ message: 'This order is not assigned to you' });
      }

      const updateFields = ['status = $1'];
      const values = [status];

      const isFinal = status === 'delivered' || status === 'collected';
      if (isFinal) {
        // Mark whichever services this order actually included as done.
        if (order.license) updateFields.push(`license_status = 'Completed'`);
        if (order.roadworthiness) updateFields.push(`roadworthiness_status = 'Completed'`);
        if (order.insurance) updateFields.push(`insurance_status = 'Completed'`);
      }

      values.push(req.params.id);
      const result = await pool.query(
        `UPDATE vehicle_payments SET ${updateFields.join(', ')} WHERE id = $${values.length} RETURNING *, reg_number AS plate_number`,
        values
      );

      await logStatus(req.params.id, status, 'staff', req.staff.id, note || null);

      if (isFinal) {
        const userResult = await pool.query('SELECT email FROM vehicle_users WHERE id = $1', [order.user_id]);
        if (userResult.rows[0]) {
          await sendDeliveryConfirmationEmail(userResult.rows[0].email, {
            orderRef: order.payment_ref,
            services: servicesLabel(order),
          });
        }
      }

      res.json({ message: 'Status updated', order: result.rows[0] });
    } catch (err) {
      console.error('PATCH /orders/:id/status error:', err.message);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

export default router;
