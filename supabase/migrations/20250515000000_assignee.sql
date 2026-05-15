-- Add assignee column to tasks, crm, and ideas tables
ALTER TABLE tasks  ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT '';
ALTER TABLE crm    ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT '';
ALTER TABLE ideas  ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT '';
