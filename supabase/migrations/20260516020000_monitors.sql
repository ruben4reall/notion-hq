CREATE TABLE IF NOT EXISTS monitors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'http',
  keyword TEXT,
  interval_min INTEGER DEFAULT 5,
  enabled BOOLEAN DEFAULT true,
  notify_on_down BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_pings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id uuid REFERENCES monitors(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL,
  response_ms INTEGER,
  status_code INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS monitor_pings_monitor_id_checked_at ON monitor_pings(monitor_id, checked_at DESC);

INSERT INTO monitors (name, url, type, interval_min) VALUES
  ('Manager Dashboard', 'https://manager-thenextbigthing.vercel.app', 'http', 5),
  ('Supabase API', 'https://yehrlfuonctonjsneawh.supabase.co/rest/v1/', 'http', 5),
  ('Supabase Auth', 'https://yehrlfuonctonjsneawh.supabase.co/auth/v1/health', 'http', 5)
ON CONFLICT DO NOTHING;
