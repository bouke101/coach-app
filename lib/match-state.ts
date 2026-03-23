import type { MatchPlayer } from './db/matches'
import type { MatchEvent } from './db/match-events'

export interface LiveState {
  assignments: Record<string, string>  // position → playerId
  benchPlayerIds: string[]
}

export function buildLiveState(matchPlayers: MatchPlayer[], events: MatchEvent[]): LiveState {
  const assignments: Record<string, string> = {}
  const benchSet = new Set<string>()

  for (const mp of matchPlayers) {
    if (mp.role === 'starter' && mp.position) {
      assignments[mp.position] = mp.player_id
    } else if (mp.role === 'bench') {
      benchSet.add(mp.player_id)
    }
  }

  for (const event of events) {
    if (event.type === 'substitution' && event.player_id && event.player_off_id && event.position) {
      assignments[event.position] = event.player_id
      benchSet.delete(event.player_id)
      benchSet.add(event.player_off_id)
    } else if (event.type === 'position_swap' && event.player_id && event.player_off_id && event.position) {
      // event.position = player_id's new position (= player_off_id's old position)
      const newPosForA = event.position
      const newPosForB = Object.keys(assignments).find(k => assignments[k] === event.player_id)
      if (newPosForB) {
        assignments[newPosForA] = event.player_id
        assignments[newPosForB] = event.player_off_id
      }
    }
  }

  return { assignments, benchPlayerIds: Array.from(benchSet) }
}

export interface TimerState {
  half: 1 | 2 | 'halftime' | 'finished'
  elapsed: number   // seconds elapsed in current half (always counts up, 0 = start of half)
  running: false    // always false on reconstruction — coach must tap Resume
}

export function reconstructTimer(events: MatchEvent[], halfDurationMinutes: number): TimerState {
  const halfDurationSecs = halfDurationMinutes * 60

  if (events.some(e => e.type === 'match_end')) {
    return { half: 'finished', elapsed: halfDurationSecs, running: false }
  }

  const secondHalfStartIdx = events.findIndex(e => e.type === 'second_half_start')
  if (secondHalfStartIdx !== -1) {
    const secondHalfEvents = events.slice(secondHalfStartIdx + 1)
    const elapsed = secondHalfEvents.length > 0
      ? Math.max(...secondHalfEvents.map(e => e.match_time))
      : 0
    return { half: 2, elapsed, running: false }
  }

  if (events.some(e => e.type === 'half_time')) {
    return { half: 'halftime', elapsed: halfDurationSecs, running: false }
  }

  const elapsed = events.length > 0 ? Math.max(...events.map(e => e.match_time)) : 0
  return { half: 1, elapsed, running: false }
}
