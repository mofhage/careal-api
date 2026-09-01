# CAREAL Backend — Update Package

This zip mirrors your existing `Backend/` folder structure exactly, containing
**only new or modified files**. Extract it, then copy the `Backend/` folder
from here on top of your existing `Backend/` folder:

```
xcopy "careal-updates\Backend" "path\to\your\project\Backend" /E /I /Y
```

`/E` copies all subfolders (including empty ones), `/I` assumes destination
is a directory, `/Y` overwrites without prompting. Nothing outside `Backend/`
is touched, and no existing file outside the list below is modified.

## Files in this package

**New files:**
- `Backend/migrations/002_agent_ops.sql`
- `Backend/migrations/003_service_prices.sql`
- `Backend/services/emailService.js`
- `Backend/services/agentAssignmentService.js`
- `Backend/services/servicePriceService.js`
- `Backend/src/middleware/staffAuth.js`
- `Backend/controllers/staffAuthController.js`
- `Backend/controllers/passwordResetController.js`
- `Backend/routes/orders.js`
- `Backend/routes/agents.js`
- `Backend/routes/messages.js`
- `Backend/routes/prices.js`

**Modified files (full replacements — diff against your copy before overwriting if you've made local changes):**
- `Backend/routes/payments.js` — adds `delivery_method` capture on `/initiate`, a new `/webhook` endpoint, a shared `recordPayment()` helper used by both `/verify` and `/webhook`, and now reads prices from the DB via `servicePriceService` instead of the hardcoded `ServicePrice.js`
- `Backend/routes/auth.js` — adds `/forgot-password` and `/reset-password`
- `Backend/server.js` — mounts the four new routers (`/api/orders`, `/api/agents`, `/api/messages`, `/api/prices`)
- `Backend/package.json` — adds the `resend` dependency

**Unchanged but now superseded:** `Backend/ServicePrice.js` is left in place untouched — `servicePriceService.js` imports it purely as a fallback default for any price row missing from the DB (e.g. before you've run migration 003), so nothing breaks if the migration hasn't run yet. Once it has, DB values win.

## Setup steps, in order

1. Copy the files in (see xcopy command above).
2. `cd Backend && npm install` — pulls in the new `resend` package.
3. Add these to your `.env` (see chat for the full list/explanation):
   ```
   RESEND_API_KEY=
   RESEND_FROM_EMAIL=CAREAL <onboarding@resend.dev>
   STAFF_JWT_SECRET=
   FLW_SECRET_HASH=
   AUTO_ASSIGN_AGENTS=false
   AGENT_INVITE_EXPIRY_HOURS=48
   PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30
   ```
4. Run both migrations against your Supabase Postgres DB, in order:
   ```
   psql "$DATABASE_URL" -f Backend/migrations/002_agent_ops.sql
   psql "$DATABASE_URL" -f Backend/migrations/003_service_prices.sql
   ```
   (or paste their contents into the Supabase SQL editor, 002 first)
5. In your Flutterwave dashboard, set the webhook URL to
   `https://<your-backend-host>/api/payments/webhook` and set the "Secret Hash"
   field there to the exact same value you put in `FLW_SECRET_HASH`.
6. Restart the server. Check the startup logs — it now prints whether
   `STAFF_JWT_SECRET` and `RESEND_API_KEY` loaded, same pattern as the
   existing `JWT_SECRET` check.
7. Bootstrap your first Super Admin manually (there's no invite-a-super-admin
   endpoint yet since nothing exists to call it before one exists):
   ```sql
   -- run once, in the Supabase SQL editor
   INSERT INTO staff_users (first_name, last_name, email, password_hash, role, status)
   VALUES ('Your', 'Name', 'you@example.com', '<bcrypt hash>', 'super_admin', 'active');
   ```
   Generate the bcrypt hash with `node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"`
   from inside `Backend/`. After this one manual row, every other agent
   (including future super admins) can be invited normally through
   `POST /api/agents/invite`.

See `POSTMAN_TESTING.md` in this same folder for a full request-by-request
walkthrough of every new/changed endpoint.
