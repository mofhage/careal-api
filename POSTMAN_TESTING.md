# Postman testing guide — CAREAL backend update

Base URL for local testing: `http://localhost:4000/api` (adjust to your port).
Set a Postman environment variable `base_url` to this, plus `user_token`,
`staff_token`, `admin_token` — you'll fill these in as you go through the flow.

---

## 0. Bootstrap: get a user token and a super admin token

You already have this — log in an existing user via `POST {{base_url}}/auth/login`
and save the returned `token` as `user_token`.

For the super admin, log in with the account you manually inserted in step 7
of the setup notes: `POST {{base_url}}/agents/login`
```json
{ "email": "you@example.com", "password": "yourpassword" }
```
Save the returned `token` as `admin_token`.

---

## 1. Forgot / reset password

**POST** `{{base_url}}/auth/forgot-password`
```json
{ "email": "someuser@example.com" }
```
Expect `200` with a generic "if an account exists..." message either way.
Check your server logs — if `RESEND_API_KEY` isn't set yet you'll see a
`[emailService] RESEND_API_KEY not set — skipped` log instead of a real send,
which is expected before you've added the key. Once the key is in, check the
Resend dashboard's "Emails" tab for the send, and copy the `token` from the
reset link in the email (or from the `password_reset_tokens` table directly
while testing).

**POST** `{{base_url}}/auth/reset-password`
```json
{ "token": "<paste token>", "newPassword": "NewPassword123" }
```
Expect `200`. Then confirm the old password fails and the new one works via
`POST {{base_url}}/auth/login`.

---

## 2. Agent invite → accept → login

**POST** `{{base_url}}/agents/invite` — header `Authorization: Bearer {{admin_token}}`
```json
{ "first_name": "Tunde", "last_name": "Bello", "email": "tunde@example.com", "role": "field_agent" }
```
Expect `201`. Grab the `invite_token` from the email/DB (`staff_users.invite_token`).

**POST** `{{base_url}}/agents/accept-invite`
```json
{ "token": "<paste invite_token>", "password": "AgentPass123" }
```
Expect `200`.

**POST** `{{base_url}}/agents/login`
```json
{ "email": "tunde@example.com", "password": "AgentPass123" }
```
Expect `200` with a `token` — save as `field_agent_token`. Repeat the invite
flow once more with `"role": "contact_agent"` to get a `contact_agent_token`
for the sections below.

**GET** `{{base_url}}/agents` — header `Authorization: Bearer {{admin_token}}` → list of all staff.

**PATCH** `{{base_url}}/agents/me/availability` — header `Authorization: Bearer {{field_agent_token}}`
```json
{ "is_online": true }
```

---

## 3. Payment webhook (test without a real Flutterwave call)

You can simulate the webhook directly in Postman since it only checks the
`verif-hash` header against `FLW_SECRET_HASH`:

**POST** `{{base_url}}/payments/webhook`
Header: `verif-hash: <same value as FLW_SECRET_HASH in your .env>`
Body:
```json
{
  "event": "charge.completed",
  "data": {
    "status": "successful",
    "tx_ref": "CAREAL-TEST-0001",
    "meta": {
      "user_id": "<a real vehicle_users.id>",
      "plate_number": "ABC123XY",
      "license": "true",
      "roadworthiness": "false",
      "insurance": "false",
      "license_amount": 2500,
      "roadworthiness_amount": 0,
      "insurance_amount": 0,
      "delivery_method": "personal_collection"
    }
  }
}
```
Expect an immediate `200 { "message": "Received" }`. Then check
`GET {{base_url}}/payments` (as that user) — the order should now appear with
`status: "paid"`. Send the exact same request again — it should not create a
duplicate row (idempotent on `tx_ref`).

Try it again with a wrong `verif-hash` — expect `401`.

---

## 4. Order lifecycle (field agent picks, updates status)

**GET** `{{base_url}}/orders/pending` — header `Authorization: Bearer {{field_agent_token}}`
→ should include the test order from step 3.

**POST** `{{base_url}}/orders/<payment id>/pick` — header `Authorization: Bearer {{field_agent_token}}`
→ `200`, order now `status: "assigned"`. Try picking the same order again
with a second agent's token → expect `409`.

**PATCH** `{{base_url}}/orders/<payment id>/status` — header `Authorization: Bearer {{field_agent_token}}`
```json
{ "status": "in_progress", "note": "At VIO center" }
```
Then progress it:
```json
{ "status": "ready_for_pickup" }
```
Then:
```json
{ "status": "delivered" }
```
On this last one, check your server logs / Resend dashboard for the delivery
confirmation email to the user, and confirm `GET {{base_url}}/payments` (as
the user) now shows `license_status: "Completed"`.

**GET** `{{base_url}}/orders` — header `Authorization: Bearer {{admin_token}}`, try
`?status=delivered` and `?delivery_method=personal_collection` — this is the
reconciliation view.

**POST** `{{base_url}}/orders/<payment id>/assign` — header `Authorization: Bearer {{admin_token}}`
```json
{ "agent_id": "<a field_agent's staff_users.id>" }
```
for the manual-assignment path (as opposed to self-pick).

---

## 5. Service prices (Super Admin editable)

**GET** `{{base_url}}/prices` — no auth needed, this is the endpoint the frontend
should call anywhere a price is shown. Right after running migration 003,
expect the three seeded values (₦2,500 / ₦13,000 / ₦15,000).

**PUT** `{{base_url}}/prices/road_worthiness` — header `Authorization: Bearer {{admin_token}}`
```json
{ "price": 14000 }
```
Expect `200`. Immediately re-run `GET {{base_url}}/prices` — the new value
should already show (cache is invalidated on every admin update, not just
after the 60s TTL). Then run `POST {{base_url}}/payments/initiate` as a user
selecting `roadworthiness: true` — the `amount` sent to Flutterwave should
now reflect ₦14,000, confirming checkout reads live prices, not the old
hardcoded file.

Try the same `PUT` with `{{field_agent_token}}` instead — expect `403`.

---

## 6. In-app messaging

**POST** `{{base_url}}/messages/contact` — header `Authorization: Bearer {{user_token}}`
```json
{ "subject": "Payment not showing", "message": "I paid but my dashboard still shows pending." }
```
Expect `201` with the new `thread`.

**GET** `{{base_url}}/messages/mine` — header `Authorization: Bearer {{user_token}}` → your threads.

**GET** `{{base_url}}/messages/staff` — header `Authorization: Bearer {{contact_agent_token}}` → same thread, staff side.

**POST** `{{base_url}}/messages/staff/<thread id>/reply` — header `Authorization: Bearer {{contact_agent_token}}`
```json
{ "message": "Looking into this now — can you share your transaction reference?" }
```

**POST** `{{base_url}}/messages/mine/<thread id>/reply` — header `Authorization: Bearer {{user_token}}`
```json
{ "message": "Sure, it's CAREAL-TEST-0001" }
```

**PATCH** `{{base_url}}/messages/staff/<thread id>/close` — header `Authorization: Bearer {{contact_agent_token}}`

Try any of the `/messages/staff/*` routes with `{{field_agent_token}}` instead
— expect `403`, confirming field agents can't reach support messaging as
specified.
