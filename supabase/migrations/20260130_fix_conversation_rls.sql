-- Fix RLS policy for conversations to allow both faculty and students to create conversations
-- Created on 2026-01-30

BEGIN;

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Faculty can create conversations" ON public.conversations;

-- Create new policy allowing both faculty, students, and admins to create conversations
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = faculty_id OR 
    auth.uid() = student_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMIT;