BEGIN;

-- -----------------------------------------------------
-- Create the certificates bucket if it doesn't exist
-- -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------
-- Public read access for certificates bucket
-- -----------------------------------------------------
DROP POLICY IF EXISTS "public read certificates" ON storage.objects;

CREATE POLICY "public read certificates"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificates'
);

-- -----------------------------------------------------
-- Allow authenticated users to upload files
-- only into messages folder
-- -----------------------------------------------------
DROP POLICY IF EXISTS "users can upload message attachments" ON storage.objects;

CREATE POLICY "users can upload message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND name LIKE 'messages/%'
);

-- -----------------------------------------------------
-- Allow authenticated users to update their own files
-- -----------------------------------------------------
DROP POLICY IF EXISTS "users can update own certificates" ON storage.objects;

CREATE POLICY "users can update own certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND owner = auth.uid()
)
WITH CHECK (
  owner = auth.uid()
);

-- -----------------------------------------------------
-- Allow authenticated users to delete their own files
-- -----------------------------------------------------
DROP POLICY IF EXISTS "users can delete own certificates" ON storage.objects;

CREATE POLICY "users can delete own certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND owner = auth.uid()
);

COMMIT;
