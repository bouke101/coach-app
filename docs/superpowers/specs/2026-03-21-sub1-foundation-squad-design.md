# Design: Sub-project 1 — Foundation + Squad

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Scaffold the Expo app, set up offline SQLite storage, and build the Squad screen to manage the player roster.

---

## Overview

Sub-project 1 establishes the foundation the entire app builds on: navigation shell, database layer, and the Squad screen where the coach manages their team's player roster. When complete, the coach can add, edit, and delete players. The app works fully offline with no account required.

This is sub-project 1 of 3:
- **Sub-project 1 (this):** Foundation + Squad
- **Sub-project 2:** Matches + Setup
- **Sub-project 3:** Live Match (timers, substitutions, goals, summary)

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo (managed workflow) |
| Navigation | expo-router v3 (file-based, same mental model as Next.js) |
| Database | expo-sqlite (local SQLite, fully offline) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Language | TypeScript strict |

No server, no authentication, no cloud sync. All data lives on the device.

---

## 2. Data Model

Single table for this sub-project:

```sql
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  number     INTEGER,
  created_at TEXT NOT NULL
);
```

- `id` — UUID generated client-side on creation
- `name` — required, free text
- `number` — shirt number, optional (not all youth teams use them)
- `created_at` — ISO 8601 timestamp

Position assignment is **not** stored on the player record. Positions are assigned per match during lineup setup (sub-project 2).

The database is initialised on first app launch via a `setupDatabase()` function called at the root layout level. Migrations run in sequence so future sub-projects can add tables without breaking existing data.

---

## 3. Navigation Structure

```
Tab Bar
├── Squad (tab)
│   └── Player list — all players, sorted by shirt number (nulls last), then name
│         ├── Add Player (modal, slides up)
│         └── Edit Player (modal, slides up, pre-filled, includes delete)
└── Matches (tab)
    └── Empty state — "No matches yet"
```

Add and Edit open as **modals** (bottom sheet slide-up) so the coach never loses their place in the list.

---

## 4. Screens

### Squad list (`app/(tabs)/squad/index.tsx`)

- Lists all players sorted by shirt number (ascending, nulls last), then alphabetically by name
- Each row shows: shirt number (or `—` if none) · player name
- "＋ Add Player" button in the header
- Tap a row to open Edit Player modal
- Empty state when no players: "No players yet — tap ＋ to add your squad"

### Add Player modal (`app/add-player.tsx`)

- Fields: Name (required), Shirt number (optional, numeric)
- Validation: name must be non-empty
- Save creates a new player record; Cancel discards
- Keyboard-aware layout (scrolls above keyboard)

### Edit Player modal (`app/edit-player.tsx`)

- Same form as Add, pre-filled with existing values
- Save updates the record
- "Delete player" button at the bottom (with confirmation alert before deleting)
- Cancel discards changes

### Matches placeholder (`app/(tabs)/matches/index.tsx`)

- Empty state: "No matches yet — coming in the next update"
- No interaction

---

## 5. File Structure

```
app/
  _layout.tsx                  # Root layout: init DB, NativeWind, tab navigator
  add-player.tsx               # Add Player modal (route: /add-player)
  edit-player.tsx              # Edit Player modal (route: /edit-player?id=...)
  (tabs)/
    _layout.tsx                # Tab bar definition (Squad + Matches tabs)
    squad/
      index.tsx                # Player list screen
    matches/
      index.tsx                # Matches placeholder

lib/
  db/
    database.ts                # setupDatabase(), migration runner
    players.ts                 # getPlayers(), createPlayer(), updatePlayer(), deletePlayer()

components/
  PlayerRow.tsx                # Single row in the squad list
  EmptyState.tsx               # Reusable empty state (icon + message)
```

---

## 6. Out of Scope

- Match creation, attendance, lineup (sub-project 2)
- Live match screen, timers, substitutions, goals (sub-project 3)
- Cloud sync or data export
- App icon, splash screen, or production build config
- Multiple teams
