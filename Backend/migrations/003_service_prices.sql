-- migrations/003_service_prices.sql
-- Makes pricing DB-driven instead of hardcoded in ServicePrice.js.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS service_prices (
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

-- Seed with the values that were previously hardcoded in ServicePrice.js.
-- ON CONFLICT DO NOTHING so re-running this migration never clobbers a price
-- a Super Admin has already changed.
INSERT INTO service_prices (service_key, name, code, price, currency) VALUES
  ('licence',         'Vehicle Licence Renewal',  'LICENCE',         2500,  'NGN'),
  ('road_worthiness', 'Road Worthiness Renewal',  'ROAD_WORTHINESS', 13000, 'NGN'),
  ('insurance',        'Vehicle Insurance Renewal', 'INSURANCE',      15000, 'NGN')
ON CONFLICT (service_key) DO NOTHING;
