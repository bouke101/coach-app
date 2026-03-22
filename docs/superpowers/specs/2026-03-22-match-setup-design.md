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
- Saving a draft match (match is only written to DB on "Start Match")

---

## User Flow

1. User taps **Matches** tab → sees list of past matches (or empty state) + "New Match" button
2. Taps "New Match" → **Screen 1: Match Details**
3. Fills in details, taps **Next →** → **Screen 2: Formation & Players**
4. Picks a formation template, drags players from the bench list onto pitch slots
5. Taps **Start Match →** → match saved to DB with status `in_progress`, navigates to **placeholder live match screen**

---

## Screens

### Matches List (`app/(tabs)/matches/index.tsx`)

- Header: "Matches" title + "New Match" button (top right)
- List of past matches, each row showing: opponent, date, venue, game type, status badge
- Status values: `in_progress` (started), `finished`
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
- "Next →" navigates to Screen 2, passing match details via route params (opponent, venue, game_type, half_duration — all scalar values, safe for URL params)
- Match is **not** saved to DB yet at this point

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
- Players not assigned to a pitch slot (and not absent) = bench

**Edge cases:**
- If the squad has 0 players, show a message on Screen 2: "No players in your squad. Add players first." and disable "Start Match".
- If fewer present players than starters needed, allow starting with incomplete lineup (some pitch slots left empty) — coaches may start a match with an incomplete roster entry.
- If all players are marked absent, disable "Start Match" with message "No players available".

**Start Match → button:**
- Saves match record to DB with status `in_progress` (no `setup` intermediate state)
- Saves starters (role=`starter`, position set) and bench players (role=`bench`, position null) to `match_players`. Absent players are omitted entirely.
- **Known gap:** there is no way to later distinguish "player was absent" from "player was not in squad." This will be addressed in sub-project 3 when the live match screen is built (add `absent` role then).
- Navigates to placeholder live match screen

**Cancel behaviour:**
- Screen 2 has a "Cancel" button that dismisses both modals at once (`router.dismiss(2)`), abandoning the whole new-match flow and returning to the matches list.

### Placeholder Live Match (`app/live-match.tsx`)

- Simple screen: "Live Match coming soon" message
- "Back to Matches" button dismisses to matches list

---

## Data Model

### Migration 2 — appended to `MIGRATIONS` array in `lib/db/database.ts`

Both tables are created in a single migration string. `expo-sqlite`'s `execAsync` supports multiple semicolon-separated statements in one call, so both `CREATE TABLE` statements are included in one entry and execute atomically within a single version bump:

```sql
CREATE TABLE IF NOT EXISTS matches (
  id            TEXT PRIMARY KEY,
  opponent      TEXT NOT NULL,
  venue         TEXT NOT NULL CHECK(venue IN ('home', 'away')),
  game_type     TEXT NOT NULL CHECK(game_type IN ('6v6', '8v8', '11v11')),
  half_duration INTEGER NOT NULL,
  formation     TEXT NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('in_progress', 'finished')),
  created_at    TEXT NOT NULL
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

Note: `status` has no DEFAULT since matches are always written as `in_progress` on creation. The `setup` status is not used in this sub-project.

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

**Dismiss behaviour:** Tapping Cancel on `match-formation.tsx` calls `router.dismiss(2)` to close both modals at once, returning directly to the matches list.

---

## Component Breakdown

| Component | Purpose |
|---|---|
| `components/MatchRow.tsx` | Row in matches list |
| `components/FormationPicker.tsx` | Horizontal template selector |
| `components/PitchView.tsx` | Pitch with position slots |
| `components/PlayerBench.tsx` | Horizontal scrollable player list |

---

## Drag-and-Drop

**Libraries:** `react-native-gesture-handler` (pan gesture) + `react-native-reanimated` (shared values for position tracking). Both are already installed.

**Approach:**
- Each pitch slot records its absolute screen position via `onLayout` + `measure` at render time, stored in a ref.
- Player cards use a `Pan` gesture handler from `react-native-gesture-handler`.
- During drag, position is tracked via `react-native-reanimated` shared values (no bridge calls mid-gesture).
- On drag release, the card's final position is compared against stored slot positions to determine the drop target.
- This avoids async `measure()` calls at drop time, which can return stale values when the layout has scrolled.

---

## Out of Scope / Future

- Editing a match setup after creation
- Formation changes during live match
- Absent player tracking in `match_players` (added in sub-project 3)
- Position labels beyond the predefined set
