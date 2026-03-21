# Coach App

## Overview

A mobile-first app for team sports coaches (soccer and other team sports). Designed to be used live on the sideline during a match: manage the squad, track who is on the pitch, record substitutions, time the game and each player's bench time, and capture goals — all in real time.

---

## Core Features

### 1. Squad Management
- Full player roster for the team (names, shirt numbers, positions)
- Per-match attendance: mark which players are present before the game starts
- Distinguish between starters and substitutes at kick-off
- let user shoose type of game (6vs6, 8vs8, 11vs11)
- let user set the time for a game

### 2. Formation & Positions
- Visual or list-based view of the starting players on the pitch
- Each player assigned to a position (e.g. GK, CB, LB, RB, CM, LW, RW, ST)
- Positions are editable before and during the match
- Substitutes bench shown separately

### 3. Substitution Management
- Record a substitution: player comes on, player goes off, position assigned
- The app updates the live formation automatically
- A player coming off moves to the bench (or out of the match entirely)
- Full substitution history logged with timestamps

### 4. Timers

**Match timer (game clock)**
- Tracks each half independently
- Let Counts up (e.g. 0:00 → 45:00) or countdown mode (45:00 → 0:00)
- Start / pause / reset controls
- Halftime pause: resets or holds depending on mode
- Shows current match time at all times

**Bench timer (per player)**
- Each substitute on the bench gets an individual timer
- Timer starts when the player takes a seat on the bench (either from the start or after being substituted off)
- Timer pauses when the player comes on to play
- Shows how long each player has been waiting on the bench

### 5. Player Time Tracking
- Automatically records: player → position → start time → end time
- When a substitution happens, the outgoing player's time is logged
- At the end of the match: full breakdown per player of which position(s) they played and for how long
- Summary view: "Player X played LW for 32 min, then CM for 13 min"

### 6. Goal Tracking
- Log a goal with: scorer (player name), time of goal, own goal flag
- when opponent goal, log is as 'opponent' goal.
- Goals list displayed during and after the match
- Score counter shown prominently (Home: N — Away: N, or just team score)

---

## Data Entities

### Team
- Team name
- Player roster (see below)

### Player
- Name
- Shirt number
- Default position(s)

### Match
- Date
- Opponent name
- Venue (home / away)
- Attendance list (subset of roster who are present)
- Starting lineup (players + positions)
- Substitutes list
- Events (substitutions, goals)
- Result

### Substitution Event
- Timestamp (match time)
- Player coming on
- Player going off
- Position

### Goal Event
- Timestamp (match time)
- Scorer (player or "own goal")

### Player Time Segment
- Player
- Position
- Start time
- End time (or "still playing")

---

## Key Screens

| Screen | Description |
| --- | --- |
| **Squad** | Full player list; manage roster |
| **Match Setup** | Select present players, set starting lineup and positions |
| **Live Match** | Active formation view, match timer, bench with individual timers, quick-access substitution button |
| **Substitute** | Picker to select player on, player off, and position |
| **Goals** | Log a goal; running scoreline |
| **Match Summary** | Post-match stats: minutes per player per position, goals, substitution log |

---

## Design Principles

- **Mobile-first, sideline-friendly:** Large tap targets, high contrast, readable in sunlight
- **Speed over polish:** A coach needs to log a substitution in under 5 seconds
- **Offline-first:** Matches happen in fields with no signal — the app must work fully offline
- **No account required to start:** Onboarding should be instant; data stored locally

---

## Tech Stack (TBD)

Options to evaluate during planning:
- **React Native + Expo** — cross-platform iOS/Android, good offline support
- **PWA (Next.js or plain HTML)** — no app store needed, runs in mobile browser
- Local storage / SQLite for offline-first data persistence

---

## Out of Scope (v1)

- Tactical drawing / pitch editor
- Video recording
- Multi-team / club management
- Cloud sync or sharing (post-v1)
- Referee or opponent tracking
