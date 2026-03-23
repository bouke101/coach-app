import * as Crypto from 'expo-crypto'
import { getDb } from './database'

export interface Match {
  id: string
  opponent: string
  venue: 'home' | 'away'
  game_type: '6v6' | '8v8' | '11v11'
  half_duration: number
  formation: string
  status: 'in_progress' | 'finished'
  timer_direction: 'up' | 'down'
  created_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  role: 'starter' | 'bench'
  position: string | null
  created_at: string
}

interface CreateMatchInput {
  opponent: string
  venue: 'home' | 'away'
  game_type: '6v6' | '8v8' | '11v11'
  half_duration: number
  formation: string
  timer_direction: 'up' | 'down'
  starters: { player_id: string; position: string }[]
  bench: { player_id: string }[]
}

export async function getMatches(): Promise<Match[]> {
  const db = await getDb()
  return db.getAllAsync<Match>('SELECT * FROM matches ORDER BY created_at DESC')
}

export async function getMatchById(id: string): Promise<Match | null> {
  const db = await getDb()
  return db.getFirstAsync<Match>('SELECT * FROM matches WHERE id = ?', [id]) ?? null
}

export async function createMatch(data: CreateMatchInput): Promise<Match> {
  const db = await getDb()
  const id = Crypto.randomUUID()
  const created_at = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO matches (id, opponent, venue, game_type, half_duration, formation, status, timer_direction, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.opponent.trim(), data.venue, data.game_type, data.half_duration, data.formation, 'in_progress', data.timer_direction, created_at]
    )
    for (const s of data.starters) {
      await db.runAsync(
        'INSERT INTO match_players (id, match_id, player_id, role, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), id, s.player_id, 'starter', s.position, created_at]
      )
    }
    for (const b of data.bench) {
      await db.runAsync(
        'INSERT INTO match_players (id, match_id, player_id, role, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), id, b.player_id, 'bench', null, created_at]
      )
    }
  })

  return { id, opponent: data.opponent.trim(), venue: data.venue, game_type: data.game_type, half_duration: data.half_duration, formation: data.formation, status: 'in_progress', timer_direction: data.timer_direction, created_at }
}

export async function getMatchPlayersByMatchId(matchId: string): Promise<MatchPlayer[]> {
  const db = await getDb()
  return db.getAllAsync<MatchPlayer>(
    'SELECT * FROM match_players WHERE match_id = ? ORDER BY created_at ASC',
    [matchId]
  )
}

export async function finishMatch(matchId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE matches SET status = ? WHERE id = ?', ['finished', matchId])
}
