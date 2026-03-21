# Sub-project 1: Foundation + Squad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a React Native (Expo) coach app with SQLite-backed player roster management — add, edit, and delete players, fully offline.

**Architecture:** Expo managed workflow with expo-router v3 for file-based navigation. A root `<Stack>` layout wraps a tab bar and two modal screens (Add/Edit Player). SQLite via expo-sqlite stores players locally. A versioned migration runner (`PRAGMA user_version`) allows sub-projects 2 and 3 to extend the schema without breaking existing installs. NativeWind v4 provides Tailwind-style styling.

**Tech Stack:** Expo SDK 52, expo-router v3, expo-sqlite, expo-crypto, NativeWind v4, TypeScript strict

**Working directory:** `/Users/bouke/onedrive/claude/coach-app`

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `package.json`, `app.json`, `tsconfig.json` | Create (scaffold) | Project config |
| `metro.config.js` | Create | NativeWind v4 Metro plugin |
| `babel.config.js` | Create | NativeWind v4 Babel preset |
| `global.css` | Create | Tailwind CSS entry point |
| `tailwind.config.js` | Create | NativeWind content paths |
| `nativewind-env.d.ts` | Create | NativeWind TypeScript type reference |
| `lib/db/database.ts` | Create | `setupDatabase()`, `MIGRATIONS` array, migration runner |
| `lib/db/players.ts` | Create | `getPlayers`, `createPlayer`, `updatePlayer`, `deletePlayer`, `getPlayerById` (addition beyond spec — required by edit-player.tsx) |
| `lib/validation.ts` | Create | Pure `validatePlayerForm()` — testable without native modules |
| `app/_layout.tsx` | Create | Root Stack: init DB, NativeWind, declare modal screens |
| `app/(tabs)/_layout.tsx` | Create | Tab bar (Squad + Matches) |
| `app/(tabs)/squad/index.tsx` | Create | Player list screen |
| `app/(tabs)/matches/index.tsx` | Create | Matches placeholder |
| `app/add-player.tsx` | Create | Add Player modal |
| `app/edit-player.tsx` | Create | Edit Player modal |
| `components/EmptyState.tsx` | Create | Reusable empty state |
| `components/PlayerRow.tsx` | Create | Single player row in the squad list |

---

## Task 1: Expo scaffold + NativeWind setup

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `babel.config.js`, `global.css`, `tailwind.config.js`

- [ ] **Step 1: Scaffold the Expo project**

The working directory already contains `CLAUDE.md` and `docs/`. `create-expo-app` will only create new files and update `package.json` — it does **not** delete or overwrite `CLAUDE.md`, `docs/`, or any directory it didn't create.

Run from `/Users/bouke/onedrive/claude/coach-app`:

```bash
npx create-expo-app@latest . --template blank-typescript
```

When prompted "A package.json already exists — continue?", answer **yes**. The scaffold creates `app/`, `assets/`, `package.json`, `tsconfig.json`, `app.json`, `.gitignore`, etc. alongside the existing files.

Expected: project files created, `CLAUDE.md` and `docs/` still present and unchanged.

- [ ] **Step 2: Add `"scheme"` to `app.json`**

expo-router requires a URI scheme for deep linking. Open `app.json` and add `"scheme": "coachapp"` inside the `"expo"` object:

```json
{
  "expo": {
    "name": "coach-app",
    "slug": "coach-app",
    "scheme": "coachapp",
    "version": "1.0.0",
    ...
  }
}
```

(Keep all other fields the scaffold generated — only add the `"scheme"` line.)

- [ ] **Step 3: Remove template boilerplate**

The blank TypeScript template includes example screens. Delete them:

```bash
rm -rf app/\(tabs\) app/+not-found.tsx components/ constants/ hooks/
```

```bash
rm -f app/index.tsx
```

- [ ] **Step 4: Install dependencies**

```bash
npx expo install expo-sqlite expo-crypto
npm install nativewind tailwindcss
npm install --save-dev @types/react @types/react-native
```

Expected: no peer dependency errors.

- [ ] **Step 5: Configure NativeWind v4**

Create `global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `metro.config.js` (create if missing):

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
```

Replace `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

- [ ] **Step 6: Configure TypeScript paths**

Replace `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 7: Add NativeWind type reference**

Create `nativewind-env.d.ts` at the project root:

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 8: Update .gitignore**

Append to `.gitignore` (create if missing):

```
node_modules/
.expo/
dist/
*.orig.*
.DS_Store
*.tsbuildinfo
```

- [ ] **Step 9: Verify scaffold compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors. (It may warn about missing `app/` files — that's fine, they'll be added in later tasks.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app with NativeWind v4 and expo-sqlite"
```

---

## Task 2: Database layer

**Files:**
- Create: `lib/db/database.ts`
- Create: `lib/db/players.ts`

- [ ] **Step 1: Create the database module**

> **Deviation from spec:** Two intentional changes from the spec's pseudocode: (1) `setupDatabase(db: SQLiteDatabase)` → `setupDatabase()` — the no-arg form calls an internal `getDb()` singleton; callers never need to pass a database handle. (2) The spec pseudocode destructures `getFirstAsync` directly (`const { user_version } = ...`), which crashes if the row is null; this plan uses `row?.user_version ?? 0` for null-safety. Both deviations improve the implementation.

Create `lib/db/database.ts`:

```ts
import * as SQLite from 'expo-sqlite'

// One migration per sub-project. Never edit existing entries — only append.
const MIGRATIONS: string[] = [
  // Migration 1 — Sub-project 1: initial schema
  `CREATE TABLE IF NOT EXISTS players (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    number     INTEGER,
    created_at TEXT NOT NULL
  );`,
  // Sub-project 2 will append migration 2 here.
]

let _db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('coach.db')
  }
  return _db
}

export async function setupDatabase(): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
  const currentVersion = row?.user_version ?? 0

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i])
    await db.execAsync(`PRAGMA user_version = ${i + 1}`)
  }
}
```

- [ ] **Step 2: Create the players module**

> **Addition beyond spec:** The spec lists `getPlayers`, `createPlayer`, `updatePlayer`, `deletePlayer`. This plan adds `getPlayerById` — required by `edit-player.tsx` to pre-fill the form when opening the modal.

Create `lib/db/players.ts`:

```ts
import * as Crypto from 'expo-crypto'
import { getDb } from './database'

export interface Player {
  id: string
  name: string
  number: number | null
  created_at: string
}

export async function getPlayers(): Promise<Player[]> {
  const db = await getDb()
  // number IS NULL sorts nulls last in ASC; then sort by number, then name
  return db.getAllAsync<Player>(
    'SELECT * FROM players ORDER BY (number IS NULL) ASC, number ASC, name ASC'
  )
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const db = await getDb()
  return db.getFirstAsync<Player>('SELECT * FROM players WHERE id = ?', [id]) ?? null
}

export async function createPlayer(data: {
  name: string
  number: number | null
}): Promise<Player> {
  const db = await getDb()
  const id = Crypto.randomUUID()
  const created_at = new Date().toISOString()
  await db.runAsync(
    'INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)',
    [id, data.name.trim(), data.number, created_at]
  )
  return { id, name: data.name.trim(), number: data.number, created_at }
}

export async function updatePlayer(
  id: string,
  data: { name: string; number: number | null }
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'UPDATE players SET name = ?, number = ? WHERE id = ?',
    [data.name.trim(), data.number, id]
  )
}

export async function deletePlayer(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM players WHERE id = ?', [id])
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add SQLite database layer with migration runner and player CRUD"
```

---

## Task 3: Validation utility

**Files:**
- Create: `lib/validation.ts`

This is a pure TypeScript module (no native dependencies) so it can be unit-tested with Jest.

- [ ] **Step 1: Install Jest**

```bash
npx expo install jest-expo @testing-library/react-native
```

Add to `package.json`:

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 2: Create test directory and write the failing test**

```bash
mkdir -p lib/__tests__
```

Create `lib/__tests__/validation.test.ts`:

```ts
import { validatePlayerForm } from '../validation'

describe('validatePlayerForm', () => {
  it('passes with a name and no number', () => {
    const result = validatePlayerForm('Emma', '')
    expect(result.valid).toBe(true)
    expect(result.nameError).toBe('')
    expect(result.numberError).toBe('')
  })

  it('passes with a name and valid number', () => {
    expect(validatePlayerForm('Liam', '7').valid).toBe(true)
  })

  it('fails when name is empty', () => {
    const result = validatePlayerForm('  ', '')
    expect(result.valid).toBe(false)
    expect(result.nameError).toBe('Name is required')
  })

  it('fails when number is 0', () => {
    const result = validatePlayerForm('Emma', '0')
    expect(result.valid).toBe(false)
    expect(result.numberError).toBe('Must be between 1 and 99')
  })

  it('fails when number is 100', () => {
    expect(validatePlayerForm('Emma', '100').valid).toBe(false)
  })

  it('fails when number is negative', () => {
    expect(validatePlayerForm('Emma', '-1').valid).toBe(false)
  })

  it('fails when number is non-numeric text', () => {
    expect(validatePlayerForm('Emma', 'abc').valid).toBe(false)
  })

  it('passes with number 99 (boundary)', () => {
    expect(validatePlayerForm('Emma', '99').valid).toBe(true)
  })

  it('passes with number 1 (boundary)', () => {
    expect(validatePlayerForm('Emma', '1').valid).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest lib/__tests__/validation.test.ts --no-coverage
```

Expected: FAIL — `validatePlayerForm` is not defined.

- [ ] **Step 4: Implement the validation module**

Create `lib/validation.ts`:

```ts
export interface PlayerFormErrors {
  nameError: string
  numberError: string
  valid: boolean
}

export function validatePlayerForm(name: string, numberStr: string): PlayerFormErrors {
  let valid = true
  let nameError = ''
  let numberError = ''

  if (!name.trim()) {
    nameError = 'Name is required'
    valid = false
  }

  if (numberStr !== '') {
    const n = parseInt(numberStr, 10)
    if (isNaN(n) || n < 1 || n > 99) {
      numberError = 'Must be between 1 and 99'
      valid = false
    }
  }

  return { nameError, numberError, valid }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest lib/__tests__/validation.test.ts --no-coverage
```

Expected: PASS — 9 tests passing.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add lib/
git commit -m "feat: add player form validation with unit tests"
```

---

## Task 4: Navigation shell

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/squad/index.tsx` (skeleton)
- Create: `app/(tabs)/matches/index.tsx`
- Create: `components/EmptyState.tsx`

- [ ] **Step 1: Create the EmptyState component**

Create `components/EmptyState.tsx`:

```tsx
import { View, Text } from 'react-native'

interface EmptyStateProps {
  message: string
  subMessage?: string
}

export function EmptyState({ message, subMessage }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-lg font-semibold text-slate-700 text-center">
        {message}
      </Text>
      {subMessage ? (
        <Text className="text-sm text-slate-400 text-center mt-2">{subMessage}</Text>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2: Create the Matches placeholder screen**

Create `app/(tabs)/matches/index.tsx`:

```tsx
import { View } from 'react-native'
import { EmptyState } from '@/components/EmptyState'

export default function MatchesScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <EmptyState
        message="No matches yet"
        subMessage="Coming in the next update"
      />
    </View>
  )
}
```

- [ ] **Step 3: Create the Squad list skeleton**

Create `app/(tabs)/squad/index.tsx` (minimal, real implementation in Task 5):

```tsx
import { View } from 'react-native'
import { EmptyState } from '@/components/EmptyState'

export default function SquadScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <EmptyState message="Loading squad..." />
    </View>
  )
}
```

- [ ] **Step 4: Create the tab layout**

Create `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="football-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 5: Create the root layout**

Create `app/_layout.tsx`:

```tsx
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { setupDatabase } from '@/lib/db/database'
import '@/global.css'

export default function RootLayout() {
  useEffect(() => {
    setupDatabase().catch(console.error)
  }, [])

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-player"
        options={{ presentation: 'modal', title: 'Add Player', headerShown: true }}
      />
      <Stack.Screen
        name="edit-player"
        options={{ presentation: 'modal', title: 'Edit Player', headerShown: true }}
      />
    </Stack>
  )
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Verify the app runs**

```bash
npx expo start
```

Open Expo Go on your phone (scan QR code) or press `i` for iOS simulator / `a` for Android emulator.

Expected: app opens showing two tabs — "Squad" (empty state) and "Matches" (empty state). No crashes.

- [ ] **Step 8: Commit**

```bash
git add app/ components/EmptyState.tsx
git commit -m "feat: add navigation shell with tab bar and modal screen declarations"
```

---

## Task 5: Squad list screen + PlayerRow component

**Files:**
- Modify: `app/(tabs)/squad/index.tsx`
- Create: `components/PlayerRow.tsx`

- [ ] **Step 1: Create the PlayerRow component**

Create `components/PlayerRow.tsx`:

```tsx
import { TouchableOpacity, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Player } from '@/lib/db/players'

interface PlayerRowProps {
  player: Player
  onPress: () => void
}

export function PlayerRow({ player, onPress }: PlayerRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100"
      activeOpacity={0.7}
    >
      <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3">
        <Text className="text-sm font-bold text-slate-600">
          {player.number ?? '—'}
        </Text>
      </View>
      <Text className="text-base font-medium text-slate-900 flex-1">{player.name}</Text>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  )
}
```

- [ ] **Step 2: Implement the Squad list screen**

Replace `app/(tabs)/squad/index.tsx`:

```tsx
import { useCallback, useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { router, useFocusEffect, Stack } from 'expo-router'
import { getPlayers, type Player } from '@/lib/db/players'
import { PlayerRow } from '@/components/PlayerRow'
import { EmptyState } from '@/components/EmptyState'

export default function SquadScreen() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await getPlayers()
    setPlayers(data)
    setLoading(false)
  }, [])

  useFocusEffect(load)

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: 'Squad',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/add-player')}
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
      ) : players.length === 0 ? (
        <EmptyState
          message="No players yet"
          subMessage="Tap ＋ to add your squad"
        />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PlayerRow
              player={item}
              onPress={() =>
                router.push({ pathname: '/edit-player', params: { id: item.id } })
              }
            />
          )}
          className="flex-1"
        />
      )}
    </View>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Manual verification**

Run `npx expo start`, open on device/simulator.

Verify:
- Squad tab shows empty state with "No players yet — Tap ＋ to add your squad"
- ＋ button is visible in the header (top right)
- Tapping ＋ shows an unmatched route error — expected, `add-player.tsx` is created in Task 6
- Tapping a player row (if any exist) shows an unmatched route error — expected, `edit-player.tsx` is created in Task 7
- Matches tab shows its empty state

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/squad/index.tsx components/PlayerRow.tsx
git commit -m "feat: implement squad list screen with PlayerRow component"
```

---

## Task 6: Add Player modal

**Files:**
- Create: `app/add-player.tsx`

- [ ] **Step 1: Create the Add Player modal**

Create `app/add-player.tsx`:

```tsx
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { createPlayer } from '@/lib/db/players'
import { validatePlayerForm } from '@/lib/validation'

export default function AddPlayerScreen() {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [nameError, setNameError] = useState('')
  const [numberError, setNumberError] = useState('')

  async function handleSave() {
    const result = validatePlayerForm(name, number)
    setNameError(result.nameError)
    setNumberError(result.numberError)
    if (!result.valid) return

    await createPlayer({
      name: name.trim(),
      number: number !== '' ? parseInt(number, 10) : null,
    })
    router.back()
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name field */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma Johnson"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => {}} // move focus to number field if needed
          />
          {nameError ? (
            <Text className="text-red-500 text-sm mt-1">{nameError}</Text>
          ) : null}
        </View>

        {/* Shirt number field */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Shirt number <Text className="text-slate-400">(optional, 1–99)</Text>
          </Text>
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="e.g. 7"
            keyboardType="number-pad"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
            returnKeyType="done"
          />
          {numberError ? (
            <Text className="text-red-500 text-sm mt-1">{numberError}</Text>
          ) : null}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-blue-600 rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">Save Player</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Manual verification**

Run `npx expo start`. Tap ＋ in the Squad header.

Verify:
- Modal slides up from the bottom
- Name field auto-focuses
- Tapping Save with empty name shows "Name is required" inline error
- Entering "0" or "100" for shirt number shows "Must be between 1 and 99"
- Entering a valid name + number and tapping Save dismisses the modal and shows the new player in the list
- Tapping "Cancel" in the header or swiping down dismisses without saving

- [ ] **Step 4: Commit**

```bash
git add app/add-player.tsx
git commit -m "feat: add Add Player modal with validation"
```

---

## Task 7: Edit Player modal

**Files:**
- Create: `app/edit-player.tsx`

- [ ] **Step 1: Create the Edit Player modal**

Create `app/edit-player.tsx`:

```tsx
import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { getPlayerById, updatePlayer, deletePlayer } from '@/lib/db/players'
import { validatePlayerForm } from '@/lib/validation'

export default function EditPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [displayName, setDisplayName] = useState('') // for delete alert title
  const [nameError, setNameError] = useState('')
  const [numberError, setNumberError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      router.back()
      return
    }
    getPlayerById(id).then((player) => {
      if (!player) {
        router.back()
        return
      }
      setName(player.name)
      setNumber(player.number?.toString() ?? '')
      setDisplayName(player.name)
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!id) return
    const result = validatePlayerForm(name, number)
    setNameError(result.nameError)
    setNumberError(result.numberError)
    if (!result.valid) return

    await updatePlayer(id, {
      name: name.trim(),
      number: number !== '' ? parseInt(number, 10) : null,
    })
    router.back()
  }

  function handleDelete() {
    if (!id) return
    Alert.alert(
      `Remove ${displayName}?`,
      'This will permanently remove them from your squad.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deletePlayer(id)
            router.back()
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name field */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emma Johnson"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
            returnKeyType="next"
          />
          {nameError ? (
            <Text className="text-red-500 text-sm mt-1">{nameError}</Text>
          ) : null}
        </View>

        {/* Shirt number field */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Shirt number <Text className="text-slate-400">(optional, 1–99)</Text>
          </Text>
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="e.g. 7"
            keyboardType="number-pad"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
            returnKeyType="done"
          />
          {numberError ? (
            <Text className="text-red-500 text-sm mt-1">{numberError}</Text>
          ) : null}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-blue-600 rounded-xl py-4 items-center mb-4"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">Save Changes</Text>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          onPress={handleDelete}
          className="border border-red-200 rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-red-500 font-medium text-base">Remove player</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Manual verification**

Run `npx expo start`. Add a player, then tap their row.

Verify:
- Edit modal opens with name and number pre-filled
- Editing name/number and tapping Save updates the player in the list
- Tapping Remove player shows alert: "Remove [name]?" with Cancel and Remove buttons
- Tapping Remove in the alert deletes the player and returns to the list
- Tapping Cancel in the alert does nothing
- Direct navigation to `/edit-player` without an `id` param navigates back immediately (no crash)

- [ ] **Step 4: Final type-check and full test run**

```bash
npx tsc --noEmit
npx jest --no-coverage
```

Expected: tsc zero errors, jest 9/9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/edit-player.tsx
git commit -m "feat: add Edit Player modal with pre-fill, save, and delete"
```

---

## Done

All 7 tasks complete. The app has:
- A working Expo SDK 52 project with NativeWind v4 and expo-router v3
- Offline SQLite storage with a versioned migration runner ready for sub-projects 2 and 3
- Squad tab: list players, add, edit, delete — all validated and persisted
- Matches tab: placeholder screen
- 9 unit tests covering all validation edge cases
