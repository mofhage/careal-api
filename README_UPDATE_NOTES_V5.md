# CAREAL Backend — Update Package v5 (fixes the UUID/integer migration error)

Applies **on top of** all previous packages. This one **replaces**
`Backend/migrations/002_agent_ops.sql` with a corrected version — same
filename, so xcopy overwrites it in place.

```
xcopy "careal-updates-v5\Backend" "path\to\your\project\Backend" /E /I /Y
```

## What was actually wrong

The original `002_agent_ops.sql` hardcoded
`payment_id INTEGER REFERENCES vehicle_payments(id)` on two tables
(`order_status_history`, `message_threads`) without ever confirming whether
your `vehicle_payments.id` is `integer` or `uuid` — there's no schema file
in the repo to check, the table was created directly in Supabase. If yours
is `uuid`, that FK line fails with exactly the "integer and uuid" mismatch
error you hit.

## The fix

This version checks `information_schema.columns` for the real type of
`vehicle_payments.id` at migration time, then creates both tables with a
matching `payment_id` column — `uuid` if yours is `uuid`, `integer`
otherwise. No more guessing.

## Is it safe to just re-run?

Yes. If you ran the old version via `npm run migrate`, it failed inside a
transaction and rolled back completely — `order_status_history` was never
created, and it was never marked as applied in `schema_migrations`. So it's
still "pending" as far as the runner is concerned; this corrected file just
takes its place.

If instead you pasted the old SQL directly into the Supabase SQL editor
(likely, since this happened "yesterday", before the migration runner
existed) — that runs as one script without automatic rollback, so it's worth
checking what actually landed before re-running:

```sql
-- run this first in the Supabase SQL editor to see what's already there
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('staff_users','order_status_history','password_reset_tokens','message_threads','messages');

SELECT data_type FROM information_schema.columns
WHERE table_name = 'vehicle_payments' AND column_name = 'id';
```

- If `order_status_history`/`message_threads` are **missing** from the first
  query's results — good, nothing to clean up, just run the corrected
  migration.
- If either one **exists** but you suspect it was created with the wrong
  `payment_id` type (or is otherwise incomplete), drop it first so the
  corrected migration can recreate it cleanly:
  ```sql
  DROP TABLE IF EXISTS order_status_history;
  DROP TABLE IF EXISTS message_threads CASCADE; -- CASCADE also drops the messages FK to it if messages already exists
  ```
  (Safe to do — at this stage there's no real order-history or message data
  in either table yet.)

Then:
```
npm run migrate
```

## Retest

Same as before — `npm run migrate` should now report `002_agent_ops.sql`
applied successfully, followed by `003_service_prices.sql` and
`004_delivery_method_rename.sql` if those hadn't run yet either. Re-running
`npm run migrate` again immediately after should print "No pending
migrations."
