-- Academic Year Progression System
-- Fully Migration-Safe Version
-- Safe to re-run anytime

BEGIN;

-- =============================================================================
-- 0. DROP DEPENDENT OBJECTS FIRST (CRITICAL)
-- =============================================================================

-- Drop Views
DROP VIEW IF EXISTS public.student_records_with_details CASCADE;
DROP VIEW IF EXISTS public.student_profile_with_academic_year CASCADE;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_set_submission_academic_year ON public.student_records;
DROP TRIGGER IF EXISTS trg_prevent_academic_year_update ON public.student_records;

-- Drop Functions (important for return-type changes)
DROP FUNCTION IF EXISTS public.get_student_records_by_academic_year(uuid, integer);
DROP FUNCTION IF EXISTS public.get_student_year_wise_stats(uuid);
DROP FUNCTION IF EXISTS public.set_submission_academic_year();
DROP FUNCTION IF EXISTS public.prevent_academic_year_update();
DROP FUNCTION IF EXISTS public.calculate_academic_year(date, integer);
DROP FUNCTION IF EXISTS public.get_graduation_status(date);
DROP FUNCTION IF EXISTS public.fix_student_records_academic_year(uuid);

-- =============================================================================
-- 1. PROFILES TABLE UPDATES
-- =============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS join_date date DEFAULT CURRENT_DATE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS batch_year integer
GENERATED ALWAYS AS (EXTRACT(YEAR FROM join_date)) STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_join_date 
ON public.profiles (join_date);

CREATE INDEX IF NOT EXISTS idx_profiles_batch_year 
ON public.profiles (batch_year);

-- =============================================================================
-- 2. STUDENT_RECORDS TABLE UPDATE
-- =============================================================================

ALTER TABLE public.student_records
ADD COLUMN IF NOT EXISTS academic_year integer
CHECK (academic_year BETWEEN 1 AND 4);

CREATE INDEX IF NOT EXISTS idx_student_records_academic_year
ON public.student_records (academic_year);

-- =============================================================================
-- 3. FUNCTION: CALCULATE ACADEMIC YEAR
-- =============================================================================

CREATE FUNCTION public.calculate_academic_year(
  p_join_date date,
  p_starting_year integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_years_since_join integer;
  v_starting_year integer;
BEGIN
  v_starting_year := GREATEST(1, LEAST(4, COALESCE(p_starting_year, 1)));

  IF p_join_date IS NULL THEN
    RETURN v_starting_year;
  END IF;

  v_years_since_join :=
    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM p_join_date);

  RETURN LEAST(4, v_starting_year + v_years_since_join);
END;
$$;

-- =============================================================================
-- 4. FUNCTION: GRADUATION STATUS
-- =============================================================================

CREATE FUNCTION public.get_graduation_status(p_join_date date)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_years integer;
BEGIN
  IF p_join_date IS NULL THEN
    RETURN 'Active';
  END IF;

  v_years := EXTRACT(YEAR FROM age(CURRENT_DATE, p_join_date));

  IF v_years >= 4 THEN
    RETURN 'Graduated';
  ELSE
    RETURN 'Active';
  END IF;
END;
$$;

-- =============================================================================
-- 5. VIEW: STUDENT PROFILE WITH ACADEMIC YEAR
-- =============================================================================

CREATE VIEW public.student_profile_with_academic_year AS
SELECT 
  p.*,
  public.calculate_academic_year(
      p.join_date,
      COALESCE(p.year_of_study, 1)
  ) AS current_academic_year,
  public.get_graduation_status(p.join_date) AS graduation_status
FROM public.profiles p
WHERE p.role = 'student';

-- =============================================================================
-- 6. VIEW: STUDENT RECORDS WITH DETAILS
-- =============================================================================

CREATE VIEW public.student_records_with_details AS
SELECT 
  sr.*,
  p.full_name AS student_name,
  p.email AS student_email,
  p.department AS student_department,
  p.section AS student_section,
  p.join_date AS student_join_date,
  p.batch_year AS student_batch_year,
  p.year_of_study AS student_starting_year,
  public.calculate_academic_year(
      p.join_date,
      COALESCE(p.year_of_study, 1)
  ) AS student_current_academic_year
FROM public.student_records sr
JOIN public.profiles p
ON sr.student_id = p.id;

-- =============================================================================
-- 7. FUNCTION: GET STUDENT RECORDS BY YEAR
-- =============================================================================

CREATE FUNCTION public.get_student_records_by_academic_year(
  p_student_id uuid,
  p_academic_year integer DEFAULT NULL
)
RETURNS SETOF public.student_records
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.student_records
  WHERE student_id = p_student_id
  AND (p_academic_year IS NULL OR academic_year = p_academic_year)
  ORDER BY created_at DESC;
$$;

-- =============================================================================
-- 8. FUNCTION: YEAR-WISE STATS
-- =============================================================================

CREATE FUNCTION public.get_student_year_wise_stats(p_student_id uuid)
RETURNS TABLE (
  academic_year integer,
  total_submissions bigint,
  pending_count bigint,
  approved_count bigint,
  rejected_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    academic_year,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  FROM public.student_records
  WHERE student_id = p_student_id
  GROUP BY academic_year
  ORDER BY academic_year;
$$;

-- =============================================================================
-- 9. TRIGGER: AUTO SET ACADEMIC YEAR
-- =============================================================================

CREATE FUNCTION public.set_submission_academic_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_join_date date;
  v_year_of_study integer;
BEGIN
  SELECT join_date, year_of_study
  INTO v_join_date, v_year_of_study
  FROM public.profiles
  WHERE id = NEW.student_id;

  NEW.academic_year :=
    public.calculate_academic_year(
      v_join_date,
      COALESCE(v_year_of_study, 1)
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_submission_academic_year
BEFORE INSERT ON public.student_records
FOR EACH ROW
EXECUTE FUNCTION public.set_submission_academic_year();

-- =============================================================================
-- 10. PREVENT ACADEMIC YEAR UPDATE (except for fixing records with default value)
-- =============================================================================

CREATE FUNCTION public.prevent_academic_year_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow updating if the old value was 1 (default) and the new value is higher
  -- This allows fixing records that were created before the system was properly set up
  IF OLD.academic_year IS NOT NULL
     AND NEW.academic_year <> OLD.academic_year
     AND OLD.academic_year > 1 THEN
    RAISE EXCEPTION 'academic_year is immutable once set above 1';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_academic_year_update
BEFORE UPDATE ON public.student_records
FOR EACH ROW
EXECUTE FUNCTION public.prevent_academic_year_update();

-- =============================================================================
-- 10b. FUNCTION TO FIX RECORDS (callable from frontend via RPC)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fix_student_records_academic_year(p_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_join_date date;
  v_year_of_study integer;
  v_fixed_count integer := 0;
BEGIN
  -- Get student's profile info
  SELECT join_date, COALESCE(year_of_study, 1)
  INTO v_join_date, v_year_of_study
  FROM public.profiles
  WHERE id = p_student_id;
  
  IF v_join_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Update records that have academic_year = 1 but should be higher
  UPDATE public.student_records
  SET academic_year = public.calculate_academic_year(v_join_date, v_year_of_study)
  WHERE student_id = p_student_id
    AND academic_year = 1
    AND public.calculate_academic_year(v_join_date, v_year_of_study) > 1;
  
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  
  RETURN v_fixed_count;
END;
$$;

-- =============================================================================
-- 11. UPDATE EXISTING RECORDS (ONLY NULL)
-- =============================================================================

UPDATE public.student_records sr
SET academic_year = public.calculate_academic_year(
    p.join_date,
    COALESCE(p.year_of_study, 1)
)
FROM public.profiles p
WHERE sr.student_id = p.id
AND sr.academic_year IS NULL;

-- =============================================================================
-- 12. PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_student_records_student_year
ON public.student_records (student_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_student_records_status_year
ON public.student_records (status, academic_year);

COMMIT;
