-- Update conversation RLS policy to allow admins to create conversations
-- Created on 2026-01-31

BEGIN;

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create updated policy allowing admins, faculty, and students to create conversations
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = faculty_id OR
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMIT;