-- migrations/002_agent_ops.sql
-- Run this against your Supabase/Postgres DB (e.g. via Supabase SQL editor,
-- or `psql "$DATABASE_URL" -f migrations/002_agent_ops.sql`).
-- Safe to re-run — everything is IF NOT EXISTS.

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
-- NOTE: assumes vehicle_payments.id is INTEGER/SERIAL (matches the existing
-- INSERT ... RETURNING * pattern in routes/payments.js). If your id column
-- is UUID instead, change payment_id below to UUID before running.
-- ─────────────────────────────────────────────
ALTER TABLE vehicle_payments
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES staff_users(id),
  ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('logistics','personal_collection'));

-- status column already exists on vehicle_payments ('paid' on insert).
-- New lifecycle values used going forward (plain TEXT, no DB-level enum,
-- to avoid a breaking migration):
--   paid -> assigned -> in_progress -> ready_for_delivery | ready_for_pickup
--        -> delivered | collected

CREATE TABLE IF NOT EXISTS order_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       INTEGER NOT NULL REFERENCES vehicle_payments(id),
  status           TEXT NOT NULL,
  changed_by_type  TEXT NOT NULL CHECK (changed_by_type IN ('system','user','staff')),
  changed_by_id    UUID,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_payment ON order_status_history(payment_id);

-- ─────────────────────────────────────────────
-- Password reset (regular users, vehicle_users)
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
-- In-app messaging (contact form + support/delivery threads)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject            TEXT,
  context_type       TEXT NOT NULL DEFAULT 'general' CHECK (context_type IN ('general','order')),
  payment_id         INTEGER REFERENCES vehicle_payments(id),
  user_id            UUID NOT NULL,
  assigned_staff_id  UUID REFERENCES staff_users(id),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_user ON message_threads(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','staff')),
  sender_id   UUID NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
