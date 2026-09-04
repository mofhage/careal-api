-- migrations/002_agent_ops.sql  (corrected)
-- Run this via `npm run migrate` (see migrations/migrate.js), or paste into
-- the Supabase SQL editor. Safe to re-run — everything is IF NOT EXISTS or
-- guarded, so it will simply finish whatever a previous failed/partial run
-- left incomplete.
--
-- FIX: the original version of this file hardcoded
-- `payment_id INTEGER REFERENCES vehicle_payments(id)` on
-- order_status_history and message_threads, without actually checking
-- whether vehicle_payments.id is integer or uuid. If yours is uuid, that
-- caused the "cannot match integer and uuid" error. This version detects
-- the real type first and creates matching columns either way.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- Staff: super_admin, contact_agent, field_agent
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_users (
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

-- ─────────────────────────────────────────────
-- Order/assignment additions on vehicle_payments
-- assigned_agent_id is always UUID (references staff_users, which is
-- always UUID regardless of vehicle_payments.id's type) — no ambiguity here.
-- ─────────────────────────────────────────────
ALTER TABLE vehicle_payments
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES staff_users(id),
  ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('agent_delivery','personal_collection'));

-- status column already exists on vehicle_payments ('paid' on insert).
-- Lifecycle values used going forward (plain TEXT, no DB-level enum):
--   paid -> assigned -> in_progress -> ready_for_delivery | ready_for_pickup
--        -> delivered | collected

-- ─────────────────────────────────────────────
-- order_status_history — payment_id type detected dynamically to match
-- whatever vehicle_payments.id actually is.
-- ─────────────────────────────────────────────
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_name = 'vehicle_payments' AND column_name = 'id';

  IF id_type IS NULL THEN
    RAISE EXCEPTION 'vehicle_payments.id column not found — is the table name/column correct?';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
    IF id_type = 'uuid' THEN
      EXECUTE 'CREATE TABLE order_status_history (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id       UUID NOT NULL REFERENCES vehicle_payments(id),
        status           TEXT NOT NULL,
        changed_by_type  TEXT NOT NULL CHECK (changed_by_type IN (''system'',''user'',''staff'')),
        changed_by_id    UUID,
        note             TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )';
    ELSE
      EXECUTE 'CREATE TABLE order_status_history (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id       INTEGER NOT NULL REFERENCES vehicle_payments(id),
        status           TEXT NOT NULL,
        changed_by_type  TEXT NOT NULL CHECK (changed_by_type IN (''system'',''user'',''staff'')),
        changed_by_id    UUID,
        note             TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )';
    END IF;
    EXECUTE 'CREATE INDEX idx_order_status_history_payment ON order_status_history(payment_id)';
    RAISE NOTICE 'Created order_status_history with payment_id type: %', id_type;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- Password reset (regular users, vehicle_users) — unaffected by the
-- vehicle_payments.id question, user_id here is always uuid (Supabase auth id).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

-- ─────────────────────────────────────────────
-- In-app messaging — message_threads.payment_id also needs to match
-- vehicle_payments.id's real type.
-- ─────────────────────────────────────────────
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_name = 'vehicle_payments' AND column_name = 'id';

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN
    IF id_type = 'uuid' THEN
      EXECUTE 'CREATE TABLE message_threads (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject            TEXT,
        context_type       TEXT NOT NULL DEFAULT ''general'' CHECK (context_type IN (''general'',''order'')),
        payment_id         UUID REFERENCES vehicle_payments(id),
        user_id            UUID NOT NULL,
        assigned_staff_id  UUID REFERENCES staff_users(id),
        status             TEXT NOT NULL DEFAULT ''open'' CHECK (status IN (''open'',''closed'')),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )';
    ELSE
      EXECUTE 'CREATE TABLE message_threads (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject            TEXT,
        context_type       TEXT NOT NULL DEFAULT ''general'' CHECK (context_type IN (''general'',''order'')),
        payment_id         INTEGER REFERENCES vehicle_payments(id),
        user_id            UUID NOT NULL,
        assigned_staff_id  UUID REFERENCES staff_users(id),
        status             TEXT NOT NULL DEFAULT ''open'' CHECK (status IN (''open'',''closed'')),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )';
    END IF;
    EXECUTE 'CREATE INDEX idx_threads_user ON message_threads(user_id)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','staff')),
  sender_id   UUID NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
