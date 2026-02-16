-- Certificate Validation and Fake Detection System
-- Safe, production-ready, re-runnable version
-- Created on 2026-02-15

BEGIN;

-- =====================================================
-- 1. ENUM TYPE (safe creation)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'certificate_validation_status'
  ) THEN
    CREATE TYPE public.certificate_validation_status AS ENUM
    ('valid', 'fake', 'tampered');
  END IF;
END$$;


-- =====================================================
-- 2. CERTIFICATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.certificates (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  certificate_code text UNIQUE NOT NULL,

  recipient_name text NOT NULL,

  recipient_id uuid
  REFERENCES public.profiles(id)
  ON DELETE SET NULL,

  issuer text NOT NULL,

  issuer_id uuid NOT NULL
  REFERENCES public.profiles(id)
  ON DELETE RESTRICT,

  issue_date date NOT NULL,

  title text NOT NULL,

  description text,

  file_url text NOT NULL,

  file_hash text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now()

);


-- =====================================================
-- 3. VALIDATION LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.certificate_validation_logs (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  certificate_code text NOT NULL,

  uploaded_file_hash text,

  validation_status public.certificate_validation_status NOT NULL,

  validated_by uuid
  REFERENCES public.profiles(id)
  ON DELETE SET NULL,

  ip_address text,

  user_agent text,

  created_at timestamptz NOT NULL DEFAULT now()

);


-- =====================================================
-- 4. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_certificates_code
ON public.certificates (certificate_code);

CREATE INDEX IF NOT EXISTS idx_certificates_recipient
ON public.certificates (recipient_id);

CREATE INDEX IF NOT EXISTS idx_certificates_issuer
ON public.certificates (issuer_id);

CREATE INDEX IF NOT EXISTS idx_certificates_issue_date
ON public.certificates (issue_date);

CREATE INDEX IF NOT EXISTS idx_validation_logs_code
ON public.certificate_validation_logs (certificate_code);

CREATE INDEX IF NOT EXISTS idx_validation_logs_status
ON public.certificate_validation_logs (validation_status);

CREATE INDEX IF NOT EXISTS idx_validation_logs_created
ON public.certificate_validation_logs (created_at DESC);


-- =====================================================
-- 5. SEQUENCE
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS certificate_code_seq START WITH 1;


-- =====================================================
-- 6. FUNCTION: GENERATE CERTIFICATE CODE
-- =====================================================

CREATE OR REPLACE FUNCTION generate_certificate_code()

RETURNS text

LANGUAGE plpgsql

AS $$

DECLARE

  year_part text;

  seq_part text;

BEGIN

  year_part := to_char(CURRENT_DATE, 'YYYY');

  seq_part := lpad(nextval('certificate_code_seq')::text, 6, '0');

  RETURN 'CERT-' || year_part || '-' || seq_part;

END;

$$;


-- =====================================================
-- 7. FUNCTION: VALIDATE CERTIFICATE
-- =====================================================

CREATE OR REPLACE FUNCTION validate_certificate(

  p_certificate_code text,

  p_uploaded_file_hash text DEFAULT NULL

)

RETURNS TABLE (

  validation_status public.certificate_validation_status,

  certificate_id uuid,

  recipient_name text,

  issuer text,

  title text,

  issue_date date,

  stored_file_hash text

)

LANGUAGE plpgsql

AS $$

DECLARE

  v_cert RECORD;

  v_status public.certificate_validation_status;

BEGIN

  SELECT * INTO v_cert

  FROM public.certificates

  WHERE certificate_code = p_certificate_code;


  IF v_cert IS NULL THEN

    v_status := 'fake';

    RETURN QUERY SELECT
      v_status,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::date,
      NULL::text;


  ELSIF p_uploaded_file_hash IS NOT NULL
        AND v_cert.file_hash <> p_uploaded_file_hash THEN

    v_status := 'tampered';

    RETURN QUERY SELECT
      v_status,
      v_cert.id,
      v_cert.recipient_name,
      v_cert.issuer,
      v_cert.title,
      v_cert.issue_date,
      v_cert.file_hash;


  ELSE

    v_status := 'valid';

    RETURN QUERY SELECT
      v_status,
      v_cert.id,
      v_cert.recipient_name,
      v_cert.issuer,
      v_cert.title,
      v_cert.issue_date,
      v_cert.file_hash;

  END IF;

END;

$$;


-- =====================================================
-- 8. FUNCTION: STATISTICS (fixed)
-- =====================================================

-- Drop existing function first (required when return type changes)
DROP FUNCTION IF EXISTS get_certificate_stats();

CREATE FUNCTION get_certificate_stats()

RETURNS TABLE (

  total_certificates bigint,

  total_validations bigint,

  valid_validations bigint,

  fake_detections bigint,

  tampered_detections bigint,

  recent_validations bigint

)

LANGUAGE plpgsql

SECURITY DEFINER

AS $$

BEGIN

  RETURN QUERY

  SELECT

    (SELECT COUNT(*) FROM public.certificates),

    (SELECT COUNT(*) FROM public.certificate_validation_logs),

    (SELECT COUNT(*) FROM public.certificate_validation_logs
     WHERE validation_status = 'valid'),

    (SELECT COUNT(*) FROM public.certificate_validation_logs
     WHERE validation_status = 'fake'),

    (SELECT COUNT(*) FROM public.certificate_validation_logs
     WHERE validation_status = 'tampered'),

    (SELECT COUNT(*) FROM public.certificate_validation_logs
     WHERE created_at >= now() - interval '7 days');

END;

$$;



-- =====================================================
-- 9. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_certificates_updated_at()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN

  NEW.updated_at = now();

  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS certificates_updated_at
ON public.certificates;


CREATE TRIGGER certificates_updated_at

BEFORE UPDATE ON public.certificates

FOR EACH ROW

EXECUTE FUNCTION update_certificates_updated_at();


-- =====================================================
-- 10. ENABLE RLS
-- =====================================================

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.certificate_validation_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 11. CERTIFICATES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "public read certificates"
ON public.certificates;

CREATE POLICY "public read certificates"
ON public.certificates
FOR SELECT
USING (true);


DROP POLICY IF EXISTS "faculty admin can insert certificates"
ON public.certificates;

CREATE POLICY "faculty admin can insert certificates"
ON public.certificates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('faculty','admin')
  )
);


DROP POLICY IF EXISTS "faculty admin can update certificates"
ON public.certificates;

CREATE POLICY "faculty admin can update certificates"
ON public.certificates
FOR UPDATE
TO authenticated
USING (
  issuer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  issuer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);


DROP POLICY IF EXISTS "admin can delete certificates"
ON public.certificates;

CREATE POLICY "admin can delete certificates"
ON public.certificates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);


-- =====================================================
-- 12. VALIDATION LOG POLICIES
-- =====================================================

DROP POLICY IF EXISTS "public can insert validation logs"
ON public.certificate_validation_logs;

CREATE POLICY "public can insert validation logs"
ON public.certificate_validation_logs
FOR INSERT
WITH CHECK (true);


DROP POLICY IF EXISTS "faculty admin can view validation logs"
ON public.certificate_validation_logs;

CREATE POLICY "faculty admin can view validation logs"
ON public.certificate_validation_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('faculty','admin')
  )
);


-- =====================================================
-- 13. FUNCTION PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION generate_certificate_code()
TO authenticated;

GRANT EXECUTE ON FUNCTION validate_certificate(text,text)
TO authenticated, anon;

GRANT EXECUTE ON FUNCTION get_certificate_stats()
TO authenticated;


-- =====================================================
-- 14. STORAGE POLICY
-- =====================================================

DROP POLICY IF EXISTS "faculty admin upload certificates"
ON storage.objects;

CREATE POLICY "faculty admin upload certificates"

ON storage.objects

FOR INSERT

TO authenticated

WITH CHECK (

  bucket_id = 'certificates'

  AND name LIKE 'issued/%'

  AND EXISTS (

    SELECT 1 FROM public.profiles

    WHERE id = auth.uid()

    AND role IN ('faculty','admin')

  )

);


COMMIT;
