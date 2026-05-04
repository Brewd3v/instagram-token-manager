import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export interface TokenRow {
  id: number;
  instagram_user_id: string;
  username: string | null;
  access_token: string;
  expires_at: number;
  last_refreshed_at: number | null;
  created_at: number;
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DB_PATH ?? '/data/tokens.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const schema = fs.readFileSync(
    path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'schema.sql'),
    'utf8'
  );
  db.exec(schema);

  return db;
}

export function getStoredToken(): TokenRow | null {
  const row = getDb()
    .prepare('SELECT * FROM tokens ORDER BY created_at DESC LIMIT 1')
    .get() as TokenRow | undefined;
  return row ?? null;
}

export function upsertToken(
  userId: string,
  username: string | null,
  accessToken: string,
  expiresAt: number,
  lastRefreshedAt: number
): void {
  getDb()
    .prepare(
      `INSERT INTO tokens (instagram_user_id, username, access_token, expires_at, last_refreshed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(instagram_user_id) DO UPDATE SET
         username = excluded.username,
         access_token = excluded.access_token,
         expires_at = excluded.expires_at,
         last_refreshed_at = excluded.last_refreshed_at`
    )
    .run(userId, username, accessToken, expiresAt, lastRefreshedAt);
}

export function updateToken(id: number, accessToken: string, expiresAt: number, lastRefreshedAt: number): void {
  getDb()
    .prepare('UPDATE tokens SET access_token = ?, expires_at = ?, last_refreshed_at = ? WHERE id = ?')
    .run(accessToken, expiresAt, lastRefreshedAt, id);
}

export function deleteAllTokens(): void {
  getDb().prepare('DELETE FROM tokens').run();
}

export function getAllTokens(): TokenRow[] {
  return getDb().prepare('SELECT * FROM tokens').all() as TokenRow[];
}
