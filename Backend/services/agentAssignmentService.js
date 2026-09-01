// services/agentAssignmentService.js
// Auto-assignment is OFF by default (AUTO_ASSIGN_AGENTS=false) — with a small
// agent pool at pre-funding stage, manual pickup avoids over-building this
// before there's enough volume to tune it. When flipped on, this picks the
// highest-rated online field_agent with the fewest currently-active orders.
import pool from '../db.js';

export async function tryAutoAssign(paymentId) {
  if (process.env.AUTO_ASSIGN_AGENTS !== 'true') {
    return null;
  }

  const candidate = await pool.query(
    `SELECT s.id, s.email, s.first_name,
            COUNT(vp.id) FILTER (WHERE vp.status NOT IN ('delivered','collected')) AS active_orders
       FROM staff_users s
       LEFT JOIN vehicle_payments vp ON vp.assigned_agent_id = s.id
      WHERE s.role = 'field_agent' AND s.status = 'active' AND s.is_online = true
   GROUP BY s.id
   ORDER BY s.rating DESC, active_orders ASC
      LIMIT 1`
  );

  if (candidate.rows.length === 0) {
    console.warn(`[agentAssignmentService] No available field agent for payment ${paymentId} — left for manual pickup`);
    return null;
  }

  const agent = candidate.rows[0];

  const updated = await pool.query(
    `UPDATE vehicle_payments
        SET assigned_agent_id = $1, status = 'assigned'
      WHERE id = $2 AND assigned_agent_id IS NULL
      RETURNING *`,
    [agent.id, paymentId]
  );

  if (updated.rows.length === 0) {
    return null; // already assigned/picked between the query and the update
  }

  await pool.query(
    `INSERT INTO order_status_history (payment_id, status, changed_by_type, changed_by_id, note)
     VALUES ($1, 'assigned', 'system', $2, 'auto-assigned by rating/availability')`,
    [paymentId, agent.id]
  );

  return { agent, payment: updated.rows[0] };
}
