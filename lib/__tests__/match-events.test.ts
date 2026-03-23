import { setupDatabase, resetDb, getDb } from '../db/database'
import { createMatch } from '../db/matches'
import { createMatchEvent, getMatchEvents } from '../db/match-events'

const sampleMatch = {
  opponent: 'FC Test', venue: 'home' as const, game_type: '8v8' as const,
  half_duration: 25, formation: '1-3-2-2', timer_direction: 'up' as const,
  starters: [], bench: [],
}

beforeEach(async () => { resetDb(); await setupDatabase() })

describe('createMatchEvent', () => {
  it('inserts a goal event and returns it', async () => {
    const match = await createMatch(sampleMatch)
    const event = await createMatchEvent({
      match_id: match.id, type: 'goal', match_time: 600,
      player_id: null, player_off_id: null, position: null, team: 'our_team',
    })
    expect(event.id).toBeTruthy()
    expect(event.type).toBe('goal')
    expect(event.team).toBe('our_team')
  })

  it('inserts a substitution event', async () => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.runAsync('INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)', ['player-a', 'Player A', 1, now])
    await db.runAsync('INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)', ['player-b', 'Player B', 2, now])
    const match = await createMatch(sampleMatch)
    const event = await createMatchEvent({
      match_id: match.id, type: 'substitution', match_time: 900,
      player_id: 'player-a', player_off_id: 'player-b', position: 'CB', team: null,
    })
    expect(event.player_id).toBe('player-a')
    expect(event.player_off_id).toBe('player-b')
  })
})

describe('getMatchEvents', () => {
  it('returns events ordered by match_time ASC', async () => {
    const match = await createMatch(sampleMatch)
    await createMatchEvent({ match_id: match.id, type: 'goal', match_time: 900, player_id: null, player_off_id: null, position: null, team: 'our_team' })
    await createMatchEvent({ match_id: match.id, type: 'goal', match_time: 300, player_id: null, player_off_id: null, position: null, team: 'opponent' })
    const events = await getMatchEvents(match.id)
    expect(events[0].match_time).toBe(300)
    expect(events[1].match_time).toBe(900)
  })

  it('returns empty array when no events', async () => {
    const match = await createMatch(sampleMatch)
    expect(await getMatchEvents(match.id)).toEqual([])
  })
})
