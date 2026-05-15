-- ============================================================
-- Manager Dashboard — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Backlog',
  priority     TEXT NOT NULL DEFAULT '',
  module       TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  date_start   DATE,
  date_end     DATE,
  modified_by  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM
CREATE TABLE IF NOT EXISTS crm (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseigne       TEXT NOT NULL DEFAULT '',
  contact        TEXT NOT NULL DEFAULT '',
  email          TEXT,
  phone          TEXT,
  ville          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'À contacter',
  canal          TEXT NOT NULL DEFAULT '',
  type           TEXT NOT NULL DEFAULT '',
  priority       TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  last_contact   DATE,
  next_followup  DATE,
  modified_by    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ideas
CREATE TABLE IF NOT EXISTS ideas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Brute',
  category     TEXT NOT NULL DEFAULT '',
  effort       TEXT NOT NULL DEFAULT '',
  votes        INTEGER NOT NULL DEFAULT 0,
  modified_by  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL DEFAULT '',
  date_start   TIMESTAMPTZ,
  date_end     TIMESTAMPTZ,
  type         TEXT NOT NULL DEFAULT 'Autre',
  description  TEXT NOT NULL DEFAULT '',
  modified_by  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message    TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'info',
  lu         BOOLEAN NOT NULL DEFAULT false,
  de         TEXT NOT NULL DEFAULT '',
  pour       TEXT NOT NULL DEFAULT 'Tous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presence + user settings (merged)
CREATE TABLE IF NOT EXISTS presence (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          TEXT NOT NULL UNIQUE,
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_name      TEXT,
  password_override TEXT
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author        TEXT NOT NULL,
  message       TEXT NOT NULL,
  destinataire  TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes (personal, per user)
CREATE TABLE IF NOT EXISTS notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre        TEXT NOT NULL DEFAULT 'Sans titre',
  contenu      TEXT NOT NULL DEFAULT '',
  utilisateur  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time sessions
CREATE TABLE IF NOT EXISTS time_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur  TEXT NOT NULL,
  categorie    TEXT NOT NULL DEFAULT 'Travail',
  debut        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin          TIMESTAMPTZ,
  duree        INTEGER,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_created  ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifs_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user    ON notes(utilisateur);
CREATE INDEX IF NOT EXISTS idx_time_user     ON time_sessions(utilisateur, debut DESC);
CREATE INDEX IF NOT EXISTS idx_presence_user ON presence(username);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at   BEFORE UPDATE ON tasks   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER crm_updated_at     BEFORE UPDATE ON crm     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ideas_updated_at   BEFORE UPDATE ON ideas   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at  BEFORE UPDATE ON events  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated_at   BEFORE UPDATE ON notes   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Disable RLS (server-side only access via service_role) ──
ALTER TABLE tasks          DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm            DISABLE ROW LEVEL SECURITY;
ALTER TABLE ideas          DISABLE ROW LEVEL SECURITY;
ALTER TABLE events         DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  DISABLE ROW LEVEL SECURITY;
ALTER TABLE presence       DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions  DISABLE ROW LEVEL SECURITY;
