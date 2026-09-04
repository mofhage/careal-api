# CAREAL Backend — Update Package v3 (Super Admin auto-bootstrap)

Applies **on top of** `careal-backend-updates.zip` and `careal-backend-updates-v2.zip`.

```
xcopy "careal-updates-v3\Backend" "path\to\your\project\Backend" /E /I /Y
```

## What this replaces

Previously you had to manually generate a bcrypt hash and INSERT the first
Super Admin row in the Supabase SQL editor. This removes that step — the
server now creates it itself on startup, from `.env`.

## Files in this package

- `Backend/services/bootstrapSuperAdmin.js` — **new**. Runs once on every
  server start. If `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` are set in
  `.env` and no staff account with that email exists yet, creates one as an
  active `super_admin`. If the account already exists, it does nothing —
  safe to leave these two env vars in `.env` permanently; it will never
  overwrite an existing password.
- `Backend/server.js` — **modified**. Calls `bootstrapSuperAdmin()` before
  `app.listen`.

## Add to `.env`

```
SUPER_ADMIN_EMAIL=you@careal.org
SUPER_ADMIN_PASSWORD=choose_a_real_password_not_password123
SUPER_ADMIN_FIRST_NAME=Your
SUPER_ADMIN_LAST_NAME=Name
```

**On the password:** please don't actually use `password123` — this account
has full control over agents, orders, prices, and every user's payment
records, on a publicly hosted domain (`careal.org`). Anyone who guesses it
can revoke your other agents or change your live prices. A password manager
-generated one costs you nothing and closes that off completely. Same email
you'll actually use to log in, not a placeholder.

## Login (same for every staff role, no separate "admin" endpoint)

```
POST /api/agents/login
{ "email": "you@careal.org", "password": "<your real password>" }
```

Response includes `staff.role: "super_admin"` — that's what the frontend's
`/admin` route should check to decide whether to let someone in, and where a
`contact_agent`/`field_agent` login should redirect instead (a separate
`/staff` area, or role-gated views within one shared staff app — that
decision is frontend's to make, not something the backend enforces via the
URL).

## Retest in Postman

1. Add the four `SUPER_ADMIN_*` vars to `.env`, restart the server.
2. Check the startup logs for `[bootstrapSuperAdmin] Created Super Admin
   account for you@careal.org...`
3. `POST {{base_url}}/agents/login` with that email/password → `200` with a
   token and `staff.role: "super_admin"`.
4. Restart the server again — logs should show nothing from bootstrap this
   time (already exists), confirming it won't reset your password on every
   deploy.
