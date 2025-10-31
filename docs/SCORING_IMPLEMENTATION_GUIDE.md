# Scoring System Implementation Guide

## Overview

A comprehensive 0-100 point scoring system has been built for your practice flow. This system evaluates users at each step and provides contextual feedback (positive, negative, and actionable).

## ✅ What's Been Completed

### 1. Core Infrastructure

#### **Type System** (`lib/scoring/types.ts`)
- Complete TypeScript type definitions for all scoring components
- Types for each step's input/output
- Feedback types (blocking, warning, positive, suggestions)
- Cumulative scoring types

#### **Scoring Engines** (4 engines, ~500 lines each)
1. **`lib/scoring/engines/functional.ts`** - Functional Requirements
   - Keyword matching for text analysis
   - Core vs optional requirement evaluation
   - Minimum keyword threshold checking

2. **`lib/scoring/engines/nonFunctional.ts`** - Non-Functional Requirements
   - Range validation (min/max/target)
   - Contextual question filtering based on functional selections
   - Unrealistic combination detection

3. **`lib/scoring/engines/api.ts`** - API Definition
   - Endpoint pattern matching (regex + exact)
   - HTTP method validation
   - Documentation quality assessment
   - Alignment with functional requirements

4. **`lib/scoring/engines/design.ts`** - High-Level Design
   - Graph traversal (BFS for path finding)
   - Component presence validation
   - Critical path verification
   - Architecture pattern matching
   - Replica count checking

#### **Main Orchestrator** (`lib/scoring/index.ts`)
- Configuration loader
- Step-by-step evaluation functions
- Cumulative score calculator
- Grading system (A-F)
- Utility functions

#### **React Hook** (`lib/scoring/useScoring.ts`)
- `useScoring()` - Full scoring system access
- `useStepScoring()` - Individual step evaluation
- Auto-evaluation support
- State management

### 2. Configuration

#### **URL Shortener Config** (`lib/scoring/configs/url-shortener.json`)
Complete 500-line configuration defining:

**Step 1: Functional (25 pts)**
- Core: URL shortening (5), redirection (5), uniqueness (5), API endpoints (5)
- Optional: Custom aliases (1), expiration (1), analytics (1), auth (1), management (1)

**Step 2: Non-Functional (20 pts)**
- Read RPS (5 pts): 1K-100K optimal
- Write RPS (3 pts): 10-10K optimal
- P95 Latency (5 pts): 5-200ms optimal
- Availability (4 pts): 99-99.99% optimal
- Rate limiting (3 pts): Conditional on functional selections

**Step 3: API (20 pts)**
- Required: POST /shorten (7), GET /{shortId} (7)
- Optional: GET /stats (6), DELETE/PUT/List (5)
- Documentation quality checks

**Step 4: Design (30 pts)**
- Cache-aside pattern (10 pts)
- Async analytics (5 pts)
- Rate limiting layer (3 pts)
- Horizontal scaling (3 pts)
- Component requirements + replica validation

**Step 5: Simulation (5 pts)**
- Meets RPS (2), Meets latency (2), Passes chaos (1)

### 3. UI Components

#### **Updated VerificationFeedback** (`components/practice/VerificationFeedback.tsx`)
- Now accepts `FeedbackResult` for rich feedback
- Score display with percentage
- Color-coded by performance (emerald/blue/amber/rose)
- Positive feedback section
- Suggestions section
- Backward compatible with legacy props

## 📋 Integration Steps

### Quick Start Example

```typescript
// In any practice step component:
import { useStepScoring } from "@/lib/scoring/useScoring";

function FunctionalRequirementsStep() {
  const { state } = usePracticeSession();

  const { result, evaluate, canProceed } = useStepScoring(
    "url-shortener",
    "functional",
    {
      functionalSummary: state.requirements.functionalSummary,
      selectedRequirements: state.requirements.functional,
    },
    false // Set to true for auto-evaluation
  );

  const handleNext = () => {
    const result = evaluate();
    if (result && canProceed) {
      // Move to next step
    }
  };

  return (
    <div>
      {/* Your form */}

      {result && (
        <VerificationFeedback
          feedbackResult={result}
          onRevise={() => {/* Stay on step */}}
          onContinue={canProceed ? handleNext : undefined}
        />
      )}
    </div>
  );
}
```

### Step-by-Step Integration

#### 1. **Functional Requirements Step** (`components/practice/steps/FunctionalRequirementsStep.tsx`)

```typescript
import { useStepScoring } from "@/lib/scoring/useScoring";
import { VerificationFeedback } from "@/components/practice/VerificationFeedback";

export function FunctionalRequirementsStep() {
  const { state, setRequirements } = usePracticeSession();
  const [showFeedback, setShowFeedback] = useState(false);

  const { result, evaluate, canProceed } = useStepScoring(
    "url-shortener",
    "functional",
    {
      functionalSummary: state.requirements.functionalSummary,
      selectedRequirements: state.requirements.functional,
    }
  );

  const handleEvaluate = () => {
    evaluate();
    setShowFeedback(true);
  };

  return (
    <div>
      {/* Existing form */}

      <button onClick={handleEvaluate}>Check My Answer</button>

      {showFeedback && result && (
        <VerificationFeedback
          feedbackResult={result}
          blocking={[]}
          warnings={[]}
          onRevise={() => setShowFeedback(false)}
          onContinue={canProceed ? handleNext : undefined}
        />
      )}
    </div>
  );
}
```

#### 2. **Non-Functional Requirements Step**

```typescript
const { result, evaluate } = useStepScoring(
  "url-shortener",
  "nonFunctional",
  {
    readRps: state.requirements.nonFunctional.readRps,
    writeRps: state.requirements.nonFunctional.writeRps,
    p95RedirectMs: state.requirements.nonFunctional.p95RedirectMs,
    availability: state.requirements.nonFunctional.availability,
    rateLimitNotes: state.requirements.nonFunctional.rateLimitNotes,
    functionalRequirements: state.requirements.functional,
  }
);
```

#### 3. **API Definition Step**

```typescript
const { result, evaluate } = useStepScoring(
  "url-shortener",
  "api",
  {
    endpoints: state.apiDefinition.endpoints,
    functionalRequirements: state.requirements.functional,
  }
);
```

#### 4. **Design/Sandbox Step**

```typescript
const { result, evaluate } = useStepScoring(
  "url-shortener",
  "design",
  {
    nodes: state.design.nodes,
    edges: state.design.edges,
    functionalRequirements: state.requirements.functional,
    nfrValues: {
      readRps: state.requirements.nonFunctional.readRps,
      writeRps: state.requirements.nonFunctional.writeRps,
      p95RedirectMs: state.requirements.nonFunctional.p95RedirectMs,
      availability: state.requirements.nonFunctional.availability,
    },
  }
);
```

#### 5. **Final Score Display** (`components/practice/steps/ScoreShareStep.tsx`)

```typescript
import { useScoring } from "@/lib/scoring/useScoring";
import { getGradeDescription, getGradeColor } from "@/lib/scoring";

export function ScoreShareStep() {
  const { state } = usePracticeSession();
  const { cumulative, calculateCumulative } = useScoring("url-shortener");

  useEffect(() => {
    // Calculate final score on mount
    calculateCumulative();
  }, []);

  if (!cumulative) return <div>Calculating...</div>;

  return (
    <div>
      <div className="text-center">
        <div className={`text-6xl font-bold text-${getGradeColor(cumulative.grade)}-400`}>
          {cumulative.grade}
        </div>
        <div className="text-2xl">{cumulative.total}/100</div>
        <div className="text-zinc-400">{getGradeDescription(cumulative.grade)}</div>
      </div>

      <div className="mt-8">
        <h3>Score Breakdown</h3>
        <ul>
          <li>Functional Requirements: {cumulative.breakdown.functional}/25</li>
          <li>Non-Functional Requirements: {cumulative.breakdown.nonFunctional}/20</li>
          <li>API Definition: {cumulative.breakdown.api}/20</li>
          <li>Design: {cumulative.breakdown.design}/30</li>
          <li>Simulation: {cumulative.breakdown.simulation}/5</li>
        </ul>
      </div>

      <div className="mt-8">
        <h3>Your Strengths</h3>
        <ul>
          {cumulative.feedback.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h3>Areas for Improvement</h3>
        <ul>
          {cumulative.feedback.improvements.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## 🎯 Key Features

### 1. **Context-Aware Scoring**
The system builds a decision tree where later steps depend on earlier choices:
- NFR questions adapt based on selected functional requirements
- API requirements flow from functional selections
- Design patterns trigger based on NFR thresholds

### 2. **Rich Feedback Types**
- **Blocking**: Missing core requirements (can't proceed)
- **Warning**: Suboptimal choices (can proceed with point deduction)
- **Positive**: Reinforcement for good work
- **Suggestions**: Helpful tips and examples

### 3. **Graph-Based Design Evaluation**
- BFS traversal to find critical paths
- Component connectivity validation
- Anti-pattern detection (e.g., cache bypass)
- Replica count validation based on scale requirements

### 4. **Flexible Configuration**
- JSON-based configuration for easy tuning
- Regex pattern matching for APIs
- Keyword-based text analysis
- Weighted scoring with partial credit

## 📊 Example Scoring Scenarios

### Scenario A: Minimal Solution (75/100 - C)
- All core functional requirements: 20/25
- Basic NFRs: 15/20
- Core APIs only: 15/20
- Basic cache design: 20/30
- Passes simulation: 5/5

### Scenario B: Production-Ready (98/100 - A)
- All functional requirements: 25/25
- Well-thought NFRs: 20/20
- Complete API design: 20/20
- Sophisticated architecture: 28/30
- Passes with margin: 5/5

### Scenario C: Missing Core Requirements (Blocked)
- Missing uniqueness: 15/25
- **Cannot proceed** - blocking feedback shown
- User must revise before continuing

## 🚀 Next Steps (To Complete Integration)

1. **Add "Check My Answer" buttons** to each step component
2. **Wire up scoring hooks** in each step
3. **Update PracticeSessionProvider** to store scores
4. **Create final scorecard UI** in ScoreShareStep
5. **Add progress indicators** showing score as user progresses
6. **Test thoroughly** with various input combinations
7. **Tune thresholds** based on user feedback

## 📝 Configuration Customization

To adjust scoring for URL shortener:

1. Edit `/lib/scoring/configs/url-shortener.json`
2. Adjust weights, keywords, or ranges
3. Add/remove requirements
4. Modify feedback templates

To add a new problem:

1. Create `/lib/scoring/configs/new-problem.json`
2. Follow the schema in `url-shortener.json`
3. Call `loadScoringConfig("new-problem")`

## 🧪 Testing

```typescript
// Test functional requirements scoring
import { evaluateFunctionalRequirements } from "@/lib/scoring";
import config from "@/lib/scoring/configs/url-shortener.json";

const result = evaluateFunctionalRequirements(
  {
    functionalSummary: "The system should shorten URLs and redirect users...",
    selectedRequirements: {
      "url-shortening": true,
      "redirection": true,
      "uniqueness": true,
      "api-endpoints": true,
    },
  },
  config.steps.functional
);

console.log(result.score); // e.g., 20/25
console.log(result.percentage); // 80%
console.log(result.blocking); // []
console.log(result.positive); // ["✓ URL Shortening: ...", ...]
```

## 🎨 UI Customization

The `VerificationFeedback` component is fully customizable:
- Colors defined in Tailwind classes
- Icons can be swapped
- Layout is responsive
- Animations with `animate-slide-down`

## 📚 Further Reading

- See `/docs/scoring-system-plan.md` for detailed architecture
- Check individual engine files for implementation details
- Review `url-shortener.json` for complete scoring rules
- Inspect `types.ts` for all available configuration options

## 🐛 Troubleshooting

**Issue**: Scoring returns 0 points
- Check that input format matches expected types
- Verify config is loaded correctly
- Ensure keywords match text (case-insensitive)

**Issue**: Blocking feedback not showing
- Check that `feedbackResult.blocking` has items
- Verify `VerificationFeedback` is receiving prop correctly

**Issue**: Graph traversal not finding paths
- Verify nodes have correct `spec.kind` values
- Check edges have valid `from` and `to` IDs
- Ensure edge direction matters for your use case

---

**Status**: Core implementation complete. Ready for component integration and testing.
