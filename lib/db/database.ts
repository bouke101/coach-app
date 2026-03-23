import * as SQLite from 'expo-sqlite'

// One migration per sub-project. Never edit existing entries — only append.
const MIGRATIONS: string[] = [
  // Migration 1 — Sub-project 1: initial schema
  `CREATE TABLE IF NOT EXISTS players (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    number     INTEGER,
    created_at TEXT NOT NULL
  );`,
  // Migration 2 — Sub-project 2: matches and match_players
  `CREATE TABLE IF NOT EXISTS matches (
    id            TEXT PRIMARY KEY,
    opponent      TEXT NOT NULL,
    venue         TEXT NOT NULL CHECK(venue IN ('home', 'away')),
    game_type     TEXT NOT NULL CHECK(game_type IN ('6v6', '8v8', '11v11')),
    half_duration INTEGER NOT NULL,
    formation     TEXT NOT NULL,
    status        TEXT NOT NULL CHECK(status IN ('in_progress', 'finished')),
    created_at    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS match_players (
    id         TEXT PRIMARY KEY,
    match_id   TEXT NOT NULL REFERENCES matches(id),
    player_id  TEXT NOT NULL REFERENCES players(id),
    role       TEXT NOT NULL CHECK(role IN ('starter', 'bench')),
    position   TEXT,
    created_at TEXT NOT NULL
  );`,
  // Migration 3 — Sub-project 3: settings key-value store (team name etc.)
  `CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  // Migration 4 — Sub-project 3: timer_direction on matches + match_events table
  `ALTER TABLE matches ADD COLUMN timer_direction TEXT NOT NULL DEFAULT 'up';
  CREATE TABLE IF NOT EXISTS match_events (
    id            TEXT PRIMARY KEY,
    match_id      TEXT NOT NULL REFERENCES matches(id),
    type          TEXT NOT NULL CHECK(type IN ('goal','substitution','position_swap','half_time','second_half_start','match_end')),
    match_time    INTEGER NOT NULL,
    player_id     TEXT REFERENCES players(id),
    player_off_id TEXT REFERENCES players(id),
    position      TEXT,
    team          TEXT CHECK(team IN ('our_team','opponent')),
    created_at    TEXT NOT NULL
  );`,
]

let _db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('coach.db')
  }
  return _db
}

export async function setupDatabase(): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
  const currentVersion = row?.user_version ?? 0

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i])
    await db.execAsync(`PRAGMA user_version = ${i + 1}`)
  }
}

// For testing only
export function resetDb(): void {
  _db = null
}
