# Live Match — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

This update replaces the placeholder live match screen with a fully functional match management screen. Coaches can run the match clock, log goals, record substitutions and position swaps, and track player time — all in real time from the sideline.

---

## Scope

**In scope:**
- Match timer with count-up / count-down mode, pause/resume
- Automatic halftime detection and second-half start
- Live pitch view with tap-to-select substitution / position swap
- Bench tiles with individual waiting timers
- Goal logging (our team or opponent, scorer picker)
- Stats tab: goals table, player time list with expandable horizontal timeline
- Match end flow (status → finished)
- Timer direction field added to new-match form
- Read-only stats view when opening a finished match

**Out of scope:**
- Match editing after completion
- Cloud sync
- Push notifications
- Absent player tracking in match_players (noted gap from sub-project 2)

---

## User Flow

1. Coach taps a match in the matches list (or lands here after "Start Match") → **Live Match screen**
2. If match is `finished`: screen opens in read-only stats mode (no timer, no goal button). Only "Back to Matches" shown.
3. If match is `in_progress`: timer state is reconstructed from events (see Timer Behaviour). Timer starts paused; coach taps Resume to start.
4. Coach taps **＋ Goal** → picks our team / opponent → picks scorer → goal logged.
5. Coach taps a player on pitch → taps a bench player → substitution recorded.
6. Coach taps two pitch players → position swap recorded.
7. At `half_duration` minutes, timer auto-pauses → header shows break timer + "Start 2nd Half" button.
8. Coach taps **Start 2nd Half** → clock resets, second half begins.
9. At `half_duration` minutes again, timer auto-pauses → "End Match" button appears.
10. Coach taps **End Match** → `match_end` event inserted, match status set to `finished` → screen enters read-only state.

---

## Screen Structure

### Fixed Header (dark bar)
Three columns, always visible in active match:
- **Left:** current half label ("1st Half" / "2nd Half") + score (e.g. "2 – 1")
- **Centre:** large green ＋ Goal button
- **Right:** match time (MM:SS) + Pause/Resume button

Special header states:
- **Halftime:** left shows "Half Time" + break timer (counting up); centre shows "Start 2nd Half" button; right shows break timer controls (pause/resume break). Goal button hidden.
- **Finished (read-only):** entire header is hidden; only a "Back to Matches" button is shown at the top.

### Tab Bar (bottom)
Two tabs: **Pitch** | **Stats**

Default tab: Pitch (for in-progress), Stats (for finished).

### Pitch Tab
- Live pitch view: circles per current starter at their current position. Read-only render — no drag-and-drop. Uses `PitchView` component (already exists) with `hoveredSlotId=null` and `onSlotLayout={() => {}}` (no-op — slot layout measurement is not needed in live view).
- **Selection:** tapping a player circle selects it (blue ring). Tap a second player to trigger sub/swap. Tap selected player again or any neutral area to deselect.
- Tap order for substitution does not matter: either pitch-first or bench-first resolves correctly.
- **Bench section** below pitch: tiles showing player name + shirt number + waiting timer (amber). All players in `match_players` with role `bench` (or moved to bench via substitution) are shown. "Absent" in live-match context means not present in `match_players` at all — no absent handling needed on this screen.

### Stats Tab
**Goals section:**
- Table with three columns: Our team (scorer name + minute) | Running Score | Opponent (minute only)
- Each row represents one goal; running score shows cumulative score after that goal
- Our team goals aligned left, opponent goals aligned right

**Player Time section:**
- One row per player who appears in `match_players`
- Collapsed: player name + shirt number + badge(es): green badge per pitch segment (position + duration), amber badge for current bench wait if on bench
- Expanded (tap to toggle): horizontally scrollable tile row — one tile per time segment in chronological order. Green tile = on-pitch (position, duration, time range e.g. "0:00 → 6:10"). Amber tile = bench (duration, time range). Connector label between tiles shows "→ off for [name]" or "→ on for [name]". Below timeline: "Total pitch time: MM:SS"

---

## Timer Behaviour

- Timer state lives entirely in **React state + setInterval** — not persisted to DB.
- `half_duration` is stored in **minutes** in the DB. All timer comparisons use **seconds**: threshold = `half_duration * 60`.
- Count-up: starts at 0, increments each second. Auto-pauses when `elapsed >= half_duration * 60`.
- Count-down: starts at `half_duration * 60`, decrements each second. Auto-pauses when `elapsed <= 0`.

**Reconstruction on mount (or app restart):**
After a restart the timer is always reconstructed in a **paused state**. The coach must tap Resume to continue. Reconstruction logic:
1. Read all `match_events` for the match, ordered by `match_time ASC`.
2. If `match_end` event exists → match is finished; read-only mode.
3. Else if `second_half_start` event exists → currently in 2nd half. `elapsed` = the `match_time` of the most recent event after `second_half_start`, or 0 if none. `half = 2`.
4. Else if `half_time` event exists but no `second_half_start` → app was closed during halftime break. `elapsed = half_duration * 60`, `half = 'halftime'`, `running = false`. Show "Start 2nd Half" button.
5. Else → currently in 1st half. `elapsed` = the `match_time` of the most recent event, or 0 if no events. `half = 1`.
6. Break elapsed is always 0 on restart (halftime break duration is not tracked after restart).

**Events logged for timer milestones:**
- First half auto-pause (halftime): insert `match_events` row `{ type: 'half_time', match_time: elapsed }`.
- Coach taps "Start 2nd Half": insert `{ type: 'second_half_start', match_time: 0 }`. Reset `elapsed` to 0.
- Coach taps "End Match": insert `{ type: 'match_end', match_time: elapsed }`, then call `finishMatch(matchId)`.

**Bench timers:**
- Each bench player's waiting time is derived from events: find the substitution event that sent them to bench, read its `match_time`, compute `currentElapsed - benchStartMatchTime` (clamped to 0).
- After a restart, bench timers are also reconstructed from events and start paused. They resume when the coach taps Resume.

---

## Substitutions & Position Swaps

**Selection model:**
- `selectedPlayerId: string | null` in state
- Tap any player (pitch or bench, either order) → if none selected, set as selected (blue ring). If one already selected and the same player tapped → deselect. If different player tapped → resolve pair.

**Pair resolution:**
- One currently-on-pitch player + one currently-on-bench player → **substitution**: bench player takes pitch player's position on the pitch, pitch player moves to bench.
- Two currently-on-pitch players → **position swap**: the two players exchange positions.

**Persistence — substitution:**
Insert one `match_events` row:
```
{ type: 'substitution', match_time, player_id: incomingId, player_off_id: outgoingId, position: outgoingPlayer's current position }
```

**Persistence — position swap:**
Use a dedicated event type `position_swap` (added to the CHECK constraint) to avoid ambiguity during event replay:
```
{ type: 'position_swap', match_time, player_id: playerAId, player_off_id: playerBId, position: playerA's new position (= playerB's old position) }
```
During replay, `position_swap` swaps the two players' positions without affecting bench status.

**Local state update after sub/swap:**
Update `assignments` and `benchPlayerIds` in React state immediately — do not reload from DB.

---

## Goal Logging

Tapping ＋ Goal opens a modal:
1. **Team picker:** two large buttons — "Our Team" / "Opponent"
2. If "Our Team": **Scorer picker** — scrollable list of all players in `match_players` for this match (both currently on pitch and on bench) + "Unknown" option at the top
3. Confirm → insert `match_events` row:
   - Our team goal: `{ type: 'goal', match_time, player_id: selectedId or null, team: 'our_team' }`
   - Opponent goal: `{ type: 'goal', match_time, player_id: null, team: 'opponent' }`
4. Score in header updates immediately from local events state

**Score computation:** `ourScore = events.filter(e => e.type === 'goal' && e.team === 'our_team').length`, likewise for opponent. No dependency on `venue`.

The `team` column CHECK constraint uses `'our_team'` and `'opponent'` (not `'home'`/`'away'`) to avoid venue-dependent interpretation logic.

---

## Data Model

### Migration 4

```sql
ALTER TABLE matches ADD COLUMN timer_direction TEXT NOT NULL DEFAULT 'up';

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
);
```

### New DB functions (`lib/db/match-events.ts`)
- `getMatchEvents(matchId): Promise<MatchEvent[]>` — all events for a match, ordered by `match_time ASC, created_at ASC`
- `createMatchEvent(data): Promise<MatchEvent>` — insert one event

### Updated `lib/db/matches.ts`
- `finishMatch(matchId): Promise<void>` — `UPDATE matches SET status = 'finished' WHERE id = ?`
- `CreateMatchInput` interface — add `timer_direction: 'up' | 'down'`
- `Match` interface — add `timer_direction: 'up' | 'down'`
- `createMatch` function — include `timer_direction` in the INSERT statement and the returned object

### Seeding live state from `match_players`

On mount, `match_players` is loaded to seed the initial pitch assignments and bench list:
- `match_players` rows with `role = 'starter'` seed `assignments`: `{ [row.position]: row.player_id }` — the position string (e.g. `"GK"`, `"CB"`) is used as the key directly.
- `match_players` rows with `role = 'bench'` seed `benchPlayerIds`.
- `match_events` of type `substitution` and `position_swap` are then replayed in order to bring the state up to the most recent known lineup.

> Note: The live-match screen uses position strings (e.g. `"GK"`) as assignment keys — not formation slot IDs. The `PitchView` component receives slots from `getSlots(gameType, formation)` and matches them by `slot.position === key`.

---

## New-Match Form Update (`app/new-match.tsx`)

Add **Timer Direction** segmented control (Count Up / Count Down), default Count Up. Value: `'up'` or `'down'`.

Data flow:
1. `new-match.tsx` passes `timer_direction` as a route param to `match-formation.tsx`
2. `match-formation.tsx` — update `useLocalSearchParams` type to include `timer_direction: string`, pass it to `createMatch`
3. `CreateMatchInput` interface — add `timer_direction: 'up' | 'down'`
4. `createMatch` function — include `timer_direction` in the INSERT statement

---

## Component Breakdown

| Component | File | Purpose |
|---|---|---|
| `MatchHeader` | `components/MatchHeader.tsx` | Dark 3-column header (score, goal button, timer+controls) with halftime/finished states |
| `BenchTiles` | `components/BenchTiles.tsx` | Wrapping tile grid of bench players with live waiting timers |
| `GoalModal` | `components/GoalModal.tsx` | Two-step modal: team picker → scorer picker |
| `StatsGoals` | `components/StatsGoals.tsx` | Goals table with running score |
| `StatsPlayerTime` | `components/StatsPlayerTime.tsx` | Player time list with expandable horizontal tile timeline |

`app/live-match.tsx` is the orchestrator: loads match + players + matchPlayers + events from DB, manages timer interval, holds selection and assignment state, renders header + tabs + modals.

---

## State Shape (`app/live-match.tsx`)

```typescript
// Loaded from DB on mount
match: Match                          // includes timer_direction
allPlayers: Player[]                  // all squad players (for scorer picker)
matchPlayers: MatchPlayer[]           // initial starters/bench from match setup
events: MatchEvent[]                  // grows as coach logs things (append locally)

// Derived live state (seeded from matchPlayers, updated by events)
assignments: Record<string, string>   // position string → playerId (current pitch)
benchPlayerIds: string[]              // playerIds currently on bench

// Timer
half: 1 | 2 | 'halftime' | 'finished'
elapsed: number                       // seconds in current half
running: boolean                      // whether timer is ticking
breakElapsed: number                  // seconds since halftime started (resets on restart)

// UI
selectedPlayerId: string | null
activeTab: 'pitch' | 'stats'
goalModalVisible: boolean
expandedPlayerId: string | null       // for stats player timeline
```

---

## Navigation

- `app/(tabs)/matches/index.tsx` already routes any match (regardless of status) to `/live-match?id=...` via `router.push`.
- `live-match.tsx` is declared as `presentation: 'fullScreenModal'` in `_layout.tsx`.
- **Back to Matches:** always use `router.dismissAll()`. This works whether the screen was opened from the new-match flow (3 modals stacked) or directly from the matches list (1 modal).
- **"Back to Formation" button** (currently in the placeholder): **removed** from the production live-match screen. Formation is locked once the match starts.
- After "End Match": screen transitions to finished/read-only state in-place — no navigation occurs until the coach taps "Back to Matches".

---

## Out of Scope / Future

- Editing or deleting logged events
- Referee mode
- Live sharing
- Absent player tracking in `match_players` (noted gap in sub-project 2 spec — add `absent` role in future)
- Halftime break duration persistence (break timer resets to 0 after app restart)
