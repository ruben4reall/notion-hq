CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID
);

-- Insert first superadmin by email
INSERT INTO platform_admins (user_id)
SELECT id FROM auth.users WHERE email = 'ruben.ctlo@protonmail.com'
ON CONFLICT (user_id) DO NOTHING;
