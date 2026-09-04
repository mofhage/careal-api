# CAREAL Backend — Fresh Supabase Setup (v6)

For a **new Supabase project**, replacing the old one. This is not a patch
on top of v1–v5 — it's a standalone starting point.

```
xcopy "careal-updates-v6\Backend" "path\to\your\new\project\Backend" /E /I /Y
```

## 1. Create the new Supabase project, get the Transaction Pooler URL

In your new project → **Connect** → choose **Transaction pooler** (not
Session pooler, not Direct connection). This is the one on **port 6543**,
built specifically to work through networks/ISPs that block the standard
5432 port — the exact problem from earlier. Copy that connection string
into `DATABASE_URL` in your `.env`.

## 2. Run the schema — once, before anything else

Paste `database/000_fresh_schema.sql` into the Supabase SQL editor and run
it. This creates all 9 tables the app actually uses — the 3 original ones
(`vehicle_users`, `user_vehicles`, `vehicle_payments`, reverse-engineered
directly from the code's own inserts/selects, since no schema file for them
ever existed) plus the 6 added for agent ops, messaging, and pricing —
all with consistent `uuid` typing throughout, so the earlier integer/uuid
mismatch can't happen on a fresh project.

It also pre-marks `002_agent_ops.sql`, `003_service_prices.sql`, and
`004_delivery_method_rename.sql` as already applied in a `schema_migrations`
table, so **do not run those three individually afterward** — this file
already includes everything they do. Any future migration file (`005_` and
up, whenever we build one) will still run normally through `npm run
migrate`, same as before.

## 3. Everything else stays the same

- All the `.env` keys from before (`RESEND_API_KEY`, `STAFF_JWT_SECRET`,
  `FLW_SECRET_HASH`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, etc.) —
  just update `DATABASE_URL` to point at the new project.
- Restart the server — `bootstrapSuperAdmin.js` runs automatically and
  creates your Super Admin account from `.env`, no manual SQL needed for
  that part.
- `POSTMAN_TESTING.md` from the first package still applies as-is.

## One thing to double check before you commit to this

`user_vehicles.plate_number` is set `UNIQUE` in this fresh schema — meaning
one plate can only ever be added by one account, globally, across all
users. That's the realistic real-world rule (a plate belongs to one
vehicle), and it matches the original code's behavior of catching a
duplicate-key error and returning "Plate already added" — but the original
Supabase table might actually have been `UNIQUE(user_id, plate_number)`
instead (same plate addable by different accounts), since there's no
schema file to confirm which one was really in place. If your old project
ever allowed the same plate under two different users, switch the
constraint before running this against real data.
