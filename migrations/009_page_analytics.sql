-- Page visit analytics — tracks which pages users visit and time spent
CREATE TABLE IF NOT EXISTS _page_analytics (
  id           bigserial PRIMARY KEY,
  page         text        NOT NULL,
  username     text,
  org_id       text,
  duration_sec int         NOT NULL DEFAULT 0,
  visited_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS _page_analytics_page_idx ON _page_analytics(page);
CREATE INDEX IF NOT EXISTS _page_analytics_visited_idx ON _page_analytics(visited_at DESC);

ALTER TABLE _page_analytics DISABLE ROW LEVEL SECURITY;
