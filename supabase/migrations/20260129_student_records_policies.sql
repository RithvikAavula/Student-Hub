-- Enable RLS and policies for student_records
BEGIN;

-- Ensure row-level security is enabled
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;

-- Allow students to select their own records
CREATE POLICY IF NOT EXISTS student_select_own_records
  ON public.student_records FOR SELECT
  TO authenticated
  USING ( student_id = auth.uid() );

-- Allow assigned faculty to select records of their assigned students
CREATE POLICY IF NOT EXISTS faculty_select_assigned_records
  ON public.student_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faculty_assignments fa
      WHERE fa.student_id = public.student_records.student_id
        AND fa.faculty_id = auth.uid()
    )
  );

-- Allow admins to select all records
CREATE POLICY IF NOT EXISTS admin_select_all_records
  ON public.student_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Allow students to insert their own records
CREATE POLICY IF NOT EXISTS student_insert_own_records
  ON public.student_records FOR INSERT
  TO authenticated
  WITH CHECK ( student_id = auth.uid() );

-- Allow students to update their own pending records
CREATE POLICY IF NOT EXISTS student_update_own_pending_records
  ON public.student_records FOR UPDATE
  TO authenticated
  USING ( student_id = auth.uid() AND status = 'pending' )
  WITH CHECK ( student_id = auth.uid() AND status = 'pending' );

-- Allow students to delete their own pending records
CREATE POLICY IF NOT EXISTS student_delete_own_pending_records
  ON public.student_records FOR DELETE
  TO authenticated
  USING ( student_id = auth.uid() AND status = 'pending' );

-- Allow assigned faculty to update records for their assigned students (review / approve / reject)
CREATE POLICY IF NOT EXISTS faculty_update_assigned_records
  ON public.student_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faculty_assignments fa
      WHERE fa.student_id = public.student_records.student_id
        AND fa.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_assignments fa
      WHERE fa.student_id = public.student_records.student_id
        AND fa.faculty_id = auth.uid()
    )
  );

-- Allow admins full access
CREATE POLICY IF NOT EXISTS admin_all_records
  ON public.student_records FOR ALL
  TO authenticated
  USING ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

COMMIT;
