# CAREAL Backend — Update Package v2 (small follow-up patch)

Applies **on top of** the previous `careal-backend-updates.zip` package. If you
haven't extracted that one yet, apply it first, then this one.

```
xcopy "careal-updates-v2\Backend" "path\to\your\project\Backend" /E /I /Y
```

## What changed and why

You flagged two things after reviewing the first package:

1. **"Logistics" implied a courier partner we don't have.** Renamed the
   `delivery_method` value `logistics` → `agent_delivery` everywhere, since
   right now the field agent who does the VIO/FRSC paperwork also delivers
   it themselves (or arranges an ad-hoc rider) — there's no logistics-company
   API integrated. `agent_delivery` is meant to stay as the manual fallback
   even after a real courier API is added later.
2. **Assignment shouldn't be Super-Admin-only.** `POST /orders/:id/assign`
   now also accepts the `contact_agent` role, not just `super_admin` —
   matches your call that Support Agents can assign to field agents too,
   in addition to field agents self-picking.

## Files in this package

- `Backend/migrations/004_delivery_method_rename.sql` — **new**. Renames the
  `logistics` value to `agent_delivery` on any existing rows, and updates the
  DB check constraint. Run it after `002_agent_ops.sql` and
  `003_service_prices.sql`.
- `Backend/routes/payments.js` — **modified**. `delivery_method` validation
  and defaults now use `agent_delivery` instead of `logistics`.
- `Backend/routes/orders.js` — **modified**. `POST /:id/assign` now allows
  `contact_agent` in addition to `super_admin`.

## Retest in Postman

- `POST {{base_url}}/payments/initiate` with `"delivery_method": "agent_delivery"`
  → should succeed (previously you'd have sent `"logistics"`).
- `POST {{base_url}}/orders/<id>/assign` using `{{contact_agent_token}}`
  (not just `{{admin_token}}`) → should now return `200` instead of `403`.
