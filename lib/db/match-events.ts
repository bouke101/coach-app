import * as Crypto from 'expo-crypto'
import { getDb } from './database'

export interface MatchEvent {
  id: string
  match_id: string
  type: 'goal' | 'substitution' | 'position_swap' | 'half_time' | 'second_half_start' | 'match_end'
  match_time: number
  player_id: string | null
  player_off_id: string | null
  position: string | null
  team: 'our_team' | 'opponent' | null
  created_at: string
}

type CreateMatchEventInput = Omit<MatchEvent, 'id' | 'created_at'>

export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const db = await getDb()
  return db.getAllAsync<MatchEvent>(
    'SELECT * FROM match_events WHERE match_id = ? ORDER BY match_time ASC, created_at ASC',
    [matchId]
  )
}

export async function createMatchEvent(data: CreateMatchEventInput): Promise<MatchEvent> {
  const db = await getDb()
  const id = Crypto.randomUUID()
  const created_at = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO match_events (id, match_id, type, match_time, player_id, player_off_id, position, team, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.match_id, data.type, data.match_time, data.player_id ?? null, data.player_off_id ?? null, data.position ?? null, data.team ?? null, created_at]
  )
  return { id, ...data, created_at }
}
