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

**Out of scope:**
- Match editing after completion
- Cloud sync
- Push notifications

---

## User Flow

1. Coach taps a match in the matches list (or lands here after "Start Match") → **Live Match screen**
2. Timer starts running. Header shows half, score, time, and pause/resume.
3. Coach taps **＋ Goal** → picks our team / opponent → picks scorer → goal logged.
4. Coach taps a player on pitch → taps a bench player → substitution recorded.
5. Coach taps two pitch players → position swap recorded.
6. At `half_duration`, timer auto-pauses → header shows break timer + "Start 2nd Half" button.
7. Coach taps **Start 2nd Half** → clock resets, second half begins.
8. At `half_duration` again, timer auto-pauses → "End Match" button appears.
9. Coach taps **End Match** → match status set to `finished` → screen shows finished state.

---

## Screen Structure

### Fixed Header (dark bar)
Three columns, always visible:
- **Left:** current half label + score (e.g. "1st Half / 2 – 1")
- **Centre:** large green ＋ Goal button
- **Right:** match time + Pause/Resume button

Special states:
- **Halftime:** centre column shows break timer + "Start 2nd Half" button; Goal button hidden
- **Finished:** centre shows "Match Finished"; Goal/pause hidden

### Tab Bar (bottom)
Two tabs: **Pitch** | **Stats**

### Pitch Tab
- Live pitch view (`PitchView` component, read-only render of current assignments)
- Tapping a player circle selects it (blue highlight ring). Tapping a second player triggers substitution or swap. Tapping same player or neutral area deselects.
- **Bench section** below pitch: tiles (not rows) showing player name, shirt number, waiting timer (yellow countdown). Players who are absent are not shown.

### Stats Tab
**Goals section:**
- Table with three columns: Our team (scorer + minute) | Score | Opponent (minute)
- Each row represents one goal; score column shows the running score after that goal

**Player Time section:**
- One row per player (all players, including bench-only)
- Collapsed: player name + badge(es) showing each segment (green = on pitch with position + duration, yellow = bench + duration)
- Expanded (tap to toggle): horizontal scrollable tile timeline — one tile per segment, left to right in chronological order. Green tiles for pitch segments (position, duration, time range), yellow tiles for bench segments. Connector label between tiles shows who the player replaced or was replaced by.
- Below timeline: "Total pitch time" summary

---

## Timer Behaviour

- Timer state lives entirely in memory (React state + `setInterval`). Not persisted to DB.
- On mount: load match from DB, reconstruct current state from `match_events` (determine current half, elapsed time from half_time / second_half_start events).
- Count-up: starts at 0:00, increments each second.
- Count-down: starts at `half_duration` (in seconds), decrements each second.
- Auto-pause triggers when elapsed time reaches `half_duration`:
  - First half → halftime state
  - Second half → end-of-match state
- Break timer: counts up from 0:00 during halftime, shown in header.
- Bench timers: each bench player has an independent count-up timer (seconds since they last went to bench). Ticks in memory via the same interval.

---

## Substitutions & Position Swaps

**Selection model:**
- `selectedPlayerId: string | null` in state
- Tap player → if none selected, set as selected. If one already selected, process the pair and clear selection.
- Tapping the selected player again clears selection.

**Pair resolution:**
- One pitch + one bench player → **substitution**: bench player takes pitch player's position, pitch player goes to bench. Bench timer for outgoing player starts.
- Two pitch players → **position swap**: positions exchanged in local state. No bench timers affected.

**Persistence:**
- Substitution → insert `match_events` row (type=`substitution`, player_id=incoming, player_off_id=outgoing, position, match_time).
- Position swap → insert `match_events` row (type=`substitution`, player_id=playerA, player_off_id=playerB, position=playerB's old position, match_time) + second row for the other direction. Or a dedicated `position_swap` event type. Use two substitution events for simplicity.

---

## Goal Logging

Tapping ＋ Goal opens a bottom sheet / modal:
1. **Team picker:** two large buttons — "Our Team" / "Opponent"
2. If "Our Team": **Scorer picker** — list of current pitch players + "Unknown" option
3. Confirm → insert `match_events` row (type=`goal`, team=`home`/`away`, player_id or null, match_time)
4. Score in header updates immediately from local events state

---

## Data Model

### Migration 4

```sql
ALTER TABLE matches ADD COLUMN timer_direction TEXT NOT NULL DEFAULT 'up';

CREATE TABLE IF NOT EXISTS match_events (
  id            TEXT PRIMARY KEY,
  match_id      TEXT NOT NULL REFERENCES matches(id),
  type          TEXT NOT NULL CHECK(type IN ('goal','substitution','half_time','second_half_start','match_end')),
  match_time    INTEGER NOT NULL,
  player_id     TEXT REFERENCES players(id),
  player_off_id TEXT REFERENCES players(id),
  position      TEXT,
  team          TEXT CHECK(team IN ('home','away')),
  created_at    TEXT NOT NULL
);
```

### New DB functions (`lib/db/match-events.ts`)
- `getMatchEvents(matchId)` — all events for a match, ordered by match_time ASC
- `createMatchEvent(data)` — insert one event

### Updated DB functions (`lib/db/matches.ts`)
- `finishMatch(matchId)` — set status = 'finished'

### `lib/db/matches.ts` — `getMatchById` update
Returns match with events included (or events fetched separately on screen mount).

---

## New-Match Form Update

`app/new-match.tsx`: add **Timer Direction** field — segmented control (Count Up / Count Down), default Count Up. Value passed as `timer_direction` route param to `match-formation.tsx`, then saved in `createMatch`.

---

## Component Breakdown

| Component | Purpose |
|---|---|
| `components/MatchHeader.tsx` | Dark 3-column header bar (score, goal button, timer) |
| `components/BenchTiles.tsx` | Bench player tiles with live waiting timers |
| `components/GoalModal.tsx` | Team picker + scorer picker bottom sheet |
| `components/StatsGoals.tsx` | Goals table with running score |
| `components/StatsPlayerTime.tsx` | Player time list with expandable horizontal timeline |

`app/live-match.tsx` is the orchestrator: loads data, manages timer interval, holds substitution state, renders header + tabs.

---

## State Shape (live-match.tsx)

```typescript
// Loaded from DB
match: Match
players: Player[]           // all squad players
matchPlayers: MatchPlayer[] // initial starters/bench from match setup

// Derived / live
events: MatchEvent[]        // grows as coach logs things
assignments: Record<string, string>  // slotId → playerId (current pitch state)
benchPlayerIds: string[]             // players currently on bench

// Timer
half: 1 | 2 | 'halftime' | 'finished'
elapsed: number             // seconds in current half
running: boolean
breakElapsed: number        // seconds since halftime started

// UI
selectedPlayerId: string | null
activeTab: 'pitch' | 'stats'
goalModalVisible: boolean
expandedPlayerId: string | null  // for stats timeline
```

---

## Navigation

- From matches list: tapping an `in_progress` match navigates to `/live-match?id=...`
- After "End Match": `router.dismissAll()` back to matches list (status now `finished`)
- Tapping a `finished` match in the list navigates to a read-only version of the Stats tab (no timer, no goal button)

---

## Out of Scope / Future

- Editing or deleting logged events
- Referee mode
- Live sharing
- Absent player tracking (noted as gap in sub-project 2 spec)
