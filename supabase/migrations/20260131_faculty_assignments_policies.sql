-- Create faculty_assignments table and fix RLS issues
-- Created on 2026-01-31

BEGIN;

-- Drop existing table if it exists to ensure clean state
DROP TABLE IF EXISTS public.faculty_assignments CASCADE;

-- Create faculty_assignments table
CREATE TABLE public.faculty_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id) -- Ensure one faculty per student
);

-- Create indexes for better performance
CREATE INDEX idx_faculty_assignments_student_id ON public.faculty_assignments(student_id);
CREATE INDEX idx_faculty_assignments_faculty_id ON public.faculty_assignments(faculty_id);

-- Explicitly disable RLS to avoid recursion issues
ALTER TABLE public.faculty_assignments DISABLE ROW LEVEL SECURITY;

-- Recreate the trigger function and trigger (in case they were dropped)
CREATE OR REPLACE FUNCTION create_conversation_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.conversations (faculty_id, student_id)
  VALUES (NEW.faculty_id, NEW.student_id)
  ON CONFLICT (faculty_id, student_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_create_conversation
  AFTER INSERT ON public.faculty_assignments
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_assignment();

COMMIT;