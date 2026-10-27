// src/middleware/validateParams.js
// Used with router.param('id', validId). A malformed id (for example the
// literal string "undefined" when a frontend reads the wrong field) used to
// reach Postgres and come back as a 500 "invalid input syntax for type uuid".
// It now returns a clear 400 instead.
const ID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i;

export function validId(req, res, next, value) {
  if (!ID_RE.test(String(value))) {
    return res.status(400).json({ message: 'Invalid id in request path' });
  }
  next();
}
