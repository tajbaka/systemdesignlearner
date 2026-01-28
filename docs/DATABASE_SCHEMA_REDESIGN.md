# Database Schema Redesign

This document explains the comprehensive database schema redesign from v2 to v3, including the rationale behind each architectural decision.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problems with the Old Schema](#problems-with-the-old-schema)
3. [New Schema Overview](#new-schema-overview)
4. [Key Architectural Decisions](#key-architectural-decisions)
5. [Table-by-Table Changes](#table-by-table-changes)
6. [Migration Strategy](#migration-strategy)
7. [File Structure](#file-structure)

---

## Executive Summary

The schema redesign transforms a loose JSONB-blob approach into a **hybrid schema**:

- **Relational tables** for entities with relationships (sessions, attempts, evaluations)
- **Typed JSONB** for inner content (step data, design nodes/edges) with strict Zod validation
- Full attempt history and persistent evaluation results
- Metadata-driven scenarios synced from TypeScript via seed script
- Organization-ready structure for future multi-tenancy

**Before:** 4 tables, loose typing, no history, lost evaluations
**After:** 21 tables, type-safe enums, full audit trail, persistent AI feedback

---

## Problems with the Old Schema

| Problem                 | Old Behavior                       | Impact                                     |
| ----------------------- | ---------------------------------- | ------------------------------------------ |
| **Loose typing**        | `step_data.data` is untyped JSONB  | Runtime errors, no IDE autocomplete        |
| **No attempt history**  | Only latest submission stored      | Can't show progress, no analytics          |
| **Lost evaluations**    | AI results discarded after display | Re-evaluation on refresh, wasted API calls |
| **Text enums**          | `step_type` as plain text          | Invalid values possible, no DB validation  |
| **Mixed DB access**     | Drizzle + raw Supabase client      | Inconsistent patterns, harder testing      |
| **No soft delete**      | Hard deletes only                  | No data recovery, GDPR complications       |
| **Hardcoded scenarios** | TypeScript files require deploy    | Can't update content without release       |

---

## New Schema Overview

### Entity Relationship Diagram

```
profiles (1)─────────────(N) practice_sessions (N)─────────────(1) scenarios
    │                              │                                  │
    │                              │ 1:N                              │ 1:N
    │                              ▼                                  ▼
    │                      step_attempts ◄──── evaluation_results   scenario_steps
    │                       (data: JSONB)           │                  │
    │                                               │ 1:N              │ 1:N
    │                                               ▼                  ▼
    │                                     evaluation_result_items   requirements
    │                                                                  │
    │                                                                  │ 1:N
    └─────────────(N) scenario_completions                           hints
```

### Table Count

| Category              | Tables | Purpose                                                                                                                                       |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Core User             | 3      | profiles, practice_sessions, scenario_completions                                                                                             |
| Attempts & Evaluation | 7      | step_attempts, evaluation_results, evaluation_result_items, evaluation_design_feedback, missing_connections, extra_connections, missing_nodes |
| Scenario Metadata     | 9      | scenarios, scenario_steps, requirements, hints, solutions, design_solutions, design_solution_nodes, design_solution_edges, design_edge_hints  |
| Legacy (migration)    | 2      | step_data, practice_sessions_v2                                                                                                               |

---

## Key Architectural Decisions

### 1. Directory Structure vs Single File

**Decision:** Split `lib/db/schema.ts` into `lib/db/schema/` directory with domain-specific files.

**Rationale:**

- Single 200+ line file becomes hard to navigate
- Domain ownership is clearer (evaluations.ts owns all evaluation tables)
- Easier code review (changes isolated to relevant files)
- Follows Drizzle best practices for larger schemas

**Structure:**

```
lib/db/schema/
├── enums.ts        # All pgEnum definitions
├── profiles.ts     # User profiles
├── sessions.ts     # Practice sessions
├── attempts.ts     # Step attempts (JSONB data)
├── evaluations.ts  # AI evaluation results
├── completions.ts  # Gamification tracking
├── scenarios.ts    # Scenario metadata (9 tables)
├── relations.ts    # All Drizzle relations
├── legacy.ts       # Tables to drop after migration
└── index.ts        # Barrel export
```

---

### 2. pgEnum vs Text Columns

**Decision:** Replace text columns with PostgreSQL enum types.

**Before:**

```typescript
stepType: text("step_type").notNull(), // 'intro' | 'functional' | ...
status: text("status").notNull().default("draft"),
```

**After:**

```typescript
export const stepTypeEnum = pgEnum("step_type", [
  "intro", "functional", "nonFunctional", "api", "highLevelDesign", "score",
]);

stepType: stepTypeEnum("step_type").notNull(),
status: stepStatusEnum("status").notNull().default("draft"),
```

**Rationale:**

- **Database-level validation:** Invalid values rejected at INSERT/UPDATE
- **Self-documenting:** `\dT+ step_type` in psql shows allowed values
- **Type safety:** TypeScript infers literal union types from enum
- **Query optimization:** Enums stored as integers internally (smaller, faster)

**Enums created:**
| Enum | Values |
|------|--------|
| `step_type` | intro, functional, nonFunctional, api, highLevelDesign, score |
| `step_status` | draft, submitted, evaluated |
| `http_method` | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| `component_type` | Client, Cdn, APIGateway, Service, Cache, RelationDb, Store |
| `scenario_type` | backend, frontend |
| `api_scope` | endpoint, global |

---

### 3. Relational Tables vs JSONB Blobs

**Decision:** Use relational tables for **entities with relationships**, JSONB for **inner content**.

**The Hybrid Principle:**

```
Entities that need querying, joining, or indexing → Relational tables
Inner content that's always loaded together → Typed JSONB
```

**Examples:**

| Data               | Storage                       | Reason                                        |
| ------------------ | ----------------------------- | --------------------------------------------- |
| Step attempts      | Relational table              | Need to query history, join with evaluations  |
| Evaluation results | Relational table              | Need to query by score, join with attempts    |
| API endpoints      | JSONB in step_attempts.data   | Always loaded together, no cross-user queries |
| Design nodes/edges | JSONB in step_attempts.data   | Complex structure, atomic updates             |
| Requirement config | JSONB in requirements.details | Type-specific, validated via Zod              |

**Rationale:**

- Avoids the "all relational" trap (too many joins, complex migrations)
- Avoids the "all JSONB" trap (no queryability, loose typing)
- JSONB is validated at runtime via Zod schemas (type safety without migration overhead)

---

### 4. Full Attempt History

**Decision:** Store every submission as a new row in `step_attempts`.

**Before:**

```sql
-- step_data: One row per user+scenario+step, overwrites on each submit
UPDATE step_data SET data = $1, attempt_count = attempt_count + 1
WHERE profile_id = $2 AND scenario_slug = $3 AND step_type = $4;
```

**After:**

```sql
-- step_attempts: New row for each submission
INSERT INTO step_attempts (session_id, step_type, attempt_number, data, status)
VALUES ($1, $2, $3, $4, 'submitted');
```

**Rationale:**

- **Analytics:** Track improvement over attempts, identify common mistakes
- **Debugging:** See exactly what user submitted when issue reported
- **UX:** Show "Attempt 3 of 5" progress indicator
- **Compliance:** Audit trail for graded assessments

**Race Condition Prevention:**

```sql
UNIQUE INDEX idx_step_attempts_unique ON step_attempts
  (session_id, step_type, attempt_number)
```

If user double-clicks submit, second INSERT fails with constraint violation → UI shows "Submission already in progress".

---

### 5. Evaluation Persistence

**Decision:** Store AI evaluation results in dedicated tables.

**Before:**

```typescript
// Evaluate, display, discard
const result = await evaluateWithAI(submission);
return result; // Lost on page refresh
```

**After:**

```sql
-- evaluation_results: One row per attempt evaluation
INSERT INTO evaluation_results
  (attempt_id, score, max_score, percentage_score, feedback, is_correct)
VALUES ($1, 85, 100, 0.85, 'Good coverage of...', true);

-- evaluation_result_items: Per-requirement feedback
INSERT INTO evaluation_result_items
  (evaluation_id, requirement_id, complete, feedback, hint_id)
VALUES ($1, 'url-shortening', true, 'Correctly identified...', null);
```

**Rationale:**

- **Cost savings:** Don't re-call AI APIs on page refresh
- **Consistency:** User sees same feedback across sessions
- **Analytics:** Aggregate pass/fail rates per requirement
- **Debugging:** Investigate AI feedback quality issues

**Design-specific feedback** stored in child tables:

- `evaluation_design_feedback` - Container for design step evaluation
- `missing_connections` - Edges user should have added
- `extra_connections` - Edges user added that don't belong
- `missing_nodes` - Components user forgot

---

### 6. Soft Delete Support

**Decision:** Add `deleted_at` timestamp column to profiles and scenarios.

```typescript
// profiles.ts
deletedAt: timestamp("deleted_at", { withTimezone: true }),

// scenarios.ts
deletedAt: timestamp("deleted_at", { withTimezone: true }),
```

**Rationale:**

- **Data recovery:** Accidentally deleted? Restore by setting `deleted_at = null`
- **Audit trail:** Know when and (with triggers) who deleted
- **GDPR:** "Right to erasure" can be soft delete + anonymization
- **Referential integrity:** Foreign keys still valid, no orphaned records

**Query pattern:**

```typescript
// Active records only
const activeProfiles = await db.select().from(profiles).where(isNull(profiles.deletedAt));
```

---

### 7. Metadata-Driven Scenarios

**Decision:** Store scenario configuration in database tables, synced via script.

**Before:**

```typescript
// domains/practice/problems-created/url-shortener.ts
export const urlShortenerConfig: ProblemConfig = {
  slug: "url-shortener",
  steps: [...],
  requirements: [...],
};
// Requires deploy to change
```

**After:**

```sql
-- scenarios table
INSERT INTO scenarios (slug, type, title, total_score, is_published)
VALUES ('url-shortener', 'backend', 'URL Shortener', 100, true);

-- scenario_steps table
INSERT INTO scenario_steps (scenario_id, step_type, max_score, config)
VALUES ($scenario_id, 'functional', 20, '{"minTextLength": 50}');

-- requirements table
INSERT INTO requirements (scenario_step_id, requirement_id, label, weight, details)
VALUES ($step_id, 'url-shortening', 'URL Shortening', 5,
        '{"type": "text", "keywords": ["short", "hash", "encode"]}');
```

**Synced via script:**

```bash
npm run sync-scenarios  # scripts/sync-scenarios.ts
```

**Rationale:**

- **No deploy for content changes:** Fix typo in requirement? Update DB, done.
- **A/B testing:** Different requirements for different user cohorts
- **Admin tooling:** Future admin UI can edit scenarios directly
- **Version control:** TypeScript files remain source of truth, DB is deployment target

---

### 8. No Repository Layer

**Decision:** Use Drizzle ORM directly in service functions.

**Not this:**

```typescript
// ❌ Unnecessary abstraction
class AttemptRepository {
  async create(data: NewAttempt) {
    return db.insert(stepAttempts).values(data).returning();
  }
  async findBySession(sessionId: string) {
    return db.select().from(stepAttempts).where(eq(stepAttempts.sessionId, sessionId));
  }
}
```

**Instead:**

```typescript
// ✅ Drizzle directly in service
export async function submitAttempt(sessionId: string, stepType: StepType, rawData: unknown) {
  const data = StepDataSchema.parse(rawData);

  const [attempt] = await db
    .insert(stepAttempts)
    .values({ sessionId, stepType, attemptNumber, data, status: "submitted" })
    .returning();

  return attempt;
}
```

**Rationale:**

- **Drizzle IS the repository:** It already provides type-safe queries, transactions, relations
- **No value added:** Repository methods would just proxy Drizzle calls
- **Testing:** Mock `db` object directly, or use test database
- **Simplicity:** One less layer to maintain, debug, and document

---

### 9. No Event Bus

**Decision:** Use direct `await` calls instead of event-driven architecture.

**Not this:**

```typescript
// ❌ Event bus (problematic in serverless)
eventBus.emit("attempt.submitted", { attemptId });

eventBus.on("attempt.submitted", async ({ attemptId }) => {
  await evaluationService.evaluate(attemptId);
  await analyticsService.track(attemptId);
});
```

**Instead:**

```typescript
// ✅ Direct calls (serverless-safe)
export async function submitAttempt(...) {
  const attempt = await db.insert(stepAttempts)...;

  // Direct calls - clear flow, easy debugging
  await evaluationService.evaluate(attempt.id);
  await analyticsService.trackAttempt(attempt);

  return attempt;
}
```

**Rationale:**

- **Serverless compatibility:** No persistent connections for event subscriptions
- **Debuggability:** Stack traces show exact call chain
- **Transactional safety:** Can wrap in `db.transaction()` if needed
- **Simplicity:** No event bus infrastructure to configure/maintain

**When events would make sense:**

- Multiple services need decoupling (microservices)
- Fire-and-forget notifications (email, webhooks)
- Cross-process communication

None of these apply to this application.

---

### 10. Requirements JSONB Details Column

**Decision:** Store type-specific requirement configuration in a single JSONB `details` column.

**Alternative considered:**

```sql
-- Separate tables per requirement type
CREATE TABLE text_requirement_details (...);
CREATE TABLE api_requirement_details (...);
```

**Chosen approach:**

```sql
-- Single JSONB column, validated via Zod
CREATE TABLE requirements (
  ...
  details JSONB DEFAULT '{}'
);
```

```typescript
// Zod validation at runtime
const RequirementDetailsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), keywords: z.array(z.string()) }),
  z.object({ type: z.literal("api_endpoint"), method: HttpMethodSchema, correctPath: z.string() }),
  z.object({ type: z.literal("api_global"), scope: z.literal("global") }),
]);
```

**Rationale:**

- **Consistent pattern:** Entities = rows, Config = JSON (same as step_attempts.data)
- **Fewer migrations:** Adding new requirement types doesn't need ALTER TABLE
- **Type safety:** Zod validates at runtime, TypeScript infers types
- **Simpler queries:** No JOINs to get requirement with its details

---

### 11. Legacy Tables Preserved

**Decision:** Keep `step_data` and `practice_sessions_v2` in schema during migration.

```typescript
// lib/db/schema/legacy.ts
/**
 * Legacy Tables - TO BE DROPPED after v3 migration
 *
 * After running scripts/migrate-to-v3.ts and verifying data integrity,
 * remove this file and generate a migration to drop these tables.
 */
export const stepData = pgTable("step_data", { ... });
export const practiceSessionsV2 = pgTable("practice_sessions_v2", { ... });
```

**Rationale:**

- **Data migration:** Need to read from old tables to populate new ones
- **Rollback safety:** If v3 has issues, old tables still have data
- **Gradual transition:** Old API routes can coexist during testing
- **Clean removal:** After 1-2 weeks of v3 stability, drop old tables via migration

---

### 12. Maintenance Window Migration

**Decision:** Single maintenance window instead of dual-write migration.

**Dual-write approach (not chosen):**

```
Week 1: Write to both old and new tables
Week 2: Read from new, write to both
Week 3: Read and write from new only
Week 4: Drop old tables
```

**Maintenance window approach (chosen):**

```
1. Enable "Upgrading" banner (5 min)
2. Run data migration script (10-15 min)
3. Deploy new code (5 min)
4. Verify critical flows (5 min)
5. Remove banner
Total: ~30 minutes
```

**Rationale:**

- **Complexity:** Dual-write adds 3-5 days of development, testing, edge cases
- **Risk:** Dual-write has more failure modes (sync issues, data divergence)
- **Context:** This isn't 24/7 banking software; 30 min downtime is acceptable
- **Simplicity:** One script, one deploy, done

---

## Table-by-Table Changes

### Modified Tables

| Table      | Change                    | Reason              |
| ---------- | ------------------------- | ------------------- |
| `profiles` | Added `deleted_at` column | Soft delete support |

### New Tables

| Table                        | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `practice_sessions`          | Replaces `practice_sessions_v2` with typed enums |
| `step_attempts`              | Full attempt history with typed JSONB            |
| `evaluation_results`         | Persistent AI evaluation scores                  |
| `evaluation_result_items`    | Per-requirement feedback                         |
| `evaluation_design_feedback` | Design step evaluation container                 |
| `missing_connections`        | Design edges user missed                         |
| `extra_connections`          | Design edges user shouldn't have added           |
| `missing_nodes`              | Design components user missed                    |
| `scenarios`                  | Scenario metadata (slug, title, score)           |
| `scenario_steps`             | Step configuration per scenario                  |
| `requirements`               | Requirements with typed details JSONB            |
| `hints`                      | Hints attached to requirements                   |
| `solutions`                  | Example solutions for requirements               |
| `design_solutions`           | Reference design for high-level design step      |
| `design_solution_nodes`      | Nodes in reference design                        |
| `design_solution_edges`      | Edges in reference design                        |
| `design_edge_hints`          | Hints for specific edges                         |

### Legacy Tables (to be dropped)

| Table                  | Replacement         |
| ---------------------- | ------------------- |
| `step_data`            | `step_attempts`     |
| `practice_sessions_v2` | `practice_sessions` |

---

## Migration Strategy

### Phase 1: Prepare (Before Maintenance)

1. ✅ Write and test all new schema files
2. ✅ Generate migration via `drizzle-kit generate`
3. Create data migration script (`scripts/migrate-to-v3.ts`)
4. Test migration against copy of production data
5. Build and test new v3 API routes

### Phase 2: Maintenance Window (~30 min)

1. Enable maintenance banner
2. Run database migration (create new tables)
3. Run data migration script (move data)
4. Deploy new code (v3 API routes)
5. Verify critical flows
6. Remove banner

### Phase 3: Cleanup (1-2 weeks later)

1. Monitor for issues
2. Drop legacy tables (`step_data`, `practice_sessions_v2`)
3. Remove `lib/db/schema/legacy.ts`
4. Remove legacy Supabase client usage

---

## File Structure

### Created Files

```
lib/db/schema/
├── enums.ts           # pgEnum definitions (6 enums)
├── profiles.ts        # User profiles with soft delete
├── sessions.ts        # Practice sessions (replaces v2)
├── attempts.ts        # Step attempts with typed JSONB
├── evaluations.ts     # Evaluation results + items + design feedback
├── completions.ts     # Scenario completions
├── scenarios.ts       # Scenario metadata (9 tables)
├── relations.ts       # All Drizzle relations
├── legacy.ts          # Legacy tables for migration period
└── index.ts           # Barrel export
```

### Modified Files

```
drizzle.config.ts      # Updated schema path to ./lib/db/schema/index.ts
```

### Deleted Files

```
lib/db/schema.ts       # Replaced by directory structure
```

### Generated Files

```
database/drizzle/0000_nostalgic_hawkeye.sql   # Full schema migration
```

---

## Future Considerations

### Organization Support (Multi-tenancy)

The schema is designed for easy extension:

```sql
-- Future migration
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE practice_sessions ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Add RLS policies or service-layer filtering
```

### Performance Indexes

Current indexes cover primary query patterns. Monitor and add:

- `idx_step_attempts_created_at` if querying by date range
- `idx_evaluation_results_score` if leaderboard features added
- GIN index on `step_attempts.data` if querying JSONB fields

### Archival Strategy

For high-volume tables (`step_attempts`, `evaluation_results`):

- Consider time-based partitioning after 1M+ rows
- Archive old attempts to cold storage after N months
- Keep aggregates for analytics, remove raw data
