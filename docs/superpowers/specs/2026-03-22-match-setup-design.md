# Match Setup — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

This update implements the match setup flow: a matches list screen, two-screen match creation (details → formation), and a placeholder live match screen. It does not include the live match functionality (timers, substitutions, goals).

---

## Scope

**In scope:**
- Matches list screen with "New Match" button
- Screen 1: Match details form (opponent, venue, game type, half duration)
- Screen 2: Formation template picker + drag-and-drop pitch view + player assignment
- Placeholder live match screen
- DB migration for `matches` and `match_players` tables

**Out of scope:**
- Live match timers, substitutions, goal tracking (next update)
- Match summary / post-match stats

---

## User Flow

1. User taps **Matches** tab → sees list of past matches (or empty state) + "New Match" button
2. Taps "New Match" → **Screen 1: Match Details**
3. Fills in details, taps **Next →** → **Screen 2: Formation & Players**
4. Picks a formation template, drags players from the bench list onto pitch slots
5. Taps **Start Match →** → match saved to DB, navigates to **placeholder Live Match screen**

---

## Screens

### Matches List (`app/(tabs)/matches/index.tsx`)

- Header: "Matches" title + "New Match" button (top right)
- List of past matches, each row showing: opponent, date, venue, game type, status badge
- Status values: `setup` (setup done, not started), `in_progress` (started), `finished`
- Empty state when no matches exist

### Screen 1 — Match Details (`app/new-match.tsx`)

Fields:
| Field | Type | Default |
|---|---|---|
| Opponent | Text input | — |
| Venue | Toggle (Home / Away) | Home |
| Game type | Segmented control (6v6 / 8v8 / 11v11) | 8v8 |
| Half duration | Stepper (5–60 min, step 5) | 25 min |

- Validation: opponent name required
- "Next →" button navigates to Screen 2, passing match details as route params (not yet saved to DB)

### Screen 2 — Formation & Players (`app/match-formation.tsx`)

**Formation template picker (top):**
- Horizontal scrollable list of formation templates
- Templates per game type:
  - 6v6: 1-2-2, 1-1-3, 1-3-1
  - 8v8: 1-3-2-2, 1-2-3-2, 1-2-2-3, 1-4-2
  - 11v11: 1-4-3-3, 1-4-4-2, 1-3-5-2, 1-4-2-3-1
- Changing template resets pitch slot assignments

**Pitch view (middle):**
- Green pitch background with basic field markings
- Position slots rendered based on selected formation
- Empty slot: dashed circle with position label (GK, CB, CM, ST…)
- Filled slot: circle with player name + shirt number
- GK slot always at bottom, visually distinct (yellow)

**Player list (bottom):**
- Horizontally scrollable list of all squad players
- Each card: shirt number + name
- Drag a card up onto a pitch slot → player assigned as starter at that position
- Tap a card to toggle absent (greyed out, excluded from bench and pitch)
- Players not assigned to pitch slots = bench (shown with "SUB" indicator when on bench)

**Start Match → button:**
- Saves match record to DB with status `in_progress`
- Saves each starter (player_id, match_id, role=starter, position) and each bench player (role=bench) to `match_players`
- Navigates to placeholder live match screen

### Placeholder Live Match (`app/live-match.tsx`)

- Simple screen: "Live Match coming soon" message
- Back button returns to matches list

---

## Data Model

### Migration 2 — added to `MIGRATIONS` array in `lib/db/database.ts`

```sql
CREATE TABLE IF NOT EXISTS matches (
  id           TEXT PRIMARY KEY,
  opponent     TEXT NOT NULL,
  venue        TEXT NOT NULL CHECK(venue IN ('home', 'away')),
  game_type    TEXT NOT NULL CHECK(game_type IN ('6v6', '8v8', '11v11')),
  half_duration INTEGER NOT NULL,
  formation    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup', 'in_progress', 'finished')),
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS match_players (
  id         TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL REFERENCES matches(id),
  player_id  TEXT NOT NULL REFERENCES players(id),
  role       TEXT NOT NULL CHECK(role IN ('starter', 'bench')),
  position   TEXT,
  created_at TEXT NOT NULL
);
```

### New DB functions (`lib/db/matches.ts`)

- `getMatches()` — all matches, newest first
- `createMatch(data)` — insert match + match_players in a transaction
- `getMatchById(id)` — single match with its players

---

## Navigation

New routes added to `app/_layout.tsx`:

```
app/new-match.tsx           — modal, title "New Match"
app/match-formation.tsx     — modal (full screen), title "Formation"
app/live-match.tsx          — modal (full screen), title "Live Match"
```

---

## Component Breakdown

| Component | Purpose |
|---|---|
| `components/MatchRow.tsx` | Row in matches list |
| `components/FormationPicker.tsx` | Horizontal template selector |
| `components/PitchView.tsx` | Pitch with draggable position slots |
| `components/PlayerBench.tsx` | Horizontal scrollable player list |

---

## Drag-and-Drop

Use `react-native-gesture-handler` (already installed) for drag gesture detection. Each player card becomes a draggable element; pitch slots are drop targets detected by measuring layout positions on drop release.

No additional libraries required.

---

## Out of Scope / Future

- Editing a match setup after creation
- Formation changes during live match
- Position labels beyond the predefined set
