-- migrations/004_delivery_method_rename.sql
-- Renames delivery_method 'logistics' -> 'agent_delivery'. There is no
-- logistics-company API integrated yet — field agents currently handle
-- delivery themselves after finishing the VIO/FRSC paperwork, so the value
-- should say that rather than imply a courier partner that doesn't exist.
-- 'agent_delivery' is meant to stay as the manual fallback even after a real
-- logistics API is added later (e.g. a future 'third_party_logistics' value).
-- Safe to re-run.

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'vehicle_payments'::regclass
    AND pg_get_constraintdef(oid) ILIKE '%delivery_method%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE vehicle_payments DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

UPDATE vehicle_payments SET delivery_method = 'agent_delivery' WHERE delivery_method = 'logistics';

ALTER TABLE vehicle_payments
  ADD CONSTRAINT vehicle_payments_delivery_method_check
  CHECK (delivery_method IN ('agent_delivery', 'personal_collection'));
