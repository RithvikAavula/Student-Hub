BEGIN;

-- ============================================================
-- Certificate Fraud Detection System
-- ============================================================

-- Add fraud analysis columns to certificate_submissions
ALTER TABLE public.certificate_submissions
ADD COLUMN IF NOT EXISTS fraud_indicators jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fraud_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS analysis_completed boolean DEFAULT false;

-- Comments
COMMENT ON COLUMN public.certificate_submissions.fraud_indicators IS 
'JSON object containing fraud analysis results';

COMMENT ON COLUMN public.certificate_submissions.fraud_score IS 
'Risk score from 0–100 indicating likelihood of fraud';

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_certificate_submissions_fraud_score 
ON public.certificate_submissions(fraud_score DESC) 
WHERE fraud_score > 40;

CREATE INDEX IF NOT EXISTS idx_certificate_submissions_pending_fraud 
ON public.certificate_submissions(fraud_score DESC, created_at DESC) 
WHERE approval_status = 'pending';

-- ============================================================
-- DROP FUNCTIONS FIRST (IMPORTANT FIX)
-- ============================================================

DROP FUNCTION IF EXISTS get_certificates_for_review(uuid) CASCADE;

DROP FUNCTION IF EXISTS get_fraudulent_certificates_report() CASCADE;

DROP FUNCTION IF EXISTS get_fraud_statistics() CASCADE;

-- ============================================================
-- Function: get_certificates_for_review
-- ============================================================

CREATE FUNCTION get_certificates_for_review(p_faculty_id uuid)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  student_name text,
  student_roll_number text,
  certificate_code text,
  title text,
  description text,
  issuing_organization text,
  issue_date date,
  file_url text,
  fraud_indicators jsonb,
  fraud_score integer,
  analysis_completed boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.student_id,
    p.full_name,
    p.roll_number,
    cs.certificate_code,
    cs.title,
    cs.description,
    cs.issuing_organization,
    cs.issue_date,
    cs.file_url,
    cs.fraud_indicators,
    cs.fraud_score,
    cs.analysis_completed,
    cs.created_at
  FROM public.certificate_submissions cs
  JOIN public.profiles p ON cs.student_id = p.id
  JOIN public.faculty_assignments fa ON cs.student_id = fa.student_id
  WHERE fa.faculty_id = p_faculty_id
    AND cs.approval_status = 'pending'
  ORDER BY cs.fraud_score DESC, cs.created_at ASC;
END;
$$;

-- ============================================================
-- Function: get_fraudulent_certificates_report
-- ============================================================

CREATE FUNCTION get_fraudulent_certificates_report()
RETURNS TABLE (
  id uuid,
  student_id uuid,
  student_name text,
  student_roll_number text,
  certificate_code text,
  title text,
  issuing_organization text,
  file_url text,
  fraud_indicators jsonb,
  fraud_score integer,
  approval_status text,
  rejection_reason text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.student_id,
    p.full_name,
    p.roll_number,
    cs.certificate_code,
    cs.title,
    cs.issuing_organization,
    cs.file_url,
    cs.fraud_indicators,
    cs.fraud_score,
    cs.approval_status::text,
    cs.rejection_reason,
    reviewer.full_name,
    cs.reviewed_at,
    cs.created_at
  FROM public.certificate_submissions cs
  JOIN public.profiles p ON cs.student_id = p.id
  LEFT JOIN public.profiles reviewer ON cs.reviewed_by = reviewer.id
  WHERE cs.approval_status = 'rejected'
     OR cs.fraud_score >= 60
  ORDER BY cs.fraud_score DESC, cs.created_at DESC;
END;
$$;

-- ============================================================
-- Function: get_fraud_statistics
-- ============================================================

CREATE FUNCTION get_fraud_statistics()
RETURNS TABLE (
  total_submissions bigint,
  pending_review bigint,
  approved bigint,
  rejected_fake bigint,
  high_risk_pending bigint,
  average_fraud_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE approval_status = 'pending')::bigint,
    COUNT(*) FILTER (WHERE approval_status = 'approved')::bigint,
    COUNT(*) FILTER (WHERE approval_status = 'rejected')::bigint,
    COUNT(*) FILTER (WHERE approval_status = 'pending' AND fraud_score >= 60)::bigint,
    COALESCE(AVG(fraud_score), 0)::numeric
  FROM public.certificate_submissions;
END;
$$;

-- ============================================================
-- Permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION get_certificates_for_review(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION get_fraudulent_certificates_report() TO authenticated;

GRANT EXECUTE ON FUNCTION get_fraud_statistics() TO authenticated;

COMMIT;
