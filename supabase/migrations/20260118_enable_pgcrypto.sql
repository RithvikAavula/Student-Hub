-- Ensure pgcrypto is available for gen_random_uuid()
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
COMMIT;
