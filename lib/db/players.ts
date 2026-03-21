import * as Crypto from 'expo-crypto'
import { getDb } from './database'

export interface Player {
  id: string
  name: string
  number: number | null
  created_at: string
}

export async function getPlayers(): Promise<Player[]> {
  const db = await getDb()
  // (number IS NULL) evaluates to 0 for non-null rows (sort first) and 1 for null rows (sort last)
  return db.getAllAsync<Player>(
    'SELECT * FROM players ORDER BY (number IS NULL) ASC, number ASC, name ASC'
  )
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const db = await getDb()
  return db.getFirstAsync<Player>('SELECT * FROM players WHERE id = ?', [id]) ?? null
}

export async function createPlayer(data: {
  name: string
  number: number | null
}): Promise<Player> {
  const db = await getDb()
  const id = Crypto.randomUUID()
  const created_at = new Date().toISOString()
  await db.runAsync(
    'INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)',
    [id, data.name.trim(), data.number, created_at]
  )
  return { id, name: data.name.trim(), number: data.number, created_at }
}

export async function updatePlayer(
  id: string,
  data: { name: string; number: number | null }
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'UPDATE players SET name = ?, number = ? WHERE id = ?',
    [data.name.trim(), data.number, id]
  )
}

export async function deletePlayer(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM players WHERE id = ?', [id])
}
