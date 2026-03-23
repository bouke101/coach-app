import { setupDatabase, resetDb, getDb } from '../db/database'
import { createMatch, getMatches, getMatchById, getMatchPlayersByMatchId, finishMatch } from '../db/matches'

describe('migration 4', () => {
  beforeEach(async () => { resetDb(); await setupDatabase() })

  it('adds timer_direction column to matches', async () => {
    const db = await getDb()
    const rows = await db.getAllAsync<{ timer_direction: string }>(
      "SELECT timer_direction FROM matches LIMIT 1"
    )
    expect(rows).toBeDefined()
  })

  it('creates match_events table', async () => {
    const db = await getDb()
    const rows = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='match_events'")
    expect(rows).toHaveLength(1)
  })
})

beforeEach(async () => {
  resetDb()
  await setupDatabase()
})

const sampleMatch = {
  opponent: 'FC Riviera',
  venue: 'home' as const,
  game_type: '8v8' as const,
  half_duration: 25,
  formation: '1-3-2-2',
  timer_direction: 'up' as const,
  starters: [] as { player_id: string; position: string }[],
  bench: [] as { player_id: string }[],
}

describe('createMatch', () => {
  it('returns a match with an id and created_at', async () => {
    const match = await createMatch(sampleMatch)
    expect(match.id).toBeTruthy()
    expect(match.opponent).toBe('FC Riviera')
    expect(match.status).toBe('in_progress')
    expect(match.created_at).toBeTruthy()
  })

  it('saves starters and bench players to match_players', async () => {
    const db = await getDb()
    const playerId = 'test-player-1'
    const created_at = new Date().toISOString()
    await db.runAsync(
      'INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)',
      [playerId, 'Test Player', 7, created_at]
    )

    const match = await createMatch({
      ...sampleMatch,
      starters: [{ player_id: playerId, position: 'ST' }],
      bench: [],
    })

    const matchPlayers = await db.getAllAsync<{ player_id: string; role: string; position: string }>(
      'SELECT player_id, role, position FROM match_players WHERE match_id = ?',
      [match.id]
    )
    expect(matchPlayers).toHaveLength(1)
    expect(matchPlayers[0].player_id).toBe(playerId)
    expect(matchPlayers[0].role).toBe('starter')
    expect(matchPlayers[0].position).toBe('ST')
  })
})

describe('getMatches', () => {
  it('returns an empty array when no matches exist', async () => {
    const matches = await getMatches()
    expect(matches).toEqual([])
  })

  it('returns created matches newest first', async () => {
    await createMatch({ ...sampleMatch, opponent: 'Ajax Youth' })
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1))
    await createMatch({ ...sampleMatch, opponent: 'FC Riviera' })
    const matches = await getMatches()
    expect(matches[0].opponent).toBe('FC Riviera')
    expect(matches[1].opponent).toBe('Ajax Youth')
  })
})

describe('getMatchById', () => {
  it('returns null for unknown id', async () => {
    const result = await getMatchById('nonexistent')
    expect(result).toBeNull()
  })

  it('returns the match for a known id', async () => {
    const created = await createMatch(sampleMatch)
    const found = await getMatchById(created.id)
    expect(found?.opponent).toBe('FC Riviera')
  })
})

describe('getMatchPlayersByMatchId', () => {
  it('returns starters for a match', async () => {
    const db = await getDb()
    const playerId = 'player-mp-1'
    await db.runAsync('INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)',
      [playerId, 'Test', 9, new Date().toISOString()])
    const match = await createMatch({ ...sampleMatch, starters: [{ player_id: playerId, position: 'ST' }] })
    const mps = await getMatchPlayersByMatchId(match.id)
    expect(mps).toHaveLength(1)
    expect(mps[0].role).toBe('starter')
    expect(mps[0].position).toBe('ST')
  })
})

describe('finishMatch', () => {
  it('sets status to finished', async () => {
    const match = await createMatch(sampleMatch)
    await finishMatch(match.id)
    const updated = await getMatchById(match.id)
    expect(updated?.status).toBe('finished')
  })
})
