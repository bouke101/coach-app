import { buildLiveState, reconstructTimer } from '../match-state'
import type { MatchPlayer } from '../db/matches'
import type { MatchEvent } from '../db/match-events'

const makePlayer = (id: string, role: 'starter' | 'bench', position: string | null = null): MatchPlayer => ({
  id: `mp-${id}`, match_id: 'match-1', player_id: id, role, position, created_at: '',
})

const makeEvent = (type: MatchEvent['type'], match_time: number, extra: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `evt-${match_time}-${type}`, match_id: 'match-1', type, match_time,
  player_id: null, player_off_id: null, position: null, team: null, created_at: '',
  ...extra,
})

describe('buildLiveState', () => {
  it('seeds assignments and bench from matchPlayers with no events', () => {
    const mps = [
      makePlayer('p1', 'starter', 'GK'),
      makePlayer('p2', 'starter', 'CB'),
      makePlayer('p3', 'bench'),
    ]
    const state = buildLiveState(mps, [])
    expect(state.assignments['GK']).toBe('p1')
    expect(state.assignments['CB']).toBe('p2')
    expect(state.benchPlayerIds).toContain('p3')
  })

  it('applies a substitution event', () => {
    const mps = [makePlayer('p1', 'starter', 'ST'), makePlayer('p2', 'bench')]
    const events = [makeEvent('substitution', 600, { player_id: 'p2', player_off_id: 'p1', position: 'ST' })]
    const state = buildLiveState(mps, events)
    expect(state.assignments['ST']).toBe('p2')
    expect(state.benchPlayerIds).toContain('p1')
    expect(state.benchPlayerIds).not.toContain('p2')
  })

  it('applies a position_swap event', () => {
    const mps = [makePlayer('p1', 'starter', 'LW'), makePlayer('p2', 'starter', 'RW')]
    const events = [makeEvent('position_swap', 300, { player_id: 'p1', player_off_id: 'p2', position: 'RW' })]
    const state = buildLiveState(mps, events)
    expect(state.assignments['RW']).toBe('p1')
    expect(state.assignments['LW']).toBe('p2')
    expect(state.benchPlayerIds).toHaveLength(0)
  })
})

describe('reconstructTimer', () => {
  it('returns half=1, elapsed=0 with no events', () => {
    const t = reconstructTimer([], 25)
    expect(t.half).toBe(1)
    expect(t.elapsed).toBe(0)
    expect(t.running).toBe(false)
  })

  it('returns elapsed from last event in first half', () => {
    const events = [makeEvent('goal', 600), makeEvent('goal', 900)]
    const t = reconstructTimer(events, 25)
    expect(t.half).toBe(1)
    expect(t.elapsed).toBe(900)
  })

  it('returns half=halftime when half_time event exists without second_half_start', () => {
    const events = [makeEvent('half_time', 1500)]
    const t = reconstructTimer(events, 25)
    expect(t.half).toBe('halftime')
    expect(t.elapsed).toBe(1500) // half_duration * 60
  })

  it('returns half=2 when second_half_start exists', () => {
    const events = [makeEvent('half_time', 1500), makeEvent('second_half_start', 0), makeEvent('goal', 300)]
    const t = reconstructTimer(events, 25)
    expect(t.half).toBe(2)
    expect(t.elapsed).toBe(300)
  })

  it('returns half=finished when match_end exists', () => {
    const events = [makeEvent('match_end', 1500)]
    const t = reconstructTimer(events, 25)
    expect(t.half).toBe('finished')
  })
})
