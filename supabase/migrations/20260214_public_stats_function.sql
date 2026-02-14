-- Create a function to get public statistics for the landing page
-- This function uses SECURITY DEFINER to bypass RLS and return aggregated counts

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_count INTEGER;
  faculty_count INTEGER;
  records_count INTEGER;
  department_count INTEGER;
  result JSON;
BEGIN
  -- Count students
  SELECT COUNT(*) INTO student_count
  FROM public.profiles
  WHERE role = 'student';

  -- Count faculty
  SELECT COUNT(*) INTO faculty_count
  FROM public.profiles
  WHERE role = 'faculty';

  -- Count records
  SELECT COUNT(*) INTO records_count
  FROM public.student_records;

  -- Count unique departments
  SELECT COUNT(DISTINCT department) INTO department_count
  FROM public.profiles
  WHERE department IS NOT NULL AND department != '';

  -- Build result JSON
  result := json_build_object(
    'students', COALESCE(student_count, 0),
    'faculty', COALESCE(faculty_count, 0),
    'records', COALESCE(records_count, 0),
    'departments', COALESCE(department_count, 0)
  );

  RETURN result;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO authenticated;
