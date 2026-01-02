# localStorage to Database Migration

## Overview

This PR migrates practice session data from browser localStorage to Supabase (PostgreSQL) for authenticated users, enabling cross-device synchronization and persistent progress tracking.

**Branch**: `refactor/localstorage-to-db`

---

## What Changed

### Summary

| Feature | Before | After |
|---------|--------|-------|
| **Practice session storage** | localStorage only | DB for authenticated users, localStorage for anonymous |
| **Cross-device sync** | Not possible | Full sync via database |
| **User profiles** | None | Synced from Clerk via webhook |
| **Scenario completions** | localStorage flags | Tracked in database |
| **AI feedback history** | Lost on cache clear | Persisted in `step_evaluations` table |

### Files Added

| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | Drizzle ORM schema definitions |
| `lib/db/index.ts` | Database client initialization |
| `lib/actions/practice.ts` | Server actions for practice CRUD |
| `hooks/usePracticeStorage.ts` | Auth-aware storage hook |
| `hooks/useLocalStorageMigration.ts` | Migration hook for sign-in |
| `app/api/webhooks/clerk/route.ts` | Clerk user sync webhook |
| `scripts/sync-clerk-users.ts` | One-time user sync script |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `supabase/migrations/20260102000000_practice_sessions.sql` | Database migration |

### Files Modified

| File | Changes |
|------|---------|
| `lib/practice/storage.ts` | Added async DB functions |
| `lib/scenarioProgress.ts` | Added DB-backed completion tracking |
| `components/practice/session/PracticeSessionProvider.tsx` | Auth-aware storage selection |
| `app/practice/PracticePageClient.tsx` | Server-side completion fetching |
| `package.json` | Added drizzle-orm, drizzle-kit, svix |

---

## Architecture

### Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                        User Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Is Signed In?  │
                    └─────────────────┘
                      │           │
                     Yes          No
                      │           │
                      ▼           ▼
              ┌──────────┐  ┌──────────────┐
              │ Database │  │ localStorage │
              │ (Supabase)│  │  (Browser)   │
              └──────────┘  └──────────────┘
```

### Data Flow

1. **Anonymous User**: localStorage only (existing behavior)
2. **Authenticated User**: Database storage via server actions
3. **Sign-in Migration**: localStorage data uploaded to DB on first sign-in

### Database Schema

```
┌─────────────┐       ┌───────────────────┐
│  profiles   │──────<│ practice_sessions │
└─────────────┘       └───────────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│scenario_completions│  │ step_evaluations │
└──────────────────┘  └──────────────────┘
```

---

## Database Schema Details

### `profiles`

Synced from Clerk via webhook. Stores user identity.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,  -- Clerk's user_xxx ID
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### `practice_sessions`

One row per user + scenario combination. Stores full practice state as JSONB.

```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  scenario_slug TEXT NOT NULL,

  current_step practice_step NOT NULL,  -- enum: functional, nonFunctional, api, etc.
  state_data JSONB NOT NULL,            -- Full PracticeState object

  -- Denormalized completion flags for efficient queries
  completed_functional BOOLEAN,
  completed_non_functional BOOLEAN,
  completed_api BOOLEAN,
  completed_high_level_design BOOLEAN,
  completed_score BOOLEAN,

  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  UNIQUE(profile_id, scenario_slug)
);
```

### `scenario_completions`

Tracks first-time completion for gamification/progress display.

```sql
CREATE TABLE scenario_completions (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  scenario_slug TEXT NOT NULL,
  first_completed_at TIMESTAMPTZ,

  UNIQUE(profile_id, scenario_slug)
);
```

### `step_evaluations`

AI feedback storage for history and analytics.

```sql
CREATE TABLE step_evaluations (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES practice_sessions(id),
  step feedback_step NOT NULL,  -- enum: functional, nonFunctional, api, design, simulation

  feedback_data JSONB NOT NULL,  -- Full FeedbackResult object
  score SMALLINT,
  request_content TEXT,          -- For debugging/replay

  created_at TIMESTAMPTZ
);
```

---

## Server Actions

Located in `lib/actions/practice.ts`:

### Profile Management

```typescript
// Get or create profile for current Clerk user
export async function getOrCreateProfile(): Promise<Profile | null>

// Sync profile data from Clerk (called by webhook)
export async function syncProfileFromClerk(
  clerkUserId: string,
  email?: string,
  displayName?: string,
  avatarUrl?: string
): Promise<void>
```

### Practice Sessions

```typescript
// Load practice session from database
export async function getPracticeSession(slug: string): Promise<PracticeState | null>

// Save practice session to database (upsert)
export async function savePracticeSession(state: PracticeState): Promise<void>

// Get all practice sessions for current user
export async function getAllPracticeSessions(): Promise<PracticeSession[]>
```

### Completions

```typescript
// Get all completed scenario slugs for current user
export async function getCompletedScenarios(): Promise<string[]>

// Mark a scenario as completed (first time only)
export async function markScenarioComplete(slug: string): Promise<boolean>
```

### Migration

```typescript
// Migrate localStorage data to database on sign-in
export async function migrateLocalStorageToDb(
  localData: Record<string, PracticeState>
): Promise<void>
```

---

## Client Hooks

### `usePracticeStorage`

Auth-aware storage hook that automatically selects DB or localStorage.

```typescript
import { usePracticeStorage } from "@/hooks/usePracticeStorage";

function MyComponent() {
  const {
    load,           // () => Promise<PracticeState | null>
    save,           // (state: PracticeState) => Promise<void>
    isAuthenticated // boolean
  } = usePracticeStorage(scenarioSlug);

  // Hook handles debouncing (500ms) for DB saves
}
```

### `useLocalStorageMigration`

Migrates localStorage data to DB when user signs in.

```typescript
import { useLocalStorageMigration } from "@/hooks/useLocalStorageMigration";

function App() {
  // Call in a component that renders after sign-in
  useLocalStorageMigration();
}
```

---

## Clerk Webhook Setup

### Endpoint

`POST /api/webhooks/clerk`

### Events Handled

| Event | Action |
|-------|--------|
| `user.created` | Create profile record |
| `user.updated` | Update profile (email, name, avatar) |
| `user.deleted` | Delete profile (cascades to sessions) |

### Verification

Uses Svix for webhook signature verification:

```typescript
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
const payload = await wh.verify(body, headers);
```

### Setup in Clerk Dashboard

1. Go to **Webhooks** → **Add Endpoint**
2. URL: `https://yourdomain.com/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `CLERK_WEBHOOK_SECRET` env var

### Vercel Deployment Protection

If using Vercel preview deployments, add a **Protection Bypass for Automation** secret in:
- Vercel → Project Settings → Deployment Protection → Protection Bypass

---

## Migration Merge Strategy

When a user signs in with existing localStorage data:

1. Read all `sds-practice-*` keys from localStorage
2. For each session, compare `updatedAt` timestamps
3. **Latest wins**: Keep whichever version (local or DB) was updated more recently
4. Upload merged data to database
5. Continue using DB for all future operations

```typescript
// Merge logic in migrateLocalStorageToDb()
if (!existingSession || localState.updatedAt > existingSession.updatedAt) {
  // Upsert local data to DB
}
```

---

## What Stays in localStorage

These remain in localStorage (device-specific preferences):

| Key | File | Reason |
|-----|------|--------|
| `theme` | `components/ThemeProvider.tsx` | Must apply before hydration |
| `sds-tutorial-complete` | `app/components/Tutorial.tsx` | Per-device onboarding |
| `practice-sandbox-tips-seen` | `components/practice/PracticeFlow.tsx` | Per-device preference |
| `practice-onboarding-completed` | `components/practice/PracticeOnboarding.tsx` | Per-device preference |

---

## Environment Variables

New/updated variables:

```bash
# Supabase (already existed, now used by Drizzle)
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Clerk webhook (new)
CLERK_WEBHOOK_SECRET="whsec_..."
```

---

## Running Migrations

### Database Migration

```bash
# Push migration to Supabase
supabase db push --linked
```

### Sync Existing Clerk Users

One-time script to populate `profiles` table with existing Clerk users:

```bash
npx tsx scripts/sync-clerk-users.ts
```

---

## Testing Checklist

### Anonymous User Flow
- [ ] Practice sessions save to localStorage
- [ ] Progress persists across page refreshes
- [ ] No errors in console related to DB

### Authenticated User Flow
- [ ] Practice sessions save to database
- [ ] Progress visible on different devices
- [ ] Scenario completions tracked correctly

### Sign-in Migration Flow
- [ ] Existing localStorage data uploads to DB on first sign-in
- [ ] Latest version wins when conflict exists
- [ ] No data loss after migration

### Webhook Flow
- [ ] New Clerk users create profile automatically
- [ ] Profile updates sync (email, name, avatar)
- [ ] User deletion cascades to all data

---

## Performance Considerations

| Concern | Mitigation |
|---------|------------|
| DB save frequency | 500ms debounce in `usePracticeStorage` |
| Page load blocking | Async loading, optimistic UI |
| Webhook latency | Fire-and-forget, no user-facing delay |
| Large state objects | JSONB compression handled by Postgres |

---

## Known Limitations

1. **JSONB blob approach**: Full `PracticeState` stored as single JSON, not normalized tables. This is intentional for:
   - Faster iteration without migrations
   - Preserving exact client-side state shape
   - Flexibility for schema evolution

2. **No offline support**: DB operations require network. Anonymous users (localStorage) work offline.

3. **No real-time sync**: Changes on one device don't push to other devices in real-time. Refresh required.

---

## Future Improvements

See `docs/FULL_SCHEMA_IMPLEMENTATION_PLAN.md` for:
- Phase 1: Gamification (streaks, problems solved)
- Phase 2: Scenarios in database
- Phase 3: Normalized session steps
- Phase 4: AI token tracking
- Phase 5: Community features
