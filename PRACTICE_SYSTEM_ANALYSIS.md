# Practice System Architecture & Completion Tracking Analysis

## Overview

This system implements a multi-step practice flow for system design problems (URL Shortener) with comprehensive scoring, progress tracking, and completion management. The architecture uses React Context for state management with localStorage persistence.

---

## 1. Practice Card HTML Generation & Rendering

### Primary Rendering Flow

**File**: `/Users/antoniocoppe/system-design-sandbox/components/practice/PracticeStepContent.tsx`

The practice cards are rendered through a component factory pattern:

```
PracticeFlow (Main Container)
  → PracticeStepContent (Router)
    → Step-specific Component (Renders HTML)
      - FunctionalRequirementsStep
      - NonFunctionalRequirementsStep
      - ApiDefinitionStep
      - SandboxStep
      - ScoreShareStep
```

### Step Components

Each step generates its own HTML card using React:

1. **FunctionalRequirementsStep** (`FunctionalRequirementsStep.tsx`)
   - Renders a textarea for functional requirements description
   - Auto-resizes based on content
   - Shows validation errors/hints
   - Displays character count and quality feedback

2. **NonFunctionalRequirementsStep** (`NonFunctionalRequirementsStep.tsx`)
   - Input fields for RPS, latency, availability
   - Expandable section for numeric targets
   - Text area for performance notes

3. **ApiDefinitionStep** (`ApiDefinitionStep.tsx`)
   - Dynamic endpoint editor
   - Fields: Method, Path, Notes for each endpoint
   - Add/remove endpoint capability

4. **SandboxStep** (`SandboxStep.tsx`)
   - Visual canvas for architecture design
   - Component palette on the right
   - Drag-and-drop node editor

5. **ScoreShareStep** (`ScoreShareStep.tsx`)
   - Shows cumulative score and breakdown by step
   - Displays grade (A-F) based on total score
   - Shows simulation results
   - Share and LinkedIn buttons

### Card Structure Example (ScoreShareStep)

```tsx
<section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
  <div className="text-center space-y-4">
    <div className={`inline-block text-8xl font-bold text-${getGradeColor(grade)}-400`}>
      {grade}
    </div>
    <div className="mt-2 text-2xl font-semibold text-white">{total}/100</div>
  </div>

  {/* Score Breakdown */}
  {/* Improvement Suggestions */}
  {/* Simulation Results */}
</section>
```

---

## 2. Completion & Progress Tracking System

### State Structure

**File**: `/Users/antoniocoppe/system-design-sandbox/lib/practice/types.ts`

```typescript
type PracticeProgress = Record<PracticeStep, boolean>;
// = {
//   functional: boolean,
//   nonFunctional: boolean,
//   api: boolean,
//   sandbox: boolean,
//   score: boolean
// }

type PracticeStep = "functional" | "nonFunctional" | "api" | "sandbox" | "score";
```

### Session State Provider

**File**: `/Users/antoniocoppe/system-design-sandbox/components/practice/session/PracticeSessionProvider.tsx`

**Key Functions**:

```typescript
markStep(step: PracticeStep, value: boolean)
  → Updates state.completed[step] to true/false
  → Called when user completes a step
  → Triggered in PracticeFlow via completeStep()

setStepScore(step: keyof PracticeStepScores, result: FeedbackResult)
  → Stores scoring feedback for each step
  → Updates state.scores[step] with evaluation result
```

### Complete State Structure

```typescript
type PracticeState = {
  slug: "url-shortener";
  requirements: Requirements;
  apiDefinition: PracticeApiDefinitionState;
  design: PracticeDesignState;
  run: PracticeRunState;
  auth: PracticeAuthState;
  completed: PracticeProgress; // ← Completion tracking
  scores?: PracticeStepScores; // ← Scoring results
  iterativeFeedback?: PracticeIterativeFeedback;
  updatedAt: number; // ← Last update timestamp
};
```

### Database/Storage

**File**: `/Users/antoniocoppe/system-design-sandbox/lib/practice/storage.ts`

**Storage Mechanism**:

- **Browser localStorage** with key `sds-practice-${slug}` (e.g., "sds-practice-url-shortener")
- Full state serialized as JSON
- Auto-saves with 400ms debounce
- No backend database integration (client-side only)

```typescript
// Load from storage
loadPractice(slug): PracticeState | null
  → window.localStorage.getItem(storageKey(slug))

// Save to storage (debounced in SessionProvider)
savePractice(state): void
  → window.localStorage.setItem(storageKey(slug), JSON.stringify(state))
```

### Progress Tracking Initialization

**File**: `/Users/antoniocoppe/system-design-sandbox/components/practice/session/PracticeSessionProvider.tsx` (lines 199-206)

```typescript
const deriveInitialStep = (state: PracticeState): PracticeStep => {
  // Returns first incomplete step, or last step if all complete
  for (const step of PRACTICE_STEPS) {
    if (!state.completed[step]) {
      return step; // Resume from incomplete step
    }
  }
  return PRACTICE_STEPS[PRACTICE_STEPS.length - 1]; // "score" step
};
```

---

## 3. Completion & Scoring Flow

### Step Completion Process

**File**: `/Users/antoniocoppe/system-design-sandbox/lib/practice/step-configs.ts`

```typescript
export const completeStep = (session: PracticeSessionValue, step: PracticeStep) => {
  if (session.isReadOnly || session.state.completed[step]) return;
  session.markStep(step, true);
  track("practice_step_completed", { slug: session.state.slug, step });
};
```

**Completion Triggers**:

1. When user clicks "Next" button on a step
2. Only if step validation passes (nextDisabled check returns false)
3. Automatically marked when navigating away from a step

### Validation Requirements by Step

**File**: `/Users/antoniocoppe/system-design-sandbox/lib/practice/step-configs.ts`

| Step          | Validation Rule                          | Min Content       |
| ------------- | ---------------------------------------- | ----------------- |
| functional    | functionalSummary.trim().length >= 50    | 50 chars          |
| nonFunctional | notes.trim().length > 0                  | Any text          |
| api           | Valid endpoints with ≥10 char notes each | 10 chars/endpoint |
| sandbox       | None (always enabled)                    | N/A               |
| score         | N/A (read-only display)                  | N/A               |

### Evaluation & Scoring Flow

**File**: `/Users/antoniocoppe/system-design-sandbox/hooks/usePracticeScoring.ts`

```typescript
evaluateCurrentStep(step, session)
  → Switch on step type:

    case "functional":
      → evaluateFunctionalOptimized()
      → Uses AI-powered keyword matching against config
      → Returns FeedbackResult with score, blocking issues, warnings, positives

    case "nonFunctional":
      → evaluateNonFunctionalRequirements()
      → Validates RPS, latency, availability, availability
      → Checks against optimal ranges

    case "api":
      → evaluateApiOptimized()
      → AI-powered endpoint validation
      → Checks required endpoints exist
      → Validates HTTP methods and path patterns

    case "sandbox":
      → Returns null (scoring happens during simulation run)
      → Design scored based on simulation results
```

### Scoring Configuration

**File**: `/Users/antoniocoppe/system-design-sandbox/lib/scoring/configs/url-shortener.json`

**Score Breakdown** (Total: 100 points):

- Functional Requirements: 20 points
- Non-Functional Requirements: 20 points
- API Definition: 20 points
- High-Level Design: 30 points (based on component/pattern correctness)
- Simulation: 5 points (pass/fail, performance metrics)

**Functional Score Components**:

- Core Requirements (URL shortening, redirection, uniqueness): 15 points
- Optional Requirements (custom aliases, expiration, analytics, etc.): 5 points

---

## 4. User Progress & Data Storage

### Progress Tracking Data Stored

```typescript
// In state.completed
{
  functional: boolean,      // User provided functional requirements
  nonFunctional: boolean,   // User provided performance constraints
  api: boolean,             // User defined API endpoints
  sandbox: boolean,         // User designed system and ran simulation
  score: boolean            // User viewed final score (auth-gated)
}

// In state.scores (FeedbackResult objects)
{
  functional?: {
    score: number,
    maxScore: 20,
    percentage: number,
    blocking: FeedbackItem[],
    warnings: FeedbackItem[],
    positive: FeedbackItem[],
    suggestions: FeedbackItem[]
  },
  nonFunctional?: { ... },
  api?: { ... },
  design?: { ... },
  simulation?: { ... }
}

// In state.run
{
  attempts: number,         // How many times user ran simulation
  chaosMode: boolean,       // Whether chaos testing enabled
  isRunning: boolean,       // Currently running simulation
  lastResult: {
    latencyMsP95: number,
    capacityRps: number,
    meetsRps: boolean,
    meetsLatency: boolean,
    failedByChaos: boolean,
    scoreBreakdown: ScoreBreakdown,
    completedAt: number
  } | null,
  firstPassAt?: number      // Timestamp of first passing run
}
```

### Cumulative Score Calculation

**File**: `/Users/antoniocoppe/system-design-sandbox/lib/scoring/index.ts` (lines 151-195)

```typescript
calculateCumulativeScore(
  functionalResult,
  nonFunctionalResult,
  apiResult,
  designResult,
  simulationResult
): CumulativeScore {
  // Sum individual step scores
  const total = functional + nonFunctional + api + design + simulation

  // Derive grade
  if (total >= 90) grade = "A"
  else if (total >= 80) grade = "B"
  else if (total >= 70) grade = "C"
  else if (total >= 60) grade = "D"
  else grade = "F"

  // Collect top strengths and improvements
  return {
    total: number,
    breakdown: { functional, nonFunctional, api, design, simulation },
    feedback: { strengths: string[], improvements: string[] },
    grade: "A" | "B" | "C" | "D" | "F"
  }
}
```

### Score Display

**File**: `/Users/antoniocoppe/system-design-sandbox/components/practice/steps/ScoreShareStep.tsx`

Shown on Score page (step 5):

```
Overall Grade: A-F (large 8xl text)
Total Points: X/100
Grade Description: (e.g., "Excellent work")

Score Breakdown:
- Functional Requirements: X/20
- Non-Functional Requirements: X/20
- API Definition: X/20
- High-Level Design: X/30

Areas for Improvement:
- List of blocking issues and top warnings

Simulation Results:
- SLO Score
- Checklist Score
- Efficiency Score
```

### User Authentication & Score Completion

**File**: `/Users/antoniocoppe/system-design-sandbox/components/practice/PracticeFlow.tsx` (lines 98-102)

```typescript
// Score step only accessible when authenticated
useEffect(() => {
  if (hydrated && !isReadOnly && currentStep === "score" && (state.auth.isAuthed || isSignedIn)) {
    completeStep(session, "score"); // Mark score as completed
  }
}, [hydrated, isReadOnly, currentStep, session, state.auth.isAuthed, isSignedIn]);
```

---

## 5. Key Integration Points

### Analytics Tracking

**File**: `/Users/antoniocoppe/system-design-sandbox/components/practice/steps/ScoreShareStep.tsx`

```typescript
useEffect(() => {
  if (!score) return;
  track("practice_score_viewed", {
    slug: state.slug,
    score: score.totalScore,
    outcome: score.outcome,
    attempts: state.run.attempts,
  });
}, [score]);

// Also tracks:
track("practice_step_completed", { slug, step });
track("practice_step_viewed", { slug, step });
track("practice_shared", { slug, score, destination });
```

### Read-Only Mode for Shared Links

When sharing a practice session via URL:

- State loaded from URL params instead of localStorage
- `isReadOnly = true`
- Navigation disabled
- Only "score" step shown

---

## 6. Summary: Data Flow

```
1. User starts practice
   ↓
2. PracticeSessionProvider loads state from localStorage
3. deriveInitialStep() determines resume position
4. User completes each step (functional → nonFunctional → api → sandbox → score)

   For each step before score:
   a) User enters content
   b) Validation checks pass (nextDisabled = false)
   c) User clicks "Next"
   d) evaluateCurrentStep() scores the step
   e) setStepScore() stores FeedbackResult
   f) completeStep() marks state.completed[step] = true
   g) setState() triggers savePractice() with 400ms debounce
   h) localStorage updated with new state

5. On sandbox step:
   a) User designs architecture
   b) Clicks "Run" → simulation executes
   c) scoreSimulation() evaluates design
   d) setRun() updates simulation results

6. On score step (auth-required):
   a) calculateCumulativeScore() sums all step scores
   b) ScoreShareStep renders grade, breakdown, improvements
   c) User can share via link or LinkedIn
   d) completeStep("score") marks practice as done

7. Next visit:
   a) localStorage loaded
   b) deriveInitialStep() returns "score" (all steps complete)
   c) User can review their work or start over
```

---

## 7. Key Files Reference

| File                        | Purpose                                |
| --------------------------- | -------------------------------------- |
| PracticeSessionProvider.tsx | State management & persistence         |
| PracticeFlow.tsx            | Main orchestrator & lifecycle          |
| usePracticeScoring.ts       | Step evaluation & feedback             |
| step-configs.ts             | Validation rules & completion logic    |
| storage.ts                  | localStorage integration               |
| types.ts                    | Type definitions for state             |
| ScoreShareStep.tsx          | Final score display & sharing          |
| url-shortener.json          | Scoring criteria & requirements config |
| index.ts (scoring)          | Cumulative score calculation           |
