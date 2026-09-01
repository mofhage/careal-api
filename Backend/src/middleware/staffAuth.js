// src/middleware/staffAuth.js
// Separate from src/middleware/auth.js on purpose: staff tokens are signed
// with STAFF_JWT_SECRET (falls back to JWT_SECRET if that's not set yet),
// so a leaked user-auth secret alone can never forge a staff/admin token.
import jwt from 'jsonwebtoken';

const STAFF_SECRET = process.env.STAFF_JWT_SECRET || process.env.JWT_SECRET;

export const protectStaff = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, STAFF_SECRET);
    if (!decoded.role || !decoded.staff) {
      return res.status(401).json({ message: 'Not a staff token' });
    }
    req.staff = decoded; // { id, email, role, staff: true }
    next();
  } catch (err) {
    console.error('Staff JWT verify error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.staff || !roles.includes(req.staff.role)) {
    return res.status(403).json({ message: 'Forbidden — insufficient role' });
  }
  next();
};
