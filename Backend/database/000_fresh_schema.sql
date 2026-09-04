-- database/000_fresh_schema.sql
-- FOR A BRAND-NEW SUPABASE PROJECT ONLY. Creates every table CAREAL uses,
-- reverse-engineered from the actual application code (there was never a
-- schema file for the original 3 tables — they were created by hand in the
-- Supabase UI, which is exactly what caused the earlier UUID/integer
-- mismatch on the migrated tables).
--
-- Run this ONCE, either pasted into the Supabase SQL editor, or via:
--   psql "$DATABASE_URL" -f database/000_fresh_schema.sql
--
-- Do NOT also run migrations/002_agent_ops.sql, 003_service_prices.sql, or
-- 004_delivery_method_rename.sql after this — this file already includes
-- everything they do, with vehicle_payments.id as uuid from the start (no
-- ambiguity to detect). It also pre-records those three filenames in
-- schema_migrations, so `npm run migrate` will correctly see nothing
-- pending. Any future migration file (005_ and up) will still run normally
-- through `npm run migrate` as usual.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═════════════════════════════════════════════
-- 1. staff_users — super_admin, contact_agent, field_agent
--    (created before vehicle_payments since it references this)
-- ═════════════════════════════════════════════
CREATE TABLE staff_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT,                          -- null until invite accepted
  role              TEXT NOT NULL CHECK (role IN ('super_admin','contact_agent','field_agent')),
  status            TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  is_online         BOOLEAN NOT NULL DEFAULT false,
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  invite_token      TEXT,
  invite_expires_at TIMESTAMPTZ,
  invited_by        UUID REFERENCES staff_users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═════════════════════════════════════════════
-- 2. vehicle_users — regular users (signup/login)
--    Matches controllers/authController.js exactly: id is app-generated
--    (crypto.randomUUID()), so no DEFAULT needed, but one is set anyway as
--    a safety net in case any future code path omits it.
-- ═════════════════════════════════════════════
CREATE TABLE vehicle_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     TEXT NOT NULL,
  other_name     TEXT,
  last_name      TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  plate_number   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═════════════════════════════════════════════
-- 3. user_vehicles — vehicles a user has added, FRSC-verified
--    Matches routes/vehicles.js. The app's error handling checks for a
--    duplicate-key error (code 23505) and returns "Plate already added" —
--    UNIQUE(plate_number) is the natural real-world constraint (one plate
--    shouldn't belong to two different accounts). Adjust to
--    UNIQUE(user_id, plate_number) instead if you actually want the same
--    plate addable by multiple accounts.
-- ═════════════════════════════════════════════
CREATE TABLE user_vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES vehicle_users(id),
  plate_number TEXT NOT NULL UNIQUE,
  make         TEXT,
  color        TEXT,
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_vehicles_user ON user_vehicles(user_id);

-- ═════════════════════════════════════════════
-- 4. vehicle_payments — checkout/orders. Matches routes/payments.js exactly
--    for the original columns; assigned_agent_id + delivery_method are the
--    agent-ops additions, included here from the start (id is uuid, so no
--    type-detection dance needed the way migration 002 had to do it).
-- ═════════════════════════════════════════════
CREATE TABLE vehicle_payments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES vehicle_users(id),
  reg_number             TEXT NOT NULL,
  license                BOOLEAN NOT NULL DEFAULT false,
  roadworthiness         BOOLEAN NOT NULL DEFAULT false,
  insurance              BOOLEAN NOT NULL DEFAULT false,
  license_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  roadworthiness_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount                 NUMERIC(12,2) NOT NULL,
  payment_ref            TEXT NOT NULL UNIQUE,
  license_status         TEXT NOT NULL DEFAULT 'N/A',
  roadworthiness_status  TEXT NOT NULL DEFAULT 'N/A',
  insurance_status       TEXT NOT NULL DEFAULT 'N/A',
  status                 TEXT NOT NULL DEFAULT 'paid',
  -- lifecycle values used by the app: paid -> assigned -> in_progress ->
  -- ready_for_delivery | ready_for_pickup -> delivered | collected
  assigned_agent_id      UUID REFERENCES staff_users(id),
  delivery_method        TEXT CHECK (delivery_method IN ('agent_delivery','personal_collection')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_payments_user ON vehicle_payments(user_id);

-- ═════════════════════════════════════════════
-- 5. service_prices — Super-Admin-editable pricing
-- ═════════════════════════════════════════════
CREATE TABLE service_prices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key  TEXT UNIQUE NOT NULL CHECK (service_key IN ('licence','road_worthiness','insurance')),
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  price        NUMERIC(12,2) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'NGN',
  updated_by   UUID REFERENCES staff_users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO service_prices (service_key, name, code, price, currency) VALUES
  ('licence',         'Vehicle Licence Renewal',   'LICENCE',         2500,  'NGN'),
  ('road_worthiness', 'Road Worthiness Renewal',   'ROAD_WORTHINESS', 13000, 'NGN'),
  ('insurance',       'Vehicle Insurance Renewal', 'INSURANCE',       15000, 'NGN');

-- ═════════════════════════════════════════════
-- 6. order_status_history — audit trail for order status changes
-- ═════════════════════════════════════════════
CREATE TABLE order_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       UUID NOT NULL REFERENCES vehicle_payments(id),
  status           TEXT NOT NULL,
  changed_by_type  TEXT NOT NULL CHECK (changed_by_type IN ('system','user','staff')),
  changed_by_id    UUID,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_status_history_payment ON order_status_history(payment_id);

-- ═════════════════════════════════════════════
-- 7. password_reset_tokens — forgot/reset password for regular users
-- ═════════════════════════════════════════════
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES vehicle_users(id),
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);

-- ═════════════════════════════════════════════
-- 8. message_threads + 9. messages — in-app support/delivery messaging
-- ═════════════════════════════════════════════
CREATE TABLE message_threads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject            TEXT,
  context_type       TEXT NOT NULL DEFAULT 'general' CHECK (context_type IN ('general','order')),
  payment_id         UUID REFERENCES vehicle_payments(id),
  user_id            UUID NOT NULL REFERENCES vehicle_users(id),
  assigned_staff_id  UUID REFERENCES staff_users(id),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_threads_user ON message_threads(user_id);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','staff')),
  sender_id   UUID NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread ON messages(thread_id);

-- ═════════════════════════════════════════════
-- Pre-record the migration runner's bookkeeping so `npm run migrate`
-- correctly sees 002/003/004 as already applied against this fresh DB.
-- ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT UNIQUE NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (filename) VALUES
  ('002_agent_ops.sql'),
  ('003_service_prices.sql'),
  ('004_delivery_method_rename.sql');
