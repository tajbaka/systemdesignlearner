# Database Migration & Industry Analysis

## 1. Industry Standard Analysis

Top ed-tech and system design interview platforms (e.g., LeetCode, Exponent, ByteByteGo, Pramp) persist significantly more granular data than simple completion flags. This enables features like personalized coaching, progress analytics, and cross-device synchronization.

### What Top Products Store

| Data Category        | Specific Data Points                                                                                                                                                                                     | Purpose                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **User Identity**    | Auth Provider IDs (Clerk/Google), Email, Display Name, Avatar                                                                                                                                            | Cross-device login, community features.                               |
| **Preferences**      | IDE settings (Vim/Emacs), Notification settings                                                                                                                                                          | UX customization.                                                     |
| **Progress/Streaks** | Daily activity streaks, "Problems Solved" counts, Skill Radar Charts                                                                                                                                     | Gamification and user retention.                                      |
| **Session State**    | Current active problem, timer state, last visited step                                                                                                                                                   | Resuming exact state after refresh/device switch.                     |
| **Submissions**      | **Raw Text/Code/Diagrams**: The user's actual input.<br>**Transcripts**: If voice is used, the raw STT output.<br>**Audio**: Links to stored audio blobs (optional but common for high-end coaching).    | Review, historical analysis, and legal/safety audits.                 |
| **Feedback/AI**      | **Generated Feedback**: The specific AI response given.<br>**Rubric Scores**: Breakdown of score by category (e.g., "Scalability: 4/5").<br>**Cost/Token Usage**: input/output tokens used per feedback. | Tracking AI quality, user improvement over time, and cost monitoring. |
| **Telemetry**        | Time spent per step, hints used, number of retries, focus/blur events.                                                                                                                                   | Identifying "stuck" points in content and preventing cheating.        |

---

## 2. Current State vs. Target State

| Feature         | Current (LocalStorage)                        | Target (PostgreSQL)                                                   |
| :-------------- | :-------------------------------------------- | :-------------------------------------------------------------------- |
| **Persistence** | Device-specific. Cleared if cache is wiped.   | Permanent, cloud-based, cross-device.                                 |
| **Scenarios**   | `sds-practice-{slug}` stores huge JSON blobs. | Structured tables: `sessions` -> `submissions`.                       |
| **Progress**    | Boolean flags (`completed`).                  | Granular status: `not_started`, `in_progress`, `submitted`, `graded`. |
| **Identity**    | Anonymous / `anonId`.                         | Authenticated Users (via Clerk/Supabase).                             |
| **Analytics**   | None (or ephemeral).                          | SQL-queryable history of all attempts.                                |

---

## 3. Proposed Database Schema (PostgreSQL)

This schema is designed to work with Supabase (PostgreSQL) and supports the "Design TWO" philosophy where rules and steps are explicit.

### A. Users & Identity

```sql
-- Extends the auth provider's user table (e.g., Supabase auth.users or mapped from Clerk)
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- Matches auth.users.id
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- Preferences
  onboarding_completed BOOLEAN DEFAULT FALSE,

  -- Gamification
  current_streak INT DEFAULT 0,
  last_practice_at TIMESTAMPTZ,
  total_problems_solved INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Example Data: `profiles`

| id       | email                 | display_name      | current_streak | total_problems_solved |
| :------- | :-------------------- | :---------------- | :------------- | :-------------------- |
| `uuid-1` | `antonio@example.com` | `Antonio Coppe`   | 5              | 12                    |
| `uuid-2` | `user@test.com`       | `SystemDesignFan` | 0              | 0                     |

### B. Content Management (The Problems)

_Designed to be versioned so we can update problems without breaking old sessions._

```sql
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- e.g., 'url-shortener'
  title TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT NOT NULL,

  -- Learning Path
  prerequisites UUID[] DEFAULT '{}', -- Array of scenario_ids that must be completed first

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Example Data: `scenarios`

| id       | slug            | title                    | difficulty | prerequisites |
| :------- | :-------------- | :----------------------- | :--------- | :------------ |
| `scen-1` | `url-shortener` | `Design a URL Shortener` | `easy`     | `[]`          |
| `scen-2` | `twitter-feed`  | `Design News Feed`       | `medium`   | `['scen-1']`  |

```sql
CREATE TABLE scenario_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  version_number INT NOT NULL, -- 1, 2, 3...

  -- Full JSON definition of the problem at this point in time
  -- Hints are now structured objects: { "text": "...", "href": "https://..." }
  definition JSONB NOT NULL,

  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(scenario_id, version_number)
);
```

#### Example Data: `scenario_versions`

| id      | scenario_id | version_number | definition (JSONB)                                                                            |
| :------ | :---------- | :------------- | :-------------------------------------------------------------------------------------------- |
| `ver-1` | `scen-1`    | 1              | `{ "steps": [...], "hints": [{ "text": "Use Bloom Filter", "href": "/wiki/bloom-filter" }] }` |

### C. Practice Sessions (The "Run")

_A user's attempt at a specific version of a scenario._

```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  scenario_version_id UUID NOT NULL REFERENCES scenario_versions(id),

  -- State
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT now(),

  -- Aggregate Metrics
  total_time_seconds INT DEFAULT 0,
  overall_score INT, -- 0-100

  -- Resume State (JSON blob for UI state like active tab, scroll position)
  ui_state JSONB DEFAULT '{}'
);
```

#### Example Data: `practice_sessions`

| id       | user_id  | scenario_id | status        | overall_score | started_at            |
| :------- | :------- | :---------- | :------------ | :------------ | :-------------------- |
| `sess-1` | `uuid-1` | `scen-1`    | `in_progress` | `NULL`        | `2023-10-27 10:00:00` |
| `sess-2` | `uuid-1` | `scen-2`    | `completed`   | 85            | `2023-10-26 14:30:00` |

### D. Submissions & Progress (The Data)

_Granular tracking of each step in the flow._

```sql
CREATE TABLE session_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL, -- ID from the scenario definition (e.g., 'requirements', 'high-level-design')

  status TEXT DEFAULT 'pending', -- 'pending', 'skipped', 'completed'

  -- Input Data
  user_input_text TEXT, -- The typed answer
  user_input_audio_url TEXT, -- Path to S3/Storage if voice used
  transcript TEXT, -- STT result
  diagram_json JSONB, -- If this step involved a canvas

  -- Metrics
  time_spent_seconds INT DEFAULT 0,
  attempt_count INT DEFAULT 1,

  completed_at TIMESTAMPTZ,

  UNIQUE(session_id, step_id)
);
```

#### Example Data: `session_steps`

| id       | session_id | step_id        | status      | user_input_text                 | transcript                |
| :------- | :--------- | :------------- | :---------- | :------------------------------ | :------------------------ |
| `step-1` | `sess-1`   | `requirements` | `completed` | `Users need to shorten URLs...` | `(Audio transcript here)` |
| `step-2` | `sess-1`   | `api-design`   | `pending`   | `POST /api/shorten...`          | `NULL`                    |

### E. AI Evaluation & Feedback (The Data)

### E. AI Evaluation & Feedback

_Storing the expensive AI calls and their results._

```sql
CREATE TABLE step_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_step_id UUID NOT NULL REFERENCES session_steps(id) ON DELETE CASCADE,

  -- The AI's Output
  feedback_markdown TEXT, -- The text shown to the user
  score INT, -- 0-100 for this specific step

  -- Structured Analysis (parsed from AI JSON response)
  strengths TEXT[],
  weaknesses TEXT[],
  missing_concepts TEXT[],

  -- Meta
  model_used TEXT, -- e.g., 'gpt-4o', 'gemini-1.5-pro'
  tokens_input INT,
  tokens_output INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Example Data: `step_evaluations`

| id       | session_step_id | score | feedback_markdown                              | tokens_input | tokens_output |
| :------- | :-------------- | :---- | :--------------------------------------------- | :----------- | :------------ |
| `eval-1` | `step-1`        | 90    | `Great job identifying the functional reqs...` | 1024         | 256           |

### F. Community & Social (LeetCode-style)

_Enabling users to learn from each other via shared solutions and discussions._

```sql
-- 1. Shared Solutions (Publicly visible attempts)
CREATE TABLE solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  user_id UUID NOT NULL REFERENCES profiles(id),

  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL, -- The user's explanation
  solution_snapshot JSONB,         -- Full snapshot of steps (Diagram, API design, Requirements)

  upvotes INT DEFAULT 0,
  views INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Comments (Threaded discussions)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Polymorphic-style association (comment on a Scenario OR a Solution)
  scenario_id UUID REFERENCES scenarios(id),
  solution_id UUID REFERENCES solutions(id),
  parent_comment_id UUID REFERENCES comments(id), -- For nested threads

  content TEXT NOT NULL,
  upvotes INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Migration Strategy (LocalStorage -> DB)

Since users currently have data in `localStorage`, we need a "Hydration" strategy upon first login.

1.  **Detection**: When a logged-in user visits the site, the client checks for a `migrated_to_db` flag in `localStorage`.
2.  **Upload**: If the flag is missing, the client reads all `sds-practice-*` keys.
3.  **Sync API**: The client POSTs this data to a `/api/sync-local-progress` endpoint.
4.  **Ingestion**: The server creates `practice_sessions` and `session_steps` records for the valid local data.
5.  **Cleanup**: On success, the client sets `migrated_to_db = true` (and optionally clears old keys, though keeping them as backup is safer).

## 5. Privacy & GDPR Considerations

- **Transcripts**: Explicitly inform users that voice input is transcribed and stored for their review.
- **Retention**: Allow users to "Reset Progress" which should cascade delete their `practice_sessions`.
- **AI Data**: Ensure we don't send PII to AI providers if possible, though system design answers are usually technical.

---

## 6. Detailed Comparison with Initial Data Models (`data-modelling.sql`)

This proposed architecture represents a significant evolution from the initial concepts (`Design ONE` & `Design TWO`) found in `data-modelling.sql`.

### 1. Identity and Personalization

- **Initial (`data-modelling.sql`)**: Used a generic `user_id` (BigInt) with no supporting user table.
- **Current Proposal**: Introduces a dedicated `profiles` table. This tracks Auth IDs (Clerk/Supabase), user preferences, and gamification metrics (streaks, total problems solved), enabling a personalized experience.

### 2. Content Versioning (Architectural Shift)

- **Initial (Design TWO)**: Used a `problem_step_rules` table to normalize behavior, which makes handling historical data difficult if rules change.
- **Current Proposal**: Replaces normalized rules with a `scenario_versions` table containing an **immutable `definition` JSONB blob**.
  - **Benefit**: Ensures that if a prompt or rule updates, users' past attempts remain tied to the specific version they completed. It also simplifies data fetching.

### 3. Rich AI Evaluations

- **Initial**: Had a simple `score` column.
- **Current Proposal**: Proposes a dedicated `step_evaluations` table capturing the full richness of AI interaction:
  - Markdown feedback, strengths, weaknesses, and missing concepts.
  - Metadata for cost tracking (`tokens_input/output`) and model selection (`model_used`).

### 4. Multimodal Input Support

- **Initial**: Relied on generic `metadata JSONB` for user input.
- **Current Proposal**: Explicitly defines columns for modern inputs in `session_steps`: `transcript` (for voice/STT), `user_input_audio_url`, and `diagram_json` (for canvas-based steps).

### 5. Technical Standardizations

- **Initial**: Used `BIGSERIAL` (integers) for IDs.
- **Current Proposal**: Moves to `UUID`, which is better for distributed systems and client-side generation.
- **Renaming**: Tables renamed for better domain alignment:
  - `problems` → `scenarios`
  - `user_problems` → `practice_sessions`
  - `user_problem_steps` → `session_steps`

### Summary Table

| Feature            | `data-modelling.sql`                    | `DATABASE_MIGRATION_ANALYSIS.md` (Current) |
| :----------------- | :-------------------------------------- | :----------------------------------------- |
| **Rules/Behavior** | Normalized table (`problem_step_rules`) | Versioned JSON blob (`scenario_versions`)  |
| **User Identity**  | Implicit (ID only)                      | Explicit (`profiles` table)                |
| **Scoring**        | Single `numeric` column                 | Dedicated `step_evaluations` table         |
| **Input Types**    | Generic JSON                            | Explicit Text, Audio, Transcript, Diagram  |
| **Persistence**    | Permanent (Target)                      | Strategy to migrate LocalStorage → DB      |
