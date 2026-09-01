// backend/routes/auth.js
import express from 'express';
import { signup, login } from '../controllers/authController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController.js';

const router = express.Router();

// POST /signup
router.post('/signup', signup);

// POST /login
router.post('/login', login);

// POST /forgot-password
router.post('/forgot-password', forgotPassword);

// POST /reset-password
router.post('/reset-password', resetPassword);

export default router;
