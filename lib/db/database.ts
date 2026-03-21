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
  // Sub-project 2 will append migration 2 here.
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
