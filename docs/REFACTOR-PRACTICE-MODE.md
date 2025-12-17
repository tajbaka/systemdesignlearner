# Practice Mode Refactor Plan

## Executive Summary

The current practice mode is tightly coupled to the URL Shortener scenario. Adding a new scenario requires modifying multiple files with hardcoded logic. This refactor aims to make the system fully data-driven so that adding a new scenario only requires creating JSON configuration files.

**Goal:** Add a new practice scenario by dropping in JSON files — no code changes required.

---

## Current State Analysis

### What Works Well (Data-Driven)

| Component               | File                               | How It Works                                              |
| ----------------------- | ---------------------------------- | --------------------------------------------------------- |
| Scenario metadata       | `lib/scenarios.ts`                 | `SCENARIOS` array already supports 9 scenarios            |
| Functional toggles      | `lib/practice/scenario-configs.ts` | Registry pattern with `getScenarioConfig(slug)`           |
| Default state factories | `lib/practice/scenario-configs.ts` | Per-scenario default state generation                     |
| Scoring config loading  | `lib/scoring/index.ts`             | Dynamic import: `import(\`./configs/${problemId}.json\`)` |
| Step navigation         | `lib/practice/step-configs.ts`     | Generic validation rules                                  |
| Component library       | `app/components/data.ts`           | Shared across all scenarios                               |

### What's Broken (Hardcoded for URL Shortener)

#### Critical — Blocks Other Scenarios

| File                           | Issue                                                                    | Line(s) |
| ------------------------------ | ------------------------------------------------------------------------ | ------- |
| `app/practice/[slug]/page.tsx` | `VALID_SLUG = "url-shortener"` — returns 404 for any other scenario      | ~10-15  |
| `hooks/usePracticeScoring.ts`  | `loadScoringConfig("url-shortener")` — ignores `state.slug`              | ~35     |
| `lib/practice/verification.ts` | Direct imports: `import reference from "./reference/url-shortener.json"` | ~1-5    |

#### High Priority — Core Functionality

| File                             | Issue                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| `lib/practice/brief.ts`          | Hardcoded `URL_SHORTENER` scenario lookup, functional order, markdown title |
| `lib/practice/designGuidance.ts` | All 15+ guidance questions are URL shortener specific                       |
| `lib/practice/verification.ts`   | AI prompts hardcode "URL Shortener" text                                    |

#### Medium Priority — User Experience

| File                                         | Issue                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `components/practice/stages/DesignStage.tsx` | Uses `evaluateDesignGuidance()` which is URL shortener specific           |
| `components/practice/PracticeFlow.tsx`       | Onboarding text: "Let's walk through building a URL shortener together"   |
| `lib/practice/defaults.ts`                   | `PRESET_CHOICES`, `URL_SCHEMA`, `CLICK_SCHEMA` all URL shortener specific |

#### Low Priority — Polish

| File                                                          | Issue                                             |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `lib/practice/apiPlaceholders.ts`                             | Specific placeholders for URL shortener endpoints |
| `components/practice/steps/NonFunctionalRequirementsStep.tsx` | Placeholder text mentions "redirect latency"      |
| `components/practice/session/PracticeSessionProvider.tsx`     | Default slug fallbacks to "url-shortener"         |

---

## Proposed Solution

### New JSON Schema for Scenarios

Each scenario will have a comprehensive JSON file in `lib/practice/reference/{slug}.json`:

```json
{
  "slug": "rate-limiter",
  "title": "Rate Limiter",
  "description": "Design a distributed rate limiting system",

  "functional": {
    "toggles": [
      {
        "id": "fixed-window",
        "label": "Fixed Window Algorithm",
        "description": "Simple fixed time window rate limiting",
        "default": true
      },
      {
        "id": "sliding-window",
        "label": "Sliding Window Algorithm",
        "description": "More accurate sliding window implementation",
        "default": false
      }
    ],
    "order": ["fixed-window", "sliding-window", "token-bucket"],
    "labels": {
      "fixed-window": "Fixed Window",
      "sliding-window": "Sliding Window"
    }
  },

  "nonFunctional": {
    "categories": [
      {
        "id": "latency",
        "label": "Latency",
        "description": "Response time requirements",
        "placeholder": "Example: Rate limit check under 5ms...",
        "examples": ["p99 < 10ms", "p50 < 2ms"],
        "quantitative": {
          "min": 1,
          "max": 100,
          "recommended": 10,
          "unit": "ms",
          "metric": "p99"
        }
      }
    ]
  },

  "api": {
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/check",
        "purpose": "Check if request is rate limited",
        "required": true,
        "placeholder": "Check rate limit for client...",
        "requestBody": {
          "client_id": "string",
          "resource": "string"
        },
        "responses": {
          "200": { "allowed": "boolean", "remaining": "number" },
          "429": { "retry_after": "number" }
        }
      }
    ]
  },

  "design": {
    "guidance": {
      "questions": [
        {
          "id": "storage",
          "question": "Where will you store rate limit counters?",
          "hints": ["Consider distributed cache", "Think about TTL"]
        },
        {
          "id": "algorithm",
          "question": "Which rate limiting algorithm fits your requirements?",
          "hints": ["Fixed window is simpler", "Sliding window is more accurate"]
        }
      ],
      "evaluationCriteria": {
        "hasCache": { "kinds": ["cache"], "minCount": 1 },
        "hasService": { "kinds": ["service"], "minCount": 1 }
      }
    },
    "components": {
      "core": ["API Gateway", "Service", "Cache (Redis)"],
      "distributed": ["Service", "Cache (Redis)", "DB (Postgres)"]
    }
  },

  "brief": {
    "title": "Rate Limiter Design Review",
    "sections": {
      "functional": "Functional Requirements",
      "nonFunctional": "Non-Functional Requirements",
      "api": "API Design",
      "design": "System Architecture"
    }
  },

  "onboarding": {
    "welcome": "Let's design a distributed rate limiter together",
    "steps": {
      "functional": "First, let's define what rate limiting features we need",
      "nonFunctional": "Now let's set our performance targets",
      "api": "Design the API interface for your rate limiter",
      "highLevelDesign": "Build your rate limiting architecture",
      "score": "Review your complete design"
    }
  },

  "verification": {
    "systemPrompt": "You are evaluating a rate limiter system design...",
    "criteria": {
      "functional": "Check for rate limiting algorithm implementation",
      "api": "Verify rate limit check and configuration endpoints",
      "design": "Ensure distributed counter storage"
    }
  }
}
```

### Architecture Changes

```
lib/practice/
├── reference/
│   ├── url-shortener.json      # Existing (needs expansion)
│   ├── rate-limiter.json       # New
│   ├── cdn.json                # New
│   └── schema.ts               # TypeScript types for JSON schema
│
├── loader.ts                   # NEW: Central loader for scenario configs
├── scenario-configs.ts         # REFACTOR: Generate from JSON
├── brief.ts                    # REFACTOR: Use JSON data
├── designGuidance.ts           # REFACTOR: Use JSON data
├── verification.ts             # REFACTOR: Use JSON data
├── apiPlaceholders.ts          # REFACTOR: Use JSON data
└── defaults.ts                 # REFACTOR: Use JSON data
```

---

## Implementation Plan

### Phase 1: Unblock Routing (Priority: Critical)

**Goal:** Allow navigation to any valid scenario in practice mode.

**Files to modify:**

1. `app/practice/[slug]/page.tsx`
   - Remove `VALID_SLUG = "url-shortener"` constant
   - Check against `SCENARIOS` array for valid practice-enabled scenarios
   - Add `hasPractice?: boolean` flag to `Scenario` type if needed

**Estimated scope:** ~10 lines changed

```typescript
// Before
const VALID_SLUG = "url-shortener";
if (slug !== VALID_SLUG) notFound();

// After
const scenario = SCENARIOS.find((s) => s.slug === slug && s.hasPractice);
if (!scenario) notFound();
```

---

### Phase 2: Dynamic Scoring (Priority: Critical)

**Goal:** Load correct scoring config based on current scenario.

**Files to modify:**

1. `hooks/usePracticeScoring.ts`
   - Pass `state.slug` to `loadScoringConfig()` instead of hardcoded string

**Estimated scope:** ~5 lines changed

```typescript
// Before
const config = await loadScoringConfig("url-shortener");

// After
const config = await loadScoringConfig(state.slug);
```

---

### Phase 3: Create Scenario Loader (Priority: High)

**Goal:** Central module for loading and caching scenario JSON configs.

**New file:** `lib/practice/loader.ts`

```typescript
import type { ScenarioReference } from "./reference/schema";

const cache = new Map<string, ScenarioReference>();

export async function loadScenarioReference(slug: string): Promise<ScenarioReference> {
  if (cache.has(slug)) return cache.get(slug)!;

  const reference = await import(`./reference/${slug}.json`);
  cache.set(slug, reference.default);
  return reference.default;
}

export function getScenarioReferenceSync(slug: string): ScenarioReference | null {
  return cache.get(slug) ?? null;
}
```

**New file:** `lib/practice/reference/schema.ts`

- Define TypeScript types matching the JSON schema
- Export validation utilities

---

### Phase 4: Refactor Verification (Priority: High)

**Goal:** Remove hardcoded imports, use dynamic loading.

**File:** `lib/practice/verification.ts`

**Current (problematic):**

```typescript
import reference from "./reference/url-shortener.json";
import scoringConfig from "@/lib/scoring/configs/url-shortener.json";
```

**Proposed:**

```typescript
import { loadScenarioReference } from "./loader";

export async function verifyRequirements(state: PracticeState) {
  const reference = await loadScenarioReference(state.slug);
  const scoringConfig = await loadScoringConfig(state.slug);
  // ... rest of verification using dynamic data
}
```

**Changes needed:**

- Make verification functions async
- Update all callers to await
- Parameterize AI prompts using `reference.verification.systemPrompt`

---

### Phase 5: Refactor Brief Generation (Priority: High)

**Goal:** Generate brief from JSON config, not hardcoded logic.

**File:** `lib/practice/brief.ts`

**Current issues:**

- Hardcoded `URL_SHORTENER` scenario lookup
- Hardcoded functional requirement order and labels
- Hardcoded markdown title "# URL Shortener Review"

**Proposed:**

```typescript
export async function generateBrief(state: PracticeState): Promise<string> {
  const reference = await loadScenarioReference(state.slug);

  const title = reference.brief.title;
  const functionalOrder = reference.functional.order;
  const functionalLabels = reference.functional.labels;

  // Generate markdown using dynamic data
  return `# ${title}\n\n...`;
}
```

---

### Phase 6: Refactor Design Guidance (Priority: Medium)

**Goal:** Load guidance questions from JSON.

**File:** `lib/practice/designGuidance.ts`

**Current:** 15+ hardcoded URL shortener specific questions like:

- "What happens when a user submits a URL?"
- "How will you generate unique short codes?"

**Proposed:**

- Move questions to JSON: `reference.design.guidance.questions`
- Keep evaluation logic generic
- Load dynamically based on scenario

```typescript
export async function evaluateDesignGuidance(
  state: PracticeState,
  nodes: PlacedNode[],
  edges: Edge[]
): Promise<GuidanceResult> {
  const reference = await loadScenarioReference(state.slug);
  const questions = reference.design.guidance.questions;
  const criteria = reference.design.guidance.evaluationCriteria;

  // Evaluate using dynamic criteria
}
```

---

### Phase 7: Refactor UI Text (Priority: Medium)

**Goal:** Replace hardcoded onboarding/placeholder text.

**Files to modify:**

1. `components/practice/PracticeFlow.tsx`
   - Load `reference.onboarding.welcome` and step descriptions

2. `components/practice/steps/NonFunctionalRequirementsStep.tsx`
   - Load placeholder text from `reference.nonFunctional.categories[].placeholder`

3. `components/practice/session/PracticeSessionProvider.tsx`
   - Remove hardcoded "url-shortener" default (or keep as sensible fallback)

---

### Phase 8: Migrate scenario-configs.ts (Priority: Medium)

**Goal:** Generate scenario configs from JSON instead of manual registration.

**File:** `lib/practice/scenario-configs.ts`

**Current:**

```typescript
const SCENARIO_CONFIGS: Record<string, ScenarioConfig> = {
  "url-shortener": URL_SHORTENER_CONFIG,
};
```

**Proposed:**

```typescript
export async function getScenarioConfig(slug: string): Promise<ScenarioConfig> {
  const reference = await loadScenarioReference(slug);

  return {
    functionalToggles: reference.functional.toggles,
    defaultRequirements: () => generateDefaultRequirements(reference),
    defaultApiDefinition: () => generateDefaultApi(reference),
    defaultDesignState: () => generateDefaultDesign(reference),
    defaultRunState: () => ({ hasRun: false, simulationResults: null }),
  };
}
```

---

### Phase 9: Expand url-shortener.json (Priority: Low)

**Goal:** Add missing sections to existing JSON to match new schema.

**Current JSON has:**

- `nonFunctional.categories`
- `apiEndpoints`
- `components`

**Need to add:**

- `functional.toggles` (move from scenario-configs.ts)
- `functional.order` and `labels` (move from brief.ts)
- `design.guidance.questions` (move from designGuidance.ts)
- `brief` section
- `onboarding` section
- `verification` section

---

### Phase 10: Create New Scenario JSONs (Priority: Low)

**Goal:** Add JSON files for additional scenarios.

**Recommended first additions:**

1. `rate-limiter.json` — Good second scenario, well-defined scope
2. `cdn.json` — Different architecture pattern
3. `spotify-play.json` — More complex, streaming focus

Each requires:

- Reference JSON file in `lib/practice/reference/`
- Scoring config in `lib/scoring/configs/`

---

## Migration Checklist

### Before Starting

- [x] Create `lib/practice/reference/schema.ts` with TypeScript types
- [ ] Add tests for scenario loader
- [x] Document JSON schema in this file or separate doc

### Phase 1-2 (Critical Path) - COMPLETED

- [x] Update `app/practice/[slug]/page.tsx` routing
- [x] Update `hooks/usePracticeScoring.ts` to use dynamic slug
- [x] Test with existing URL shortener to ensure no regression

### Phase 3-5 (Core Refactor) - COMPLETED

- [x] Create `lib/practice/loader.ts`
- [x] Refactor `verification.ts` to use loader
- [x] Refactor `brief.ts` to use loader (now async with toMarkdown())
- [x] Update all callers for async changes (verify-step route, tests updated)

### Phase 6-8 (Complete Migration) - COMPLETED

- [x] Refactor `designGuidance.ts` (loads question text from JSON)
- [x] Update UI components with dynamic text (PracticeFlow.tsx onboarding tooltips)
- [x] Migrate `scenario-configs.ts` to generate from JSON

### Phase 9-10 (New Content) - PARTIALLY COMPLETED

- [x] Expand `url-shortener.json` with all sections (functional, design guidance, brief, onboarding)
- [ ] Create `rate-limiter.json`
- [ ] Create corresponding scoring config
- [ ] Test new scenario end-to-end

---

## Risk Mitigation

### Breaking Changes

- All verification/brief functions becoming async is a significant change
- Mitigation: Do Phase 1-2 first, ship, then continue with async refactor

### Performance

- Dynamic imports add latency
- Mitigation: Eager loading + caching in loader module

### Type Safety

- JSON files don't have TypeScript checking
- Mitigation:
  - Create Zod schema for runtime validation
  - Build-time validation script
  - Generate types from JSON schema

### Backwards Compatibility

- Existing URL shortener sessions should continue to work
- Mitigation: Keep fallbacks during migration, remove after stable

---

## Success Criteria

After this refactor, adding a new scenario should require:

1. Create `lib/practice/reference/{slug}.json` following schema
2. Create `lib/scoring/configs/{slug}.json` for scoring
3. Add `hasPractice: true` to scenario in `lib/scenarios.ts`

**No other code changes required.**

---

## Appendix: Current File Dependency Graph

```
app/practice/[slug]/page.tsx
    └── components/practice/PracticeFlow.tsx
        ├── components/practice/session/PracticeSessionProvider.tsx
        │   └── lib/practice/scenario-configs.ts
        │       └── lib/practice/defaults.ts
        └── components/practice/steps/*
            ├── FunctionalRequirementsStep.tsx (uses scenario-configs)
            ├── NonFunctionalRequirementsStep.tsx (hardcoded text)
            ├── ApiDefinitionStep.tsx (uses apiPlaceholders)
            ├── SandboxStep.tsx
            │   ├── DesignStage.tsx (uses designGuidance)
            │   └── RunStage.tsx
            └── ScoreShareStep.tsx
                └── hooks/usePracticeScoring.ts (hardcoded slug)
                    ├── lib/practice/verification.ts (hardcoded imports)
                    └── lib/practice/brief.ts (hardcoded content)
```

---

## Open Questions

1. **Should we support hot-reloading of JSON configs in development?**
   - Would speed up iteration when creating new scenarios

2. **Should scoring configs be merged into reference JSON or kept separate?**
   - Current separation makes sense for different concerns
   - But single file per scenario is simpler to manage

3. **How do we handle scenarios that need custom logic beyond JSON config?**
   - Escape hatch: Allow TypeScript modules alongside JSON
   - Example: Complex validation rules, custom simulation parameters

4. **Should we validate JSON at build time or runtime?**
   - Build time catches errors early
   - Runtime is more flexible for dynamic content
