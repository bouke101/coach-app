import { setupDatabase, resetDb } from '../db/database'
import { createMatch, getMatches, getMatchById } from '../db/matches'

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
