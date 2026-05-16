-- Daily infrastructure metric snapshots (DB-level stats, no external tokens needed)
CREATE TABLE IF NOT EXISTS _infra_metrics (
  id          bigserial PRIMARY KEY,
  metric      text        NOT NULL,
  value       numeric     NOT NULL,
  captured_at date        NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(metric, captured_at)
);

-- Allow service role full access (no RLS needed — this is internal telemetry)
ALTER TABLE _infra_metrics DISABLE ROW LEVEL SECURITY;
