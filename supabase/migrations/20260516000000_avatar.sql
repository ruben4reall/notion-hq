-- Add avatar_url to presence table
ALTER TABLE presence ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create public avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY IF NOT EXISTS "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated uploads (service role bypasses RLS anyway)
CREATE POLICY IF NOT EXISTS "Auth upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Auth update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');
