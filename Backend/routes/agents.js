// routes/agents.js
import express from 'express';
import { protectStaff, requireRole } from '../src/middleware/staffAuth.js';
import {
  inviteAgent,
  acceptInvite,
  staffLogin,
  listAgents,
  revokeAgent,
  reactivateAgent,
  setMyAvailability,
} from '../controllers/staffAuthController.js';

const router = express.Router();

// Public — no staff signup page exists; the only way in is an admin invite.
router.post('/accept-invite', acceptInvite);
router.post('/login', staffLogin);

// super_admin only
router.post('/invite', protectStaff, requireRole('super_admin'), inviteAgent);
router.get('/', protectStaff, requireRole('super_admin'), listAgents);
router.patch('/:id/revoke', protectStaff, requireRole('super_admin'), revokeAgent);
router.patch('/:id/reactivate', protectStaff, requireRole('super_admin'), reactivateAgent);

// field_agent, contact_agent — self-service availability toggle
router.patch('/me/availability', protectStaff, requireRole('field_agent', 'contact_agent'), setMyAvailability);

export default router;
