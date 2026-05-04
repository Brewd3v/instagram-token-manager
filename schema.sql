CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY,
  instagram_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  access_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  last_refreshed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
