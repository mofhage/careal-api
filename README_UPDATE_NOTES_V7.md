# CAREAL Backend — Update Package v7 (fixes server crash on dropped DB connection)

Applies **on top of** all previous packages. Replaces `Backend/db.js`.

```
xcopy "careal-updates-v7\Backend" "path\to\your\project\Backend" /E /I /Y
```

## What was wrong

`db.js` created the `pg` `Pool` but never registered an error handler on it.
When Supabase's Transaction pooler drops an idle connection (routine
behavior, not a real outage), `pg` emits an `'error'` event on the pool.
With nothing listening for it, Node treats that as an unhandled error and
crashes the entire process — which is exactly the `ECONNRESET` crash you
just hit, right after a clean, fully-working startup.

## The fix

One addition: `pool.on('error', (err) => { console.error(...) })`. This is
the standard, documented fix for this exact `pg` behavior — it just logs
the dropped connection instead of crashing, and the pool automatically
opens a fresh client on the next query. No other file needs to change; this
isn't route-specific, it protects every part of the app that touches the
database.

## Retest

1. Re-extract, restart (`rs` or `npm run dev` again).
2. Should see the same clean startup as before (`✅ Connected to Supabase
   (pooler mode)`, then the Super Admin bootstrap line).
3. Leave the server running and idle for a while (10+ minutes is a
   reasonable test — long enough for the pooler to potentially recycle an
   idle connection), then send another request (e.g. the login you just
   tested). It should still work, and if a connection *was* dropped in the
   meantime, you'd see `⚠️  Unexpected error on idle Postgres client: ...`
   logged — but critically, the server keeps running instead of crashing.
