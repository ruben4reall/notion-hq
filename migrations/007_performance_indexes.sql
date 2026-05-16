-- Composite indexes for common filtered queries
-- tasks: most queries filter by org_id + status or assigned_to or date
CREATE INDEX IF NOT EXISTS idx_tasks_org_status     ON tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_assigned   ON tasks(org_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_org_date_end   ON tasks(org_id, date_end) WHERE date_end IS NOT NULL;

-- crm: filter by org_id + status or assigned_to
CREATE INDEX IF NOT EXISTS idx_crm_org_status       ON crm(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_org_assigned     ON crm(org_id, assigned_to);

-- ideas: filter by org_id + status
CREATE INDEX IF NOT EXISTS idx_ideas_org_status     ON ideas(org_id, status);

-- time_sessions: active session lookup (fin IS NULL) and history by user
CREATE INDEX IF NOT EXISTS idx_time_sessions_active ON time_sessions(org_id, utilisateur, fin) WHERE fin IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_sessions_hist   ON time_sessions(org_id, utilisateur, debut DESC);

-- notes: lookup by utilisateur within org
CREATE INDEX IF NOT EXISTS idx_notes_utilisateur    ON notes(utilisateur);

-- notifications: lookup by recipient (pour field)
CREATE INDEX IF NOT EXISTS idx_notifications_pour   ON notifications(pour, lu);

-- presence: already has unique index on username, no change needed

-- project_invitations: lookup by email + status for pending check
CREATE INDEX IF NOT EXISTS idx_invitations_email    ON project_invitations(invited_email, status);
