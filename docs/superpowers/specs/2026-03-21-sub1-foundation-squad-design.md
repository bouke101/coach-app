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
| Framework | Expo managed workflow, **SDK 52** |
| Navigation | expo-router v3 (file-based routing) |
| Database | expo-sqlite (local SQLite, fully offline) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Language | TypeScript strict |

**NativeWind v4 setup note:** Requires the `withNativeWind` plugin in `metro.config.js` and a `global.css` import in the root layout. Must be configured before any styled component is written.

No server, no authentication, no cloud sync. All data lives on the device.

---

## 2. Data Model

Single table for this sub-project:

```sql
CREATE TABLE IF NOT EXISTS players (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL,
  number     INTEGER,
  created_at TEXT    NOT NULL
);
```

- `id` — UUID generated client-side on creation
- `name` — required, free text
- `number` — shirt number, optional. Valid range: 1–99. Duplicate numbers are allowed (teams share numbers across seasons). Zero and negative values are rejected.
- `created_at` — ISO 8601 timestamp

Position assignment is **not** stored on the player record. Positions are assigned per match during lineup setup (sub-project 2).

### Migration runner

`database.ts` uses SQLite's `PRAGMA user_version` to track the applied schema version. On every app launch, `setupDatabase()` reads the current `user_version`, then runs any migrations whose index is greater than that number, and updates `user_version` after each one. Sub-projects 2 and 3 extend the schema by appending to the migrations array.

```ts
// lib/db/database.ts (structure)
const MIGRATIONS = [
  // migration 1 (sub-project 1)
  `CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    number INTEGER, created_at TEXT NOT NULL
  );`,
  // migration 2 (sub-project 2 will append here)
]

export async function setupDatabase(db: SQLiteDatabase) {
  const { user_version } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  )
  for (let i = user_version; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i])
    await db.execAsync(`PRAGMA user_version = ${i + 1}`)
  }
}
```

---

## 3. Navigation Structure

expo-router v3 requires a root `<Stack>` to support modal presentation over the tab bar. The tab navigator lives inside the stack as a nested layout.

```
app/_layout.tsx          ← Root Stack (init DB, NativeWind, declares modal screens)
├── (tabs)/_layout.tsx   ← Tab bar (Squad tab + Matches tab)
│   ├── squad/index.tsx  ← Player list
│   └── matches/index.tsx← Matches placeholder
├── add-player.tsx        ← Modal screen (presentation: 'modal')
└── edit-player.tsx       ← Modal screen (presentation: 'modal')
```

`add-player` and `edit-player` are declared as `presentation: 'modal'` in the root Stack's screen options. They slide up over the tab bar. Navigation is via `router.push('/add-player')` and `router.push({ pathname: '/edit-player', params: { id: player.id } })`. The player ID is read in `edit-player.tsx` via `useLocalSearchParams<{ id: string }>()`.

---

## 4. Screens

### Squad list (`app/(tabs)/squad/index.tsx`)

- Lists all players sorted by shirt number ascending (nulls last — requires `ORDER BY number IS NULL ASC, number ASC, name ASC`), then alphabetically by name
- Each row shows: shirt number badge (or `—` if none) · player name
- "＋ Add Player" button in the header navigates to `/add-player`
- Tap a row navigates to `/edit-player?id=<id>`
- Empty state when no players: "No players yet — tap ＋ to add your squad"

### Add Player modal (`app/add-player.tsx`)

- Fields:
  - **Name** (text input, required)
  - **Shirt number** (numeric input, optional, 1–99)
- Validation on save:
  - Name must be non-empty after trim → show inline error "Name is required"
  - Shirt number, if provided, must be an integer between 1 and 99 → show inline error "Must be between 1 and 99"
- Save creates a new player record and navigates back
- Cancel navigates back without saving
- Keyboard-aware layout (content scrolls above keyboard on both iOS and Android)

### Edit Player modal (`app/edit-player.tsx`)

- Reads `id` from `useLocalSearchParams<{ id: string }>()`.
  - If `id` is missing or the player is not found in the database, navigate back immediately (no crash, no error screen).
- Same form as Add Player, pre-filled with existing values
- Same validation rules as Add Player
- Save updates the record and navigates back
- Cancel navigates back without saving
- "Delete player" button at the bottom. Tapping shows a native alert:
  - Title: `"Remove [player name]?"`
  - Message: `"This will permanently remove them from your squad."`
  - Buttons: `"Cancel"` (dismiss) and `"Remove"` (destructive, deletes and navigates back)
- Keyboard-aware layout

### Matches placeholder (`app/(tabs)/matches/index.tsx`)

- Empty state: illustration + "No matches yet — coming soon"
- No interaction

---

## 5. File Structure

```
app/
  _layout.tsx                  # Root Stack: init DB, NativeWind, modal screen declarations
  add-player.tsx               # Add Player modal
  edit-player.tsx              # Edit Player modal (receives id param)
  (tabs)/
    _layout.tsx                # Tab bar (Squad + Matches)
    squad/
      index.tsx                # Player list screen
    matches/
      index.tsx                # Matches placeholder

lib/
  db/
    database.ts                # setupDatabase(), MIGRATIONS array, migration runner
    players.ts                 # getPlayers(), createPlayer(), updatePlayer(), deletePlayer()

components/
  PlayerRow.tsx                # Single row in the squad list
  EmptyState.tsx               # Reusable empty state (icon + message + optional sub-message)
```

---

## 6. Out of Scope

- Match creation, attendance, lineup (sub-project 2)
- Live match screen, timers, substitutions, goals (sub-project 3)
- Cloud sync or data export
- App icon, splash screen, or production build config
- Multiple teams (single-team only by design for v1)
- Default position on the player record (positions are per-match, assigned in sub-project 2)
