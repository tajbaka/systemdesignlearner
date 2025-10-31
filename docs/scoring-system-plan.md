# Practice Step Scoring System - Design Document

## Overview
A comprehensive 0-100 scoring system that evaluates user solutions against optimal reference solutions at each practice step, providing actionable feedback and building a cumulative score.

## Architecture

### 1. Scoring Configuration Schema

Each problem (e.g., "url-shortener") has a JSON configuration file defining:

```typescript
type ScoringConfig = {
  problemId: string;
  title: string;
  totalScore: 100;
  steps: {
    functional: FunctionalScoringConfig;
    nonFunctional: NonFunctionalScoringConfig;
    api: ApiScoringConfig;
    design: DesignScoringConfig;
  };
};
```

### 2. Step-by-Step Scoring Breakdown

#### Step 1: Functional Requirements (Weight: 25/100)

**Core Requirements (20 points)**
- Must be mentioned/included for step completion
- Each missing core requirement blocks progression
- Examples for URL Shortener:
  - URL Shortening (5 pts)
  - Redirection (5 pts)
  - Uniqueness guarantee (5 pts)
  - API endpoints (5 pts)

**Optional Requirements (5 points)**
- Bonus points for including these
- Does not block progression
- Examples:
  - Custom aliases (1 pt)
  - Link expiration (1 pt)
  - Analytics/metrics (1 pt)
  - User accounts (1 pt)
  - URL management (1 pt)

**Scoring Logic:**
```typescript
type FunctionalRequirement = {
  id: string;
  label: string;
  keywords: string[]; // For text matching
  weight: number;
  required: boolean; // Core vs optional
  category: "core" | "optional";
};

type FunctionalScoringConfig = {
  maxScore: 25;
  coreRequirements: FunctionalRequirement[];
  optionalRequirements: FunctionalRequirement[];
  minKeywordsMatch: number; // Minimum keyword matches for credit
};
```

**Feedback Generation:**
- **Negative (Blocking):** Missing core requirements
  - "You haven't mentioned URL redirection - this is core functionality"
  - "Uniqueness of short URLs needs to be explicitly addressed"
- **Positive:** All core requirements met
  - "Great! You've covered all core requirements"
  - "You included [X] optional features: custom aliases, analytics"

#### Step 2: Non-Functional Requirements (Weight: 20/100)

**Decision Tree Based on Functional Requirements:**

The NFR questions should be contextual based on what was selected in Step 1.

```typescript
type NFRDecisionTree = {
  condition: {
    functionalRequirementId: string;
    required: boolean;
  };
  questions: NFRQuestion[];
};

type NFRQuestion = {
  id: string;
  prompt: string;
  category: "scale" | "performance" | "availability" | "security";
  optimalRanges: {
    min?: number;
    max?: number;
    target?: number;
  };
  weight: number;
  feedbackTemplates: {
    tooLow: string;
    tooHigh: string;
    optimal: string;
  };
};
```

**Example Decision Tree:**
- IF user selected "basic-analytics" → Ask about "Acceptable delay for analytics processing"
- IF user selected "rate-limiting" → Ask about "Rate limit threshold (req/sec per IP)"
- ALWAYS ask: Read RPS, Write RPS, P95 latency, Availability

**Scoring Categories:**
1. **Scale expectations** (5 pts): Read/write RPS estimates
2. **Performance targets** (5 pts): Latency requirements (P95/P99)
3. **Availability** (5 pts): Uptime SLA (99%, 99.9%, 99.99%)
4. **Security/Other** (5 pts): Rate limiting, abuse prevention

**Feedback:**
- **Negative:** Unrealistic requirements
  - "1M RPS with 1ms latency is extremely difficult to achieve cost-effectively"
  - "Consider that 99.99% availability typically requires multi-region deployment"
- **Positive:** Well-balanced requirements
  - "Your scale requirements (10K RPS, p95 < 50ms) are realistic and achievable"
  - "Good thinking on 99.9% availability - matches most production services"

#### Step 3: API Definition (Weight: 20/100)

**Evaluation Criteria Based on Previous Steps:**

```typescript
type ApiScoringConfig = {
  maxScore: 20;
  requiredEndpoints: ApiEndpoint[];
  optionalEndpoints: ApiEndpoint[];
  evaluationCriteria: {
    hasCorrectMethods: number; // 5 pts
    pathDesignQuality: number; // 5 pts
    documentationQuality: number; // 5 pts
    alignsWithRequirements: number; // 5 pts
  };
};

type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  pathPattern: RegExp;
  purpose: string;
  requiredBy: string[]; // Links to functional requirement IDs
  weight: number;
  documentationHints: string[]; // Expected topics in notes
};
```

**Example for URL Shortener:**

Core Endpoints (15 pts):
1. **POST /api/v1/shorten** (5 pts)
   - Required for: "URL Shortening" functional req
   - Must document: request body, response format, error codes

2. **GET /api/v1/{shortId}** or **GET /{shortId}** (5 pts)
   - Required for: "Redirection" functional req
   - Must document: 301 vs 302, error handling

3. **GET /api/v1/stats/{shortId}** (5 pts - if analytics selected)
   - Required for: "basic-analytics" functional req
   - Must document: metrics returned

Optional Endpoints (5 pts):
- DELETE /api/v1/{shortId} (2 pts)
- PUT /api/v1/{shortId} (2 pts)
- GET /api/v1/urls (1 pt)

**Scoring Logic:**
1. Check if required endpoints exist (by method + path pattern)
2. Evaluate documentation quality (keyword analysis of notes)
3. Verify alignment with functional requirements
4. Bonus for additional useful endpoints

**Feedback:**
- **Negative (Blocking):**
  - "Missing POST endpoint for creating short URLs"
  - "Your GET /{shortId} endpoint needs documentation about redirect status codes"
  - "You selected analytics but don't have an endpoint to retrieve stats"
- **Positive:**
  - "Excellent API design! All core endpoints are present and well-documented"
  - "Good thinking adding a DELETE endpoint for URL management"

#### Step 4: High-Level Design (Weight: 30/100)

**Complex Decision Tree Based on All Previous Steps:**

```typescript
type DesignScoringConfig = {
  maxScore: 30;
  architecturePatterns: ArchitecturePattern[];
  componentRequirements: ComponentRequirement[];
  pathVerification: PathVerification;
  scoreBreakdown: {
    coreArchitecture: number; // 15 pts
    optionalComponents: number; // 10 pts
    connections: number; // 5 pts
  };
};

type ArchitecturePattern = {
  id: string;
  name: string;
  requiredComponents: string[]; // Component kinds
  requiredConnections: Connection[];
  triggeredBy: {
    functionalReqs?: string[];
    nfrThresholds?: { [key: string]: number };
  };
  weight: number;
  feedbackTemplates: {
    missing: string;
    present: string;
  };
};

type ComponentRequirement = {
  kind: ComponentKind;
  required: boolean;
  requiredBy?: string[]; // Functional requirement IDs
  alternativesAccepted?: ComponentKind[]; // e.g., Redis OR Memcached
  minReplicas?: number;
  weight: number;
};

type PathVerification = {
  criticalPaths: CriticalPath[];
};

type CriticalPath = {
  id: string;
  name: string;
  description: string;
  mustInclude: ComponentKind[];
  mustNotInclude?: ComponentKind[];
  maxHops?: number;
  weight: number;
};
```

**Example Critical Paths for URL Shortener:**

1. **Read/Redirect Path** (15 pts)
   - Must include: Web → API Gateway → Service → Cache → DB
   - Should NOT have: Service → DB direct connection (cache bypass)
   - Max hops: 5-7

2. **Analytics Path** (if selected) (5 pts)
   - Must include: Service → Message Queue → Worker
   - Async pattern required

3. **Rate Limiting Path** (if selected) (3 pts)
   - Must include: API Gateway → Rate Limiter → Service

4. **Admin/Auth Path** (if selected) (2 pts)
   - Must include: Auth → Service

**NFR-Driven Components:**
- Read RPS > 10K → Requires cache (Redis)
- Read RPS > 100K → Requires CDN/edge caching
- Availability 99.9%+ → Requires Load Balancer + replicas
- Analytics selected → Requires async processing (queue + workers)

**Scoring Logic:**
1. Verify critical path exists and is optimal
2. Check all required components are present
3. Validate connections follow best practices
4. Check component replicas match scale requirements
5. Bonus for sophisticated patterns (e.g., CQRS, event sourcing)

**Feedback:**
- **Negative (Blocking):**
  - "Your Service connects directly to DB, bypassing cache - this won't meet your 10ms latency target"
  - "You need a message queue for analytics to avoid slowing down redirects"
  - "With 100K RPS requirement, you need horizontal scaling (add replicas or load balancer)"
- **Negative (Warning):**
  - "Consider adding a CDN for global low-latency access"
  - "Rate limiter should sit before your main service, not after"
- **Positive:**
  - "Excellent! Your cache sits on the critical path, enabling sub-10ms redirects"
  - "Great async design with Kafka + workers for analytics - won't slow main flow"
  - "Smart use of CDN for globally distributed traffic"

#### Step 5: Detailed Design (Weight: 5/100)

Currently the "Sandbox" step - mostly for iteration and verification.

**Scoring:**
- Primarily pass/fail based on simulation results
- 5 bonus points for:
  - Meets RPS requirement
  - Meets latency requirement
  - Passes chaos testing

### 3. Feedback Generation System

```typescript
type FeedbackResult = {
  score: number;
  maxScore: number;
  percentage: number;
  blocking: FeedbackItem[];
  warnings: FeedbackItem[];
  positive: FeedbackItem[];
  suggestions: FeedbackItem[];
};

type FeedbackItem = {
  category: "requirement" | "architecture" | "performance" | "bestPractice";
  severity: "blocking" | "warning" | "positive" | "info";
  message: string;
  relatedTo?: string; // ID of requirement/component
  actionable: string; // What user should do
};
```

**Feedback Rules:**
1. **Blocking feedback** = Missing core requirements (score < threshold)
   - User cannot proceed to next step
   - Must revise current step

2. **Warning feedback** = Missing optional features or suboptimal choices
   - User can proceed but loses points
   - "Continue Anyway" button appears

3. **Positive feedback** = All requirements met or exceeded
   - Shown even when score is good
   - Encourages user
   - "Great job! Moving to next step..."

### 4. Scoring Accumulation

```typescript
type CumulativeScore = {
  total: number; // 0-100
  breakdown: {
    functional: number; // out of 25
    nonFunctional: number; // out of 20
    api: number; // out of 20
    design: number; // out of 30
    simulation: number; // out of 5
  };
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  grade: "A" | "B" | "C" | "D" | "F";
};
```

**Grading Scale:**
- A: 90-100 (Excellent - Production ready)
- B: 80-89 (Good - Minor improvements needed)
- C: 70-79 (Acceptable - Several issues to address)
- D: 60-69 (Needs work - Major gaps)
- F: 0-59 (Incomplete - Missing critical elements)

## Implementation Plan

### Phase 1: Schema & Type Definitions
1. Create `/lib/scoring/types.ts` with all TypeScript types
2. Create `/lib/scoring/schema.ts` with JSON schema validation

### Phase 2: Configuration Files
1. Create `/lib/scoring/configs/url-shortener.json` with complete scoring config
2. Create loader utility to parse and validate configs

### Phase 3: Scoring Engines
1. Create `/lib/scoring/engines/functional.ts` - Text analysis & keyword matching
2. Create `/lib/scoring/engines/nonFunctional.ts` - Range validation & thresholds
3. Create `/lib/scoring/engines/api.ts` - Endpoint matching & documentation quality
4. Create `/lib/scoring/engines/design.ts` - Graph traversal & pattern matching

### Phase 4: Feedback Generator
1. Create `/lib/scoring/feedback.ts` - Template-based feedback generation
2. Implement severity classification (blocking/warning/positive)
3. Create actionable suggestions

### Phase 5: Integration
1. Add scoring hooks to each step component
2. Update VerificationFeedback component to show scores
3. Add score visualization to ScoreShareStep
4. Add cumulative scoring display

## Example: URL Shortener Scoring Config

See `/lib/scoring/configs/url-shortener-example.json` for full implementation.

### Key Scenarios:

**Scenario A: Minimal but correct**
- Core functional reqs only: 20/25
- Basic NFRs: 15/20
- Core APIs only: 15/20
- Basic cache design: 20/30
- Passes simulation: 5/5
- **Total: 75/100 (C - Acceptable)**

**Scenario B: Well-designed production system**
- All functional reqs: 25/25
- Thoughtful NFRs: 20/20
- Complete API design: 20/20
- Sophisticated architecture with analytics, rate limiting: 28/30
- Passes with margin: 5/5
- **Total: 98/100 (A - Excellent)**

**Scenario C: Missing core requirements**
- Missing uniqueness requirement: 15/25 (BLOCKED)
- Cannot proceed to next step
- Feedback: "You must address URL uniqueness to ensure no collisions"

## Technical Considerations

### Text Analysis for Functional Requirements
Use simple keyword matching with fuzzy logic:
- "shorten url" → matches "create short link"
- "redirect" → matches "forward users", "send to original"
- Require minimum 2-3 keyword matches per requirement

### Graph Traversal for Design Evaluation
Use BFS/DFS to find paths from entry point to data stores:
- Start from "Web" node
- Find all paths to "DB" or "Cache"
- Validate intermediate nodes match expected patterns

### Performance
- All scoring should complete in < 500ms
- Cache scoring results per step
- Only re-score when user makes changes

## Future Enhancements

1. **AI-Powered Feedback**: Use LLM to generate contextual explanations
2. **Comparative Analysis**: Show user's solution vs optimal solution side-by-side
3. **Learning Paths**: Recommend resources based on gaps
4. **Difficulty Levels**: Adjust scoring strictness (beginner/intermediate/expert)
5. **Multi-Solution Support**: Accept multiple valid architecture patterns
