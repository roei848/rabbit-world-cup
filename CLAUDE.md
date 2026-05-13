# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Black Rabbit World Cup 2026 — an invite-only score-prediction app. Users predict match scores, earn points, and compete on real-time leaderboards across multiple leagues. Live scores poll from api-football.com every minute and push to all clients via Firestore real-time listeners.

**Live URL:** https://rabbit-world-cup.web.app  
**Firebase project:** `rabbit-world-cup`  
**Design reference:** `rabbit cup 2/` folder (JSX mockups — read-only, not built)

## Commands

### Frontend (repo root)
```bash
npm run dev          # Start Vite dev server
npm run build        # tsc -b && vite build (production)
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run
npm run test:rules   # Firestore security rule tests (requires emulator — see below)
npm run lint         # ESLint
npm run format       # Prettier on src/
```

### Cloud Functions (`functions/`)
```bash
npm run build        # tsc compile to lib/
npm run build:watch  # tsc --watch
npm run test         # vitest run (unit tests only, no emulator)
```

### Firebase
```bash
firebase emulators:start                # Start all emulators (Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, UI 4000)
firebase deploy                         # Deploy everything (hosting + functions + firestore rules/indexes)
firebase deploy --only hosting          # Hosting only
firebase deploy --only functions        # Functions only
firebase functions:secrets:set API_FOOTBALL_KEY   # Update the api-football.com key in Secret Manager
```

### Running a single test
```bash
# Frontend/functions unit test
npx vitest run src/hooks/useLeagues.test.ts

# Security rules test (needs emulator running separately)
npm run test:rules
```

## Architecture

### Two separate TypeScript projects

The repo root is the **React frontend** (Vite, `tsconfig.app.json`). The `functions/` directory is the **Cloud Functions backend** (Node 22, compiles to `functions/lib/`). They share no source — the scoring logic is duplicated intentionally: `src/utils/scoring.ts` (client preview) and `functions/src/scoring.ts` (authoritative server-side calculation).

### Frontend data flow

```
Firestore real-time listeners (hooks/) → React state → UI
User action → firebase/firestore.ts helper or httpsCallable → Firestore/Functions
```

All Firestore access from the client goes through typed helpers in `src/firebase/firestore.ts`, which exports `FirestoreDataConverter`-backed collection refs and CRUD functions. Components never import from `firebase/firestore` directly for writes; they use those helpers.

**AuthContext** (`src/contexts/AuthContext.tsx`) is the source of truth for auth state. `isAdmin` is read from the `/users/{uid}` Firestore doc on every auth state change — it is **not** a Firebase custom claim. Protected routes use `<ProtectedRoute>` and `<AdminRoute>` wrappers in `src/components/layout/ProtectedRoute.tsx`.

### Real-time hooks

Every `use*.ts` hook in `src/hooks/` sets up a Firestore `onSnapshot` listener and returns `{ data, loading, error }`. Hooks clean up listeners on unmount. The leaderboard hook takes a `leagueId` param and switches its listener when the league changes.

### Cloud Functions (`functions/src/index.ts`)

| Function | Trigger | Purpose |
|---|---|---|
| `pollFootballAPI` | Scheduled every 1 min | Smart-skip: only calls api-football.com when live/imminent matches exist; falls back to hourly full sync |
| `lockPicks` | Scheduled every 5 min | Batch-sets `locked: true` on matches where `lockAt <= now` |
| `calculatePoints` | Firestore trigger on `/matches/{matchId}` update | Scores all picks when a match transitions to `finished`; rebuilds leaderboard entries and recomputes ranks |
| `inviteUser` | HTTPS callable (admin only) | Creates `/invites/{token}` doc; returns `{ token, inviteUrl }` for manual sharing |
| `onUserCreated` | `beforeUserCreated` blocking trigger | Validates invite token, creates `/users/{uid}` doc, marks invite used; blocks account creation if no valid invite |
| `seedTournament` | HTTPS callable (admin only) | Fetches all WC 2026 fixtures from api-football.com and seeds `/matches` |
| `cacheWCPlayers` | HTTPS callable (admin only) | Fetches WC squad player list for bonus pick UI |
| `settleBonuses` | HTTPS callable (admin only) | One-shot: awards Top Scorer and WC Winner bonus points |
| `joinLeague` | HTTPS callable (authed) | Server-side league join with code verification and rate limiting |

`API_FOOTBALL_KEY` is a Firebase Secret Manager secret (defined with `defineSecret()` from `firebase-functions/params`). Functions that use the key declare `secrets: [apiFootballKey]` in their options. For local emulator dev, put the key in `functions/.secret.local` (gitignored).

### Scoring rules

Scoring settings live in `/settings/scoring` and are editable by admins. The defaults are:
- Exact score: 3 pts × stage multiplier
- Correct goal difference: 2 pts × stage multiplier  
- Correct winner only: 1 pt × stage multiplier
- Stage multipliers: group×1, r16×2, qf×3, sf×3, final×4
- Bonus: Top Scorer +10, WC Winner +15

The `scorePick()` function in both `src/utils/scoring.ts` and `functions/src/scoring.ts` implements this logic.

### Firestore data model (key collections)

- `/users/{uid}` — profile + `isAdmin` flag + `leagueIds[]`
- `/matches/{matchId}` — fixture data, live score, `locked` flag
- `/picks/{userId}/matches/{matchId}` — user's score prediction + computed points
- `/leagues/{leagueId}` — league metadata + `memberIds[]`
- `/leaderboard/{leagueId}/entries/{userId}` — aggregated points and rank
- `/bonusPicks/{userId}` — top scorer + WC winner predictions
- `/invites/{token}` — invite tokens (7-day expiry, single-use)
- `/settings/scoring` — editable scoring config
- `/settings/system` — `tournamentStartAt`, `lastFullSync`, `apiFootballSeasonId`
- `/auditLog/{logId}` — admin actions, invite sends, user joins

### Admin bootstrap

The first admin user must be set manually: in the Firebase console, open `/users/{uid}` and set `isAdmin: true`. After that, admins can promote others through the admin panel (`/admin/users`).

### Theming

All design tokens are in `src/theme/tokens.ts`. The app has dark and light themes. Components access the current theme via `useTheme()` from `src/theme/ThemeProvider.tsx` and apply inline styles — there is no CSS-in-JS library or Tailwind. Do not add class-based styling.

### Environment variables

Frontend config (VITE_ prefix, baked into build): copy `.env.example` → `.env.local` and fill in Firebase SDK values.

Functions secrets: `API_FOOTBALL_KEY` lives in Firebase Secret Manager for production. For local dev, put it in `functions/.secret.local`.

### Security rules

Firestore rules are in `firestore.rules`. Key invariants:
- Picks are only writable by the owning user **and only while `match.locked === false`** (enforced by a rules-level `get()` on the match doc)
- `isAdmin` is checked by reading the caller's `/users/{uid}` doc directly in rules — not via custom claims
- `leagueIds` on user docs is written only by Cloud Functions (Admin SDK bypasses rules); client writes to that field are blocked

Security rule unit tests live in `tests/security-rules/` and require the Firestore emulator (`npm run test:rules`).
