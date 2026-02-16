BEGIN;

-- ============================================================
-- DROP TABLES FIRST (this avoids relation does not exist errors)
-- ============================================================

DROP TABLE IF EXISTS public.certificate_validation_logs CASCADE;
DROP TABLE IF EXISTS public.verified_certificates CASCADE;
DROP TABLE IF EXISTS public.certificate_submissions CASCADE;

-- ============================================================
-- DROP FUNCTIONS
-- ============================================================

DROP FUNCTION IF EXISTS validate_certificate_submission(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_certificate_stats() CASCADE;
DROP FUNCTION IF EXISTS get_fraudulent_certificates_report() CASCADE;
DROP FUNCTION IF EXISTS update_submission_updated_at() CASCADE;

-- ============================================================
-- DROP ENUMS
-- ============================================================

DROP TYPE IF EXISTS public.certificate_validation_status CASCADE;
DROP TYPE IF EXISTS public.certificate_approval_status CASCADE;

-- ============================================================
-- CREATE ENUMS
-- ============================================================

CREATE TYPE public.certificate_validation_status AS ENUM
(
  'valid',
  'fake',
  'tampered'
);

CREATE TYPE public.certificate_approval_status AS ENUM
(
  'pending',
  'approved',
  'rejected'
);

-- ============================================================
-- CREATE TABLES
-- ============================================================

CREATE TABLE public.certificate_submissions
(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  certificate_code text NOT NULL,

  title text NOT NULL,

  description text,

  issuing_organization text NOT NULL,

  issue_date date NOT NULL,

  file_url text NOT NULL,

  file_hash text NOT NULL,

  validation_status public.certificate_validation_status
    NOT NULL DEFAULT 'fake',

  approval_status public.certificate_approval_status
    NOT NULL DEFAULT 'pending',

  reviewed_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  reviewed_at timestamptz,

  rejection_reason text,

  created_at timestamptz DEFAULT now(),

  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.verified_certificates
(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  certificate_code text UNIQUE NOT NULL,

  issuing_organization text NOT NULL,

  file_hash text NOT NULL,

  metadata jsonb,

  added_by uuid REFERENCES public.profiles(id),

  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.certificate_validation_logs
(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  submission_id uuid
    REFERENCES public.certificate_submissions(id),

  certificate_code text NOT NULL,

  uploaded_file_hash text,

  validation_status public.certificate_validation_status,

  validated_by uuid REFERENCES public.profiles(id),

  user_agent text,

  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX ON public.certificate_submissions(student_id);
CREATE INDEX ON public.certificate_submissions(approval_status);
CREATE INDEX ON public.certificate_submissions(validation_status);

CREATE INDEX ON public.verified_certificates(certificate_code);

CREATE INDEX ON public.certificate_validation_logs(validation_status);

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE FUNCTION validate_certificate_submission(
  p_certificate_code text,
  p_file_hash text
)
RETURNS public.certificate_validation_status
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cert record;
BEGIN

  SELECT *
  INTO v_cert
  FROM public.verified_certificates
  WHERE certificate_code = p_certificate_code;

  IF v_cert IS NULL THEN
    RETURN 'fake';

  ELSIF v_cert.file_hash != p_file_hash THEN
    RETURN 'tampered';

  ELSE
    RETURN 'valid';

  END IF;

END;
$$;

CREATE FUNCTION get_certificate_stats()
RETURNS TABLE
(
total_submissions bigint,
pending_submissions bigint,
approved_submissions bigint,
rejected_submissions bigint,
valid_certificates bigint,
fake_certificates bigint,
tampered_certificates bigint,
recent_submissions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

RETURN QUERY
SELECT
COUNT(*),
COUNT(*) FILTER (WHERE approval_status='pending'),
COUNT(*) FILTER (WHERE approval_status='approved'),
COUNT(*) FILTER (WHERE approval_status='rejected'),
COUNT(*) FILTER (WHERE validation_status='valid'),
COUNT(*) FILTER (WHERE validation_status='fake'),
COUNT(*) FILTER (WHERE validation_status='tampered'),
COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')
FROM public.certificate_submissions;

END;
$$;

CREATE FUNCTION get_fraudulent_certificates_report()
RETURNS TABLE
(
id uuid,
submission_id uuid,
student_id uuid,
student_name text,
student_email text,
student_roll_number text,
certificate_code text,
title text,
issuing_organization text,
issue_date date,
validation_status public.certificate_validation_status,
approval_status public.certificate_approval_status,
file_url text,
file_path text,
file_hash text,
submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

RETURN QUERY
SELECT
cs.id,
cs.id as submission_id,
cs.student_id,
p.full_name,
p.email,
COALESCE(p.student_id, '') as student_roll_number,
cs.certificate_code,
cs.title,
cs.issuing_organization,
cs.issue_date,
cs.validation_status,
cs.approval_status,
cs.file_url,
cs.file_url as file_path,
cs.file_hash,
cs.created_at
FROM public.certificate_submissions cs
JOIN public.profiles p
ON p.id = cs.student_id
WHERE cs.validation_status IN ('fake','tampered');

END;
$$;

-- ============================================================
-- TRIGGER
-- ============================================================

CREATE FUNCTION update_submission_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;

CREATE TRIGGER submission_updated_at
BEFORE UPDATE ON public.certificate_submissions
FOR EACH ROW
EXECUTE FUNCTION update_submission_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.certificate_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_validation_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE POLICY
-- ============================================================

DROP POLICY IF EXISTS "students can upload certificates" ON storage.objects;

CREATE POLICY "students can upload certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id='certificates');

-- ============================================================
-- GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION validate_certificate_submission TO authenticated;
GRANT EXECUTE ON FUNCTION get_certificate_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_fraudulent_certificates_report TO authenticated;

COMMIT;
