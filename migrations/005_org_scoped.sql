-- Scope all data tables to a project (org_id)
ALTER TABLE tasks         ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm           ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE ideas         ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE events        ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE notes         ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE time_sessions ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS org_id UUID;

CREATE INDEX IF NOT EXISTS idx_tasks_org         ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_org           ON crm(org_id);
CREATE INDEX IF NOT EXISTS idx_ideas_org         ON ideas(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org        ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_notes_org         ON notes(org_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_org ON time_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_org          ON chat_messages(org_id);
