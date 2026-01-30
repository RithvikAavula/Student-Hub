-- Enforce single faculty per student in faculty_assignments
-- Created on 2026-01-02
BEGIN;

-- Ensure the table exists before creating the index
-- Create a unique index on student_id to prevent multiple assignments
CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_assignments_student
  ON public.faculty_assignments (student_id);

COMMIT;
