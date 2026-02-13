-- Ensure profiles table allows authenticated users to read profiles
-- Created on 2026-01-31

BEGIN;

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view profiles
CREATE POLICY IF NOT EXISTS "Users can view profiles" ON public.profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

COMMIT;