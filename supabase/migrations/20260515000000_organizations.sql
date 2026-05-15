-- Organizations (multi-tenant workspaces)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org members
CREATE TABLE IF NOT EXISTS org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
