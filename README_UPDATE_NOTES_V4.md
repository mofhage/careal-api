# CAREAL Backend — Update Package v4 (migration runner)

Applies **on top of** all previous packages.

```
xcopy "careal-updates-v4\Backend" "path\to\your\project\Backend" /E /I /Y
```

## What this adds

A terminal command to run migrations instead of copy-pasting into the
Supabase SQL editor — no ORM, no new dependency, just a script using the
`pg` Pool you already have.

## Files in this package

- `Backend/migrations/migrate.js` — **new**. Reads every `.sql` file in
  `Backend/migrations/`, checks a `schema_migrations` table for which have
  already run, and applies whichever are pending, in filename order (which
  is why they're numbered `002_`, `003_`, `004_`...). Each file runs inside
  its own transaction — if one fails, it rolls back and stops, leaving
  earlier migrations untouched and telling you exactly which file to fix.
- `Backend/package.json` — **modified**. Adds `"migrate": "node
  migrations/migrate.js"` to scripts.

## How you'll use it going forward

```
cd Backend
npm run migrate
```

That's it — one command, from the terminal, every time. The first run
against your existing DB will apply `002_agent_ops.sql`,
`003_service_prices.sql`, and `004_delivery_method_rename.sql` in order (or
skip whichever you've already pasted into the SQL editor by hand — it checks
`schema_migrations`, not just "does the file exist", so nothing runs twice
even if you mix manual and scripted runs). Every future migration file you
or I add just needs to be dropped into `Backend/migrations/` with a
higher number prefix (`005_...`, `006_...`) and `npm run migrate` picks it
up automatically.

## Retest

1. `npm run migrate` — should print which migrations it found pending and
   apply them one by one with a `✓ Applied ...` line each.
2. Run it again immediately — should print `No pending migrations —
   database is up to date.`
3. Check the DB for the new `schema_migrations` table — it should have one
   row per migration file that's run.
