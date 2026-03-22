# Match Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full match setup flow — matches list, two-screen match creation (details → formation with drag-and-drop), and a placeholder live match screen.

**Architecture:** DB migration adds `matches` and `match_players` tables. Formation templates are pure data in `lib/formations.ts`. The formation screen wires together three focused components (FormationPicker, PitchView, PlayerBench) using a Pan gesture + Reanimated shared values for drag-and-drop.

**Tech Stack:** Expo SDK 54, expo-router, expo-sqlite, NativeWind/Tailwind, react-native-gesture-handler v2 (Gesture.Pan API), react-native-reanimated v4, TypeScript.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/db/database.ts` | Modify | Append migration 2 (matches + match_players) |
| `lib/db/matches.ts` | Create | DB functions: getMatches, createMatch, getMatchById |
| `lib/formations.ts` | Create | Formation templates and position slot layouts |
| `lib/__tests__/matches.test.ts` | Create | Unit tests for matches DB layer |
| `lib/__tests__/formations.test.ts` | Create | Unit tests for formation helpers |
| `app/_layout.tsx` | Modify | Register new-match, match-formation, live-match routes |
| `app/(tabs)/matches/index.tsx` | Modify | Real matches list with "New Match" header button |
| `app/new-match.tsx` | Create | Screen 1: match details form |
| `app/match-formation.tsx` | Create | Screen 2: formation picker + drag-and-drop |
| `app/live-match.tsx` | Create | Placeholder "coming soon" screen |
| `components/MatchRow.tsx` | Create | Matches list row |
| `components/FormationPicker.tsx` | Create | Horizontal formation template selector |
| `components/PitchView.tsx` | Create | Pitch with position drop slots |
| `components/PlayerBench.tsx` | Create | Horizontal scrollable player list |

---

## Task 1: DB Migration

**Files:**
- Modify: `lib/db/database.ts`
- Create: `lib/__tests__/migrations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/migrations.test.ts
import * as SQLite from 'expo-sqlite'
import { setupDatabase } from '../db/database'

// expo-sqlite in Jest (Node preset) uses an in-memory SQLite
describe('migrations', () => {
  it('creates players, matches, and match_players tables', async () => {
    await setupDatabase()
    const db = await import('../db/database').then(m => m.getDb())

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    const names = tables.map(t => t.name)
    expect(names).toContain('players')
    expect(names).toContain('matches')
    expect(names).toContain('match_players')
  })

  it('migration is idempotent — running twice does not throw', async () => {
    await expect(setupDatabase()).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/bouke/Library/CloudStorage/OneDrive-Personal/claude/coach-app" && npx jest lib/__tests__/migrations.test.ts --no-coverage
```
Expected: FAIL — `matches` and `match_players` not found.

- [ ] **Step 3: Append migration 2 to `lib/db/database.ts`**

Add to the `MIGRATIONS` array (after the existing entry):

```ts
  // Migration 2 — Sub-project 2: matches and match_players
  `CREATE TABLE IF NOT EXISTS matches (
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
  );`,
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/migrations.test.ts --no-coverage
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/db/database.ts lib/__tests__/migrations.test.ts
git commit -m "feat: add matches and match_players migration"
```

---

## Task 2: Formations Data

**Files:**
- Create: `lib/formations.ts`
- Create: `lib/__tests__/formations.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/formations.test.ts
import { getFormations, getSlots, POSITIONS } from '../formations'

describe('getFormations', () => {
  it('returns formations for 8v8', () => {
    const f = getFormations('8v8')
    expect(f.length).toBeGreaterThan(0)
    expect(f[0]).toHaveProperty('id')
    expect(f[0]).toHaveProperty('label')
  })

  it('returns different formations for each game type', () => {
    expect(getFormations('6v6')).not.toEqual(getFormations('8v8'))
    expect(getFormations('11v11')).not.toEqual(getFormations('8v8'))
  })
})

describe('getSlots', () => {
  it('returns the correct number of slots for 8v8 1-3-2-2', () => {
    const slots = getSlots('8v8', '1-3-2-2')
    expect(slots).toHaveLength(8)
  })

  it('always has exactly one GK slot at index 0', () => {
    const slots = getSlots('8v8', '1-3-2-2')
    expect(slots[0].position).toBe('GK')
  })

  it('every slot has id, position, x (0-1), y (0-1)', () => {
    const slots = getSlots('6v6', '1-2-2-1')
    for (const slot of slots) {
      expect(slot).toHaveProperty('id')
      expect(slot).toHaveProperty('position')
      expect(slot.x).toBeGreaterThanOrEqual(0)
      expect(slot.x).toBeLessThanOrEqual(1)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      expect(slot.y).toBeLessThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/formations.test.ts --no-coverage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/formations.ts`**

```ts
export type GameType = '6v6' | '8v8' | '11v11'

export interface FormationTemplate {
  id: string     // e.g. '1-3-2-2'
  label: string  // display label, same as id
}

export interface PositionSlot {
  id: string      // e.g. 'gk', 'cb-l', 'st-r'
  position: string // label shown on pitch: 'GK', 'CB', 'ST', etc.
  x: number       // 0 (left) to 1 (right)
  y: number       // 0 (top/attack end) to 1 (bottom/GK end)
}

// --- Formation templates ---

const FORMATIONS: Record<GameType, FormationTemplate[]> = {
  '6v6': [
    { id: '1-2-2-1', label: '1-2-2-1' },
    { id: '1-2-3',   label: '1-2-3' },
    { id: '1-3-2',   label: '1-3-2' },
  ],
  '8v8': [
    { id: '1-3-2-2', label: '1-3-2-2' },
    { id: '1-2-3-2', label: '1-2-3-2' },
    { id: '1-2-2-3', label: '1-2-2-3' },
    { id: '1-4-2-1', label: '1-4-2-1' },
  ],
  '11v11': [
    { id: '1-4-3-3',   label: '1-4-3-3' },
    { id: '1-4-4-2',   label: '1-4-4-2' },
    { id: '1-3-5-2',   label: '1-3-5-2' },
    { id: '1-4-2-3-1', label: '1-4-2-3-1' },
  ],
}

export function getFormations(gameType: GameType): FormationTemplate[] {
  return FORMATIONS[gameType]
}

// --- Position slots ---
// x: 0=left edge, 1=right edge
// y: 0=top (attack), 1=bottom (GK end)

type SlotDef = Omit<PositionSlot, 'id'> & { id: string }

function row(positions: string[], y: number): SlotDef[] {
  const n = positions.length
  return positions.map((position, i) => ({
    id: `${position.toLowerCase()}-${i}`,
    position,
    x: n === 1 ? 0.5 : i / (n - 1),
    y,
  }))
}

const SLOTS: Record<string, PositionSlot[]> = {
  // 6v6
  '6v6:1-2-2-1': [
    ...row(['GK'],        0.92),
    ...row(['CB', 'CB'],  0.72),
    ...row(['CM', 'CM'],  0.45),
    ...row(['ST'],        0.12),
  ],
  '6v6:1-2-3': [
    ...row(['GK'],              0.92),
    ...row(['CB', 'CB'],        0.68),
    ...row(['LW', 'CM', 'RW'], 0.28),
  ],
  '6v6:1-3-2': [
    ...row(['GK'],              0.92),
    ...row(['LB', 'CB', 'RB'], 0.65),
    ...row(['LW', 'RW'],        0.25),
  ],
  // 8v8
  '8v8:1-3-2-2': [
    ...row(['GK'],              0.92),
    ...row(['LB', 'CB', 'RB'], 0.70),
    ...row(['LCM', 'RCM'],      0.47),
    ...row(['LW', 'RW'],        0.18),
  ],
  '8v8:1-2-3-2': [
    ...row(['GK'],                    0.92),
    ...row(['LB', 'RB'],              0.72),
    ...row(['LM', 'CM', 'RM'],        0.47),
    ...row(['LS', 'RS'],              0.18),
  ],
  '8v8:1-2-2-3': [
    ...row(['GK'],              0.92),
    ...row(['LB', 'RB'],        0.72),
    ...row(['LCM', 'RCM'],      0.50),
    ...row(['LW', 'ST', 'RW'], 0.18),
  ],
  '8v8:1-4-2-1': [
    ...row(['GK'],                    0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'], 0.68),
    ...row(['LCM', 'RCM'],            0.43),
    ...row(['ST'],                    0.15),
  ],
  // 11v11
  '11v11:1-4-3-3': [
    ...row(['GK'],                         0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'],    0.70),
    ...row(['LCM', 'CM', 'RCM'],           0.48),
    ...row(['LW', 'ST', 'RW'],             0.18),
  ],
  '11v11:1-4-4-2': [
    ...row(['GK'],                         0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'],    0.70),
    ...row(['LM', 'LCM', 'RCM', 'RM'],    0.48),
    ...row(['LS', 'RS'],                   0.18),
  ],
  '11v11:1-3-5-2': [
    ...row(['GK'],                              0.92),
    ...row(['LCB', 'CB', 'RCB'],               0.72),
    ...row(['LM', 'LCM', 'CM', 'RCM', 'RM'],  0.47),
    ...row(['LS', 'RS'],                        0.18),
  ],
  '11v11:1-4-2-3-1': [
    ...row(['GK'],                         0.92),
    ...row(['LB', 'LCB', 'RCB', 'RB'],    0.72),
    ...row(['LDM', 'RDM'],                 0.55),
    ...row(['LW', 'AM', 'RW'],             0.35),
    ...row(['ST'],                         0.12),
  ],
}

export function getSlots(gameType: GameType, formationId: string): PositionSlot[] {
  return SLOTS[`${gameType}:${formationId}`] ?? []
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/__tests__/formations.test.ts --no-coverage
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/formations.ts lib/__tests__/formations.test.ts
git commit -m "feat: add formation templates and position slot data"
```

---

## Task 3: Matches DB Layer

**Files:**
- Create: `lib/db/matches.ts`
- Create: `lib/__tests__/matches.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/matches.test.ts
import { setupDatabase } from '../db/database'
import { createMatch, getMatches, getMatchById } from '../db/matches'

beforeEach(async () => {
  // Reset DB state between tests by re-running setup on a fresh in-memory db
  // jest-expo/node uses a new module registry per test file, so this works
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/matches.test.ts --no-coverage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/db/matches.ts`**

```ts
import * as Crypto from 'expo-crypto'
import { getDb } from './database'

export interface Match {
  id: string
  opponent: string
  venue: 'home' | 'away'
  game_type: '6v6' | '8v8' | '11v11'
  half_duration: number
  formation: string
  status: 'in_progress' | 'finished'
  created_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  role: 'starter' | 'bench'
  position: string | null
  created_at: string
}

interface CreateMatchInput {
  opponent: string
  venue: 'home' | 'away'
  game_type: '6v6' | '8v8' | '11v11'
  half_duration: number
  formation: string
  starters: { player_id: string; position: string }[]
  bench: { player_id: string }[]
}

export async function getMatches(): Promise<Match[]> {
  const db = await getDb()
  return db.getAllAsync<Match>('SELECT * FROM matches ORDER BY created_at DESC')
}

export async function getMatchById(id: string): Promise<Match | null> {
  const db = await getDb()
  return db.getFirstAsync<Match>('SELECT * FROM matches WHERE id = ?', [id]) ?? null
}

export async function createMatch(data: CreateMatchInput): Promise<Match> {
  const db = await getDb()
  const id = Crypto.randomUUID()
  const created_at = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO matches (id, opponent, venue, game_type, half_duration, formation, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.opponent.trim(), data.venue, data.game_type, data.half_duration, data.formation, 'in_progress', created_at]
    )
    for (const s of data.starters) {
      await db.runAsync(
        'INSERT INTO match_players (id, match_id, player_id, role, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), id, s.player_id, 'starter', s.position, created_at]
      )
    }
    for (const b of data.bench) {
      await db.runAsync(
        'INSERT INTO match_players (id, match_id, player_id, role, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), id, b.player_id, 'bench', null, created_at]
      )
    }
  })

  return { id, opponent: data.opponent.trim(), venue: data.venue, game_type: data.game_type, half_duration: data.half_duration, formation: data.formation, status: 'in_progress', created_at }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/__tests__/matches.test.ts --no-coverage
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/db/matches.ts lib/__tests__/matches.test.ts
git commit -m "feat: add matches DB layer with createMatch, getMatches, getMatchById"
```

---

## Task 4: Navigation + Placeholder Screens

**Files:**
- Modify: `app/_layout.tsx`
- Create: `app/new-match.tsx` (placeholder)
- Create: `app/match-formation.tsx` (placeholder)
- Create: `app/live-match.tsx`

- [ ] **Step 1: Register new routes in `app/_layout.tsx`**

Add three `Stack.Screen` entries inside the existing `<Stack>`:

```tsx
<Stack.Screen
  name="new-match"
  options={{ presentation: 'modal', title: 'New Match', headerShown: true }}
/>
<Stack.Screen
  name="match-formation"
  options={{ presentation: 'fullScreenModal', title: 'Formation', headerShown: true }}
/>
<Stack.Screen
  name="live-match"
  options={{ presentation: 'fullScreenModal', title: 'Live Match', headerShown: true }}
/>
```

- [ ] **Step 2: Create placeholder `app/new-match.tsx`**

```tsx
import { View, Text } from 'react-native'

export default function NewMatchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <Text className="text-slate-500">Match details — coming soon</Text>
    </View>
  )
}
```

- [ ] **Step 3: Create placeholder `app/match-formation.tsx`**

```tsx
import { View, Text } from 'react-native'

export default function MatchFormationScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <Text className="text-slate-500">Formation — coming soon</Text>
    </View>
  )
}
```

- [ ] **Step 4: Create `app/live-match.tsx`**

```tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function LiveMatchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-2xl font-bold text-slate-900 mb-2">Live Match</Text>
      <Text className="text-base text-slate-500 text-center mb-8">
        Match timers, substitutions and goals are coming in the next update.
      </Text>
      <TouchableOpacity
        onPress={() => router.dismiss()}
        className="bg-blue-600 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold text-base">Back to Matches</Text>
      </TouchableOpacity>
    </View>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/new-match.tsx app/match-formation.tsx app/live-match.tsx
git commit -m "feat: register new-match, match-formation, live-match routes"
```

---

## Task 5: MatchRow + Matches List Screen

**Files:**
- Create: `components/MatchRow.tsx`
- Modify: `app/(tabs)/matches/index.tsx`

- [ ] **Step 1: Create `components/MatchRow.tsx`**

```tsx
import { TouchableOpacity, View, Text } from 'react-native'
import type { Match } from '@/lib/db/matches'

interface MatchRowProps {
  match: Match
  onPress: () => void
}

const STATUS_LABEL: Record<Match['status'], string> = {
  in_progress: 'In progress',
  finished: 'Finished',
}

const STATUS_COLOR: Record<Match['status'], string> = {
  in_progress: 'text-amber-600',
  finished: 'text-slate-400',
}

export function MatchRow({ match, onPress }: MatchRowProps) {
  const date = new Date(match.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100"
      activeOpacity={0.7}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900">vs {match.opponent}</Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {date} · {match.venue === 'home' ? 'Home' : 'Away'} · {match.game_type}
        </Text>
      </View>
      <Text className={`text-sm font-medium ${STATUS_COLOR[match.status]}`}>
        {STATUS_LABEL[match.status]}
      </Text>
    </TouchableOpacity>
  )
}
```

- [ ] **Step 2: Replace `app/(tabs)/matches/index.tsx`**

```tsx
import { useCallback, useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { router, useFocusEffect, Stack } from 'expo-router'
import { getMatches, type Match } from '@/lib/db/matches'
import { MatchRow } from '@/components/MatchRow'
import { EmptyState } from '@/components/EmptyState'

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await getMatches()
    setMatches(data)
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: 'Matches',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/new-match')}
              className="mr-4 px-1 py-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-blue-600 text-2xl font-light leading-none">＋</Text>
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : matches.length === 0 ? (
        <EmptyState
          message="No matches yet"
          subMessage="Tap ＋ to start a new match"
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MatchRow
              match={item}
              onPress={() => router.push({ pathname: '/live-match', params: { id: item.id } })}
            />
          )}
          className="flex-1"
        />
      )}
    </View>
  )
}
```

- [ ] **Step 3: Verify on device**

Open the app, tap Matches tab. Confirm: empty state shown, ＋ button visible in header, tapping ＋ opens the "Match details — coming soon" placeholder modal.

- [ ] **Step 4: Commit**

```bash
git add components/MatchRow.tsx app/(tabs)/matches/index.tsx
git commit -m "feat: add MatchRow and matches list screen"
```

---

## Task 6: Match Details Form — Screen 1

**Files:**
- Modify: `app/new-match.tsx`

- [ ] **Step 1: Replace placeholder with real form**

```tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import type { GameType } from '@/lib/formations'

type Venue = 'home' | 'away'

export default function NewMatchScreen() {
  const [opponent, setOpponent] = useState('')
  const [venue, setVenue] = useState<Venue>('home')
  const [gameType, setGameType] = useState<GameType>('8v8')
  const [halfDuration, setHalfDuration] = useState(25)
  const [opponentError, setOpponentError] = useState('')

  function handleNext() {
    if (!opponent.trim()) {
      setOpponentError('Opponent name is required')
      return
    }
    setOpponentError('')
    router.push({
      pathname: '/match-formation',
      params: { opponent: opponent.trim(), venue, game_type: gameType, half_duration: String(halfDuration) },
    })
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">

        {/* Opponent */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Opponent</Text>
        <TextInput
          value={opponent}
          onChangeText={(t) => { setOpponent(t); setOpponentError('') }}
          placeholder="e.g. FC Riviera"
          placeholderTextColor="#94a3b8"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 mb-1"
          autoCapitalize="words"
          returnKeyType="done"
        />
        {opponentError ? (
          <Text className="text-red-500 text-sm mb-3">{opponentError}</Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Venue */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Venue</Text>
        <View className="flex-row gap-3 mb-5">
          {(['home', 'away'] as Venue[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setVenue(v)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                venue === v ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
              }`}
            >
              <Text className={`font-semibold text-base ${venue === v ? 'text-white' : 'text-slate-600'}`}>
                {v === 'home' ? '🏠 Home' : '✈️ Away'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Game type */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Game Type</Text>
        <View className="flex-row gap-2 mb-5">
          {(['6v6', '8v8', '11v11'] as GameType[]).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGameType(g)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                gameType === g ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
              }`}
            >
              <Text className={`font-semibold text-sm ${gameType === g ? 'text-white' : 'text-slate-600'}`}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Half duration */}
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Half Duration</Text>
        <View className="flex-row items-center bg-white border border-slate-200 rounded-xl mb-8 overflow-hidden">
          <TouchableOpacity
            onPress={() => setHalfDuration(Math.max(5, halfDuration - 5))}
            className="px-5 py-4"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-2xl text-slate-600 font-light">−</Text>
          </TouchableOpacity>
          <Text className="flex-1 text-center text-2xl font-bold text-slate-900">{halfDuration} min</Text>
          <TouchableOpacity
            onPress={() => setHalfDuration(Math.min(60, halfDuration + 5))}
            className="px-5 py-4"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-2xl text-slate-600 font-light">+</Text>
          </TouchableOpacity>
        </View>

        {/* Next button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-blue-600 py-4 rounded-xl items-center mb-8"
        >
          <Text className="text-white font-bold text-lg">Next →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
```

- [ ] **Step 2: Verify on device**

Open app → Matches → ＋. Confirm: all four fields render, opponent validation fires on empty submit, valid form navigates to the Formation placeholder.

- [ ] **Step 3: Commit**

```bash
git add app/new-match.tsx
git commit -m "feat: implement match details form (Screen 1)"
```

---

## Task 7: FormationPicker Component

**Files:**
- Create: `components/FormationPicker.tsx`

- [ ] **Step 1: Create `components/FormationPicker.tsx`**

```tsx
import { ScrollView, TouchableOpacity, Text, View } from 'react-native'
import { getFormations, type GameType, type FormationTemplate } from '@/lib/formations'

interface FormationPickerProps {
  gameType: GameType
  selected: string
  onSelect: (formationId: string) => void
}

export function FormationPicker({ gameType, selected, onSelect }: FormationPickerProps) {
  const formations = getFormations(gameType)

  return (
    <View>
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 mb-2">Formation</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        className="pb-2"
      >
        {formations.map((f: FormationTemplate) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => onSelect(f.id)}
            className={`px-4 py-2 rounded-full border ${
              selected === f.id
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text className={`font-semibold text-sm ${selected === f.id ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FormationPicker.tsx
git commit -m "feat: add FormationPicker component"
```

---

## Task 8: PitchView Component

**Files:**
- Create: `components/PitchView.tsx`

This component renders the pitch with slots and exposes slot layout positions for drop detection. It does not handle drag logic — that lives in `match-formation.tsx`.

- [ ] **Step 1: Create `components/PitchView.tsx`**

```tsx
import { useRef } from 'react'
import { View, Text } from 'react-native'
import type { PositionSlot } from '@/lib/formations'
import type { Player } from '@/lib/db/players'

export interface SlotLayout {
  x: number; y: number; width: number; height: number
}

interface PitchViewProps {
  slots: PositionSlot[]
  assignments: Record<string, Player>   // slotId → player
  onSlotLayout: (slotId: string, layout: SlotLayout) => void
}

const SLOT_SIZE = 52

export function PitchView({ slots, assignments, onSlotLayout }: PitchViewProps) {
  return (
    <View
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#16a34a', aspectRatio: 0.65 }}
    >
      {/* Field markings */}
      <View
        style={{
          position: 'absolute', top: 8, left: 8, right: 8, bottom: 8,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute', top: 8, left: '25%', right: '25%', height: 28,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: 8, left: '25%', right: '25%', height: 28,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
        }}
      />

      {/* Position slots — rendered using percentage positions */}
      {slots.map((slot) => {
        const player = assignments[slot.id]
        const isGK = slot.position === 'GK'

        return (
          <View
            key={slot.id}
            style={{
              position: 'absolute',
              // Convert normalised x/y to percentage, offset by half slot size
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              marginLeft: -SLOT_SIZE / 2,
              marginTop: -SLOT_SIZE / 2,
            }}
            onLayout={(e) => {
              // Capture slot layout for drop detection
              const { x, y, width, height } = e.nativeEvent.layout
              onSlotLayout(slot.id, { x, y, width, height })
            }}
          >
            {player ? (
              // Filled slot
              <View
                className="w-full h-full rounded-full items-center justify-center"
                style={{ backgroundColor: isGK ? '#fbbf24' : 'white' }}
              >
                <Text
                  style={{ fontSize: 10, fontWeight: '700', color: isGK ? 'white' : '#15803d', textAlign: 'center', lineHeight: 12 }}
                  numberOfLines={2}
                >
                  {player.number ?? ''}{'\n'}{player.name.split(' ')[0]}
                </Text>
              </View>
            ) : (
              // Empty slot
              <View
                className="w-full h-full rounded-full items-center justify-center"
                style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)' }}
              >
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                  {slot.position}
                </Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PitchView.tsx
git commit -m "feat: add PitchView component with position slots"
```

---

## Task 9: PlayerBench Component

**Files:**
- Create: `components/PlayerBench.tsx`

Renders the horizontal player list. Each card is a drag source. Tap toggles absent. Drag behaviour is wired from the parent (`match-formation.tsx`) via `onDragStart`.

- [ ] **Step 1: Create `components/PlayerBench.tsx`**

```tsx
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import type { Player } from '@/lib/db/players'

export interface DragStartPayload {
  playerId: string
  startX: number   // absolute screen X at drag start
  startY: number   // absolute screen Y at drag start
}

interface PlayerBenchProps {
  players: Player[]
  absentIds: Set<string>
  assignedIds: Set<string>       // already placed on pitch
  onToggleAbsent: (playerId: string) => void
  onDragStart: (payload: DragStartPayload) => void
}

export function PlayerBench({ players, absentIds, assignedIds, onToggleAbsent, onDragStart }: PlayerBenchProps) {
  return (
    <View>
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 mb-2">
        Players — tap to mark absent · drag to place on pitch
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        className="pb-2"
      >
        {players.map((player) => {
          const absent = absentIds.has(player.id)
          const onPitch = assignedIds.has(player.id)

          const panGesture = Gesture.Pan()
            .runOnJS(true)
            .onStart((e) => {
              if (absent) return
              onDragStart({ playerId: player.id, startX: e.absoluteX, startY: e.absoluteY })
            })

          return (
            <GestureDetector key={player.id} gesture={panGesture}>
              <TouchableOpacity
                onPress={() => onToggleAbsent(player.id)}
                activeOpacity={0.8}
                className={`items-center px-3 py-2 rounded-xl border ${
                  absent
                    ? 'bg-slate-100 border-slate-200 opacity-40'
                    : onPitch
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-slate-200'
                }`}
                style={{ minWidth: 60 }}
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                    absent ? 'bg-slate-300' : onPitch ? 'bg-green-500' : 'bg-blue-100'
                  }`}
                >
                  <Text className={`text-xs font-bold ${absent ? 'text-slate-500' : onPitch ? 'text-white' : 'text-blue-700'}`}>
                    {player.number ?? '?'}
                  </Text>
                </View>
                <Text
                  className={`text-xs font-medium text-center ${absent ? 'text-slate-400' : 'text-slate-700'}`}
                  numberOfLines={1}
                  style={{ maxWidth: 56 }}
                >
                  {player.name.split(' ')[0]}
                </Text>
                {absent && (
                  <Text className="text-xs text-slate-400 mt-0.5">absent</Text>
                )}
              </TouchableOpacity>
            </GestureDetector>
          )
        })}
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PlayerBench.tsx
git commit -m "feat: add PlayerBench component with absent toggle and drag source"
```

---

## Task 10: Match Formation Screen — Wire Everything Together

**Files:**
- Modify: `app/match-formation.tsx`

This is the most complex screen. It combines FormationPicker, PitchView, and PlayerBench, and implements drag-and-drop using Reanimated shared values + onLayout-based hit testing.

- [ ] **Step 1: Replace placeholder with full implementation**

```tsx
import { useState, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated'
import { useFocusEffect } from 'expo-router'

import { getPlayers, type Player } from '@/lib/db/players'
import { createMatch } from '@/lib/db/matches'
import { getFormations, getSlots, type GameType } from '@/lib/formations'
import { FormationPicker } from '@/components/FormationPicker'
import { PitchView, type SlotLayout } from '@/components/PitchView'
import { PlayerBench, type DragStartPayload } from '@/components/PlayerBench'

export default function MatchFormationScreen() {
  const params = useLocalSearchParams<{
    opponent: string; venue: string; game_type: string; half_duration: string
  }>()

  const gameType = (params.game_type ?? '8v8') as GameType
  const defaultFormation = getFormations(gameType)[0].id

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formation, setFormation] = useState(defaultFormation)
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set())
  // slotId → Player
  const [assignments, setAssignments] = useState<Record<string, Player>>({})

  // Drag state
  const [dragging, setDragging] = useState(false)
  const [dragPlayer, setDragPlayer] = useState<Player | null>(null)
  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const dragOpacity = useSharedValue(0)

  // Slot layouts for hit testing (populated by PitchView onSlotLayout)
  const slotLayouts = useRef<Map<string, SlotLayout & { slotId: string }>>(new Map())

  // Pitch container absolute offset (needed to convert slot local layout to screen coords)
  const pitchRef = useRef<View>(null)
  const pitchOffset = useRef({ x: 0, y: 0 })

  useFocusEffect(useCallback(() => {
    getPlayers().then((data) => { setPlayers(data); setLoading(false) })
  }, []))

  const slots = getSlots(gameType, formation)

  function handleFormationChange(id: string) {
    setFormation(id)
    setAssignments({}) // reset when formation changes
  }

  function handleToggleAbsent(playerId: string) {
    setAbsentIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
        // Remove from pitch if absent
        setAssignments((a) => {
          const updated = { ...a }
          for (const [sid, p] of Object.entries(updated)) {
            if (p.id === playerId) delete updated[sid]
          }
          return updated
        })
      }
      return next
    })
  }

  function handleDragStart({ playerId, startX, startY }: DragStartPayload) {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    // Remove from any existing slot
    setAssignments((a) => {
      const updated = { ...a }
      for (const [sid, p] of Object.entries(updated)) {
        if (p.id === playerId) delete updated[sid]
      }
      return updated
    })
    dragX.value = startX
    dragY.value = startY
    dragOpacity.value = 1
    setDragPlayer(player)
    setDragging(true)
  }

  function handleDragEnd(x: number, y: number) {
    // Find which slot the finger landed on
    // Slot layouts are relative to the pitch container; add pitchOffset for screen coords
    let targetSlotId: string | null = null
    for (const [slotId, layout] of slotLayouts.current.entries()) {
      const absX = pitchOffset.current.x + layout.x
      const absY = pitchOffset.current.y + layout.y
      if (
        x >= absX && x <= absX + layout.width &&
        y >= absY && y <= absY + layout.height
      ) {
        targetSlotId = slotId
        break
      }
    }
    if (targetSlotId && dragPlayer) {
      setAssignments((a) => ({ ...a, [targetSlotId!]: dragPlayer }))
    }
    dragOpacity.value = 0
    setDragging(false)
    setDragPlayer(null)
  }

  const floatingStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dragX.value - 26,
    top: dragY.value - 26,
    opacity: dragOpacity.value,
    zIndex: 999,
    pointerEvents: 'none' as any,
  }))

  const assignedIds = new Set(Object.values(assignments).map((p) => p.id))
  const presentPlayers = players.filter((p) => !absentIds.has(p.id))
  const benchPlayers = presentPlayers.filter((p) => !assignedIds.has(p.id))

  const canStart = presentPlayers.length > 0

  async function handleStartMatch() {
    if (!canStart) return
    setSaving(true)
    try {
      const starters = Object.entries(assignments).map(([slotId, player]) => {
        const slot = slots.find((s) => s.id === slotId)
        return { player_id: player.id, position: slot?.position ?? slotId }
      })
      const bench = benchPlayers.map((p) => ({ player_id: p.id }))
      await createMatch({
        opponent: params.opponent ?? '',
        venue: (params.venue ?? 'home') as 'home' | 'away',
        game_type: gameType,
        half_duration: parseInt(params.half_duration ?? '25', 10),
        formation,
        starters,
        bench,
      })
      router.replace('/live-match')
    } catch (e) {
      Alert.alert('Error', 'Could not save match. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  if (players.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Text className="text-base text-slate-500 text-center">
          No players in your squad. Add players first.
        </Text>
        <TouchableOpacity onPress={() => router.dismiss(2)} className="mt-4">
          <Text className="text-blue-600 font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-50">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Formation picker */}
          <View className="pt-4 pb-3">
            <FormationPicker
              gameType={gameType}
              selected={formation}
              onSelect={handleFormationChange}
            />
          </View>

          {/* Pitch */}
          <View
            ref={pitchRef}
            className="mb-4"
            onLayout={() => {
              pitchRef.current?.measureInWindow((x, y) => {
                pitchOffset.current = { x, y }
              })
            }}
          >
            <PitchView
              slots={slots}
              assignments={assignments}
              onSlotLayout={(slotId, layout) => {
                slotLayouts.current.set(slotId, { ...layout, slotId })
              }}
            />
          </View>

          {/* Player bench */}
          <PlayerBench
            players={players}
            absentIds={absentIds}
            assignedIds={assignedIds}
            onToggleAbsent={handleToggleAbsent}
            onDragStart={handleDragStart}
          />

          {presentPlayers.length === 0 && (
            <Text className="text-center text-slate-500 text-sm mt-4 px-4">
              No players available — mark some players as present.
            </Text>
          )}
        </ScrollView>

        {/* Floating drag card */}
        {dragging && dragPlayer && (
          <Animated.View style={floatingStyle}>
            <View className="w-13 h-13 rounded-full bg-blue-600 items-center justify-center shadow-lg"
              style={{ width: 52, height: 52 }}>
              <Text className="text-white text-xs font-bold text-center" numberOfLines={2}
                style={{ fontSize: 10, lineHeight: 13 }}>
                {dragPlayer.number ?? ''}{'\n'}{dragPlayer.name.split(' ')[0]}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Bottom bar */}
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-50 border-t border-slate-200">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.dismiss(2)}
              className="flex-1 py-4 rounded-xl border border-slate-300 items-center"
            >
              <Text className="text-slate-600 font-semibold text-base">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStartMatch}
              disabled={!canStart || saving}
              className={`flex-2 py-4 rounded-xl items-center ${canStart && !saving ? 'bg-blue-600' : 'bg-slate-300'}`}
              style={{ flex: 2 }}
            >
              {saving
                ? <ActivityIndicator color="white" />
                : <Text className={`font-bold text-base ${canStart ? 'text-white' : 'text-slate-400'}`}>Start Match →</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 2: Wire drag movement to shared values**

The drag card follows the finger. Update `PlayerBench.tsx` to call the parent's position updater during the pan. Add two new props to `PlayerBenchProps`:

```ts
onDragMove: (x: number, y: number) => void
onDragEnd: (x: number, y: number) => void
```

Update the `panGesture` in `PlayerBench.tsx`:

```ts
const panGesture = Gesture.Pan()
  .runOnJS(true)
  .onStart((e) => {
    if (absent) return
    onDragStart({ playerId: player.id, startX: e.absoluteX, startY: e.absoluteY })
  })
  .onUpdate((e) => {
    if (absent) return
    onDragMove(e.absoluteX, e.absoluteY)
  })
  .onEnd((e) => {
    if (absent) return
    onDragEnd(e.absoluteX, e.absoluteY)
  })
```

Add `onDragMove` and `onDragEnd` to `PlayerBenchProps` interface and pass them through in the component.

In `match-formation.tsx`, add handlers:

```ts
function handleDragMove(x: number, y: number) {
  dragX.value = x
  dragY.value = y
}
```

And pass them to `<PlayerBench>`:
```tsx
<PlayerBench
  ...
  onDragMove={handleDragMove}
  onDragEnd={handleDragEnd}
/>
```

- [ ] **Step 3: Verify on device**

End-to-end test:
1. Tap ＋ on matches tab → fill in details → Next
2. Formation picker shows templates for selected game type
3. Changing formation resets pitch slots
4. Tap a player card → toggles absent (greyed out)
5. Drag a player card up to a pitch slot → player appears in that slot
6. "Start Match" saves to DB and opens the live match placeholder
7. "Back to Matches" returns to the matches list showing the new match as "In progress"
8. "Cancel" on formation screen returns to matches list (not to details form)

- [ ] **Step 4: Commit**

```bash
git add app/match-formation.tsx components/PlayerBench.tsx
git commit -m "feat: implement match formation screen with drag-and-drop"
```

---

## Task 11: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
cd "/Users/bouke/Library/CloudStorage/OneDrive-Personal/claude/coach-app" && npx jest --no-coverage
```
Expected: all tests pass (migrations, formations, matches, validation).

- [ ] **Step 2: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any test failures after integration"
```

---

## Task 12: Final .gitignore Update

- [ ] **Step 1: Ensure `.superpowers/` is ignored**

```bash
grep -q '.superpowers' .gitignore || echo '.superpowers/' >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm artefacts"
```
