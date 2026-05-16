-- Organizations (projects)
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Project invitations
CREATE TABLE IF NOT EXISTS project_invitations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by     UUID NOT NULL,
  invited_email  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, invited_email)
);

-- Notes shared_with
ALTER TABLE notes ADD COLUMN IF NOT EXISTS shared_with TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_org_members_user  ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org   ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON project_invitations(invited_email, status);

ALTER TABLE organizations        DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_members          DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations  DISABLE ROW LEVEL SECURITY;
