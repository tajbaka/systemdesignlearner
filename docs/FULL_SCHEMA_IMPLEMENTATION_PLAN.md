# Full Schema Implementation Plan

This document outlines the phased approach to implement the complete schema from `DATABASE_MIGRATION_ANALYSIS.md`.

## Current State (Implemented)

| Table | Status | Notes |
|-------|--------|-------|
| `profiles` | Partial | Missing gamification fields |
| `practice_sessions` | Different approach | Uses JSONB blob instead of normalized steps |
| `scenario_completions` | Added | Not in original spec but useful |
| `step_evaluations` | Partial | Missing AI token tracking |
| `scenarios` | Not implemented | Kept in code |
| `scenario_versions` | Not implemented | Kept in code |
| `session_steps` | Not implemented | Using JSONB blob |
| `solutions` | Not implemented | Community feature |
| `comments` | Not implemented | Community feature |

---

## Phase 1: Enhanced Profiles with Gamification

**Goal**: Add gamification fields for streaks and progress tracking.

### Schema Changes

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_practice_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_problems_solved INT DEFAULT 0;
```

### Drizzle Schema Update

```typescript
// Add to profiles table in lib/db/schema.ts
onboardingCompleted: boolean("onboarding_completed").default(false),
currentStreak: integer("current_streak").default(0),
lastPracticeAt: timestamp("last_practice_at", { withTimezone: true }),
totalProblemsSolved: integer("total_problems_solved").default(0),
```

### Server Action Changes

```typescript
// lib/actions/practice.ts
export async function updateStreak(): Promise<void> {
  // Calculate if user practiced today
  // If last_practice_at was yesterday, increment streak
  // If last_practice_at was before yesterday, reset streak
  // Update last_practice_at to now
}

export async function incrementProblemsSolved(): Promise<void> {
  // Called when user completes a scenario for the first time
}
```

### UI Changes
- Add streak display to navbar/profile
- Add "Problems Solved" counter to practice page

---

## Phase 2: Scenarios and Versions in Database

**Goal**: Move scenarios from code to database for content management.

### New Tables

```sql
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT NOT NULL,
  prerequisites UUID[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenario_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  definition JSONB NOT NULL, -- Full scenario definition
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, version_number)
);
```

### Migration Script

```typescript
// scripts/migrate-scenarios-to-db.ts
import { scenarios as codeScenarios } from "@/lib/scenarios";

// 1. Insert each scenario from lib/scenarios.ts
// 2. Create version 1 for each with full definition as JSONB
// 3. Mark version 1 as is_current = true
```

### Code Changes

1. Create `lib/db/scenarios.ts` with fetch functions
2. Modify `lib/scenarios.ts` to export fetched data (or deprecate)
3. Update all scenario consumers to use async fetch
4. Consider caching strategy (ISR, React Query)

### Admin UI (Optional)
- Create `/admin/scenarios` for content management
- Version comparison view
- Publish/unpublish controls

---

## Phase 3: Normalized Session Steps

**Goal**: Replace JSONB blob with granular step tracking.

### New Table

```sql
CREATE TABLE session_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL, -- 'functional', 'nonFunctional', 'api', 'highLevelDesign', 'score'

  status TEXT DEFAULT 'pending', -- 'pending', 'skipped', 'completed'

  -- Input Data
  user_input_text TEXT,
  user_input_audio_url TEXT,
  transcript TEXT,
  diagram_json JSONB,

  -- Metrics
  time_spent_seconds INT DEFAULT 0,
  attempt_count INT DEFAULT 1,

  completed_at TIMESTAMPTZ,

  UNIQUE(session_id, step_id)
);
```

### Data Migration

```typescript
// scripts/migrate-jsonb-to-steps.ts
// For each practice_session:
// 1. Parse state_data JSONB
// 2. Extract requirements -> session_steps (functional, nonFunctional)
// 3. Extract apiDefinition -> session_steps (api)
// 4. Extract design -> session_steps (highLevelDesign)
// 5. Extract run -> session_steps (score)
```

### Code Changes

1. Create new server actions for step-level CRUD
2. Modify `PracticeSessionProvider` to save steps individually
3. Keep `state_data` JSONB as cache for fast hydration (optional)
4. Update `step_evaluations` to reference `session_steps` instead of `practice_sessions`

### Breaking Changes
- This is a significant refactor of the practice system
- Consider feature flag for gradual rollout
- May require client-side migration for in-progress sessions

---

## Phase 4: Enhanced Step Evaluations

**Goal**: Add AI model and token tracking for cost monitoring.

### Schema Changes

```sql
ALTER TABLE step_evaluations ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE step_evaluations ADD COLUMN IF NOT EXISTS tokens_input INT;
ALTER TABLE step_evaluations ADD COLUMN IF NOT EXISTS tokens_output INT;

-- If Phase 3 is implemented, add foreign key to session_steps
ALTER TABLE step_evaluations ADD COLUMN IF NOT EXISTS session_step_id UUID REFERENCES session_steps(id);
```

### Drizzle Schema Update

```typescript
// Add to stepEvaluations table
modelUsed: text("model_used"),
tokensInput: integer("tokens_input"),
tokensOutput: integer("tokens_output"),
```

### Code Changes

1. Modify AI scoring functions to return token counts
2. Store model name with each evaluation
3. Create analytics dashboard for cost monitoring

---

## Phase 5: Community Features

**Goal**: Enable solution sharing and discussions.

### New Tables

```sql
CREATE TABLE solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  user_id UUID NOT NULL REFERENCES profiles(id),

  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  solution_snapshot JSONB,

  upvotes INT DEFAULT 0,
  views INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE solution_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(solution_id, user_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),

  scenario_id UUID REFERENCES scenarios(id),
  solution_id UUID REFERENCES solutions(id),
  parent_comment_id UUID REFERENCES comments(id),

  content TEXT NOT NULL,
  upvotes INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (scenario_id IS NOT NULL AND solution_id IS NULL) OR
    (scenario_id IS NULL AND solution_id IS NOT NULL)
  )
);

CREATE TABLE comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
```

### UI Requirements
- Solution submission modal after completing a scenario
- Solution list page per scenario
- Comment threads with replies
- Voting UI
- Moderation tools

### Server Actions
- `createSolution`, `updateSolution`, `deleteSolution`
- `voteSolution`, `unvoteSolution`
- `createComment`, `updateComment`, `deleteComment`
- `voteComment`, `unvoteComment`

---

## Implementation Priority

| Phase | Priority | Effort | Value | Dependencies |
|-------|----------|--------|-------|--------------|
| **Phase 1**: Gamification | Medium | Low | Medium | None |
| **Phase 2**: Scenarios in DB | Low | High | Low | Admin UI needed |
| **Phase 3**: Normalized Steps | Low | Very High | Medium | Major refactor |
| **Phase 4**: AI Tracking | Medium | Low | High | None |
| **Phase 5**: Community | Low | Very High | High | Phase 2 |

### Recommended Order

1. **Phase 4** (AI Tracking) - Low effort, high value for cost monitoring
2. **Phase 1** (Gamification) - Low effort, improves engagement
3. **Phase 2** (Scenarios in DB) - Only if content management is needed
4. **Phase 3** (Normalized Steps) - Only if JSONB causes performance issues
5. **Phase 5** (Community) - Major feature, defer until core product is stable

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSONB -> normalized migration data loss | High | Keep JSONB as backup, run in parallel |
| Scenarios in DB breaks existing sessions | High | Version pinning, gradual rollout |
| Community features attract spam | Medium | Moderation queue, rate limiting |
| AI token tracking overhead | Low | Async logging, batch inserts |

---

## Decision: What Should Be Implemented Now?

Given the current state and the primary goal of **localStorage to DB migration**, I recommend:

### Immediate (This PR)
- Current implementation is sufficient for the migration goal
- **Optional**: Add Phase 4 (AI token tracking) - minimal code change

### Next Sprint
- Phase 1 (Gamification) - Quick wins for user engagement

### Future Consideration
- Phase 2-5 require significant architecture decisions and should be planned separately

Do you want me to proceed with implementing any of these phases?
