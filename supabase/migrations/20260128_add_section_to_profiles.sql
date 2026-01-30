-- Add section column to profiles table
ALTER TABLE public.profiles
ADD COLUMN section text NULL;

-- Create index on section for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_section ON public.profiles USING btree (section) TABLESPACE pg_default;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN public.profiles.section IS 'Student section (e.g., A, B, C or custom section identifier)';
