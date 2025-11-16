# Step 4 (Design/Sandbox) Technical Deep Dive

This document provides a comprehensive technical explanation of what happens when a user clicks "Next" in Step 4 (Design Stage), how the simulation runs, how the design is validated against previous steps, and how the system responds to changes in the architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [The Click Event Flow](#the-click-event-flow)
3. [Verification & Scoring Pipeline](#verification--scoring-pipeline)
4. [Design Scoring Engine](#design-scoring-engine)
5. [Simulation Execution](#simulation-execution)
6. [Path Finding Algorithm](#path-finding-algorithm)
7. [Validation Against Previous Steps](#validation-against-previous-steps)
8. [Component Changes & Re-simulation](#component-changes--re-simulation)
9. [Code Reference Map](#code-reference-map)

---

## Overview

Step 4 is the **Design Stage** where users create their system architecture using a visual board with components (services, databases, caches, etc.) and connections (edges). When the user clicks "Next", the system:

1. **Validates** the architecture has minimum required components
2. **Scores** the design against requirements from Steps 1-3
3. **Simulates** traffic flow through the architecture
4. **Evaluates** whether the design meets functional and non-functional requirements
5. **Provides feedback** on what works and what needs improvement

---

## The Click Event Flow

### Entry Point: User Clicks "Next"

**File**: `components/practice/PracticeFooter.tsx`

```typescript
<button onClick={onNext}>Next</button>
```

### Step 1: Navigation Hook Intercepts

**File**: `hooks/usePracticeNavigation.ts:70-183`

```typescript
const handleNext = async () => {
  if (session.isReadOnly) return;

  // Prevent double-clicks
  if (verification.isVerifying || waitingForSimulation) {
    return;
  }

  // Steps that need scoring evaluation
  const stepsNeedingScoring: PracticeStep[] = ["functional", "nonFunctional", "api", "sandbox"];

  if (stepsNeedingScoring.includes(session.currentStep)) {
    setVerification({ isVerifying: true, result: null, error: null });

    // For sandbox step, check simulation status
    if (session.currentStep === "sandbox") {
      // ... simulation handling
    }
  }
};
```

**What happens:**

1. Checks if already verifying (prevents double-clicks)
2. Sets verification state to show loading UI
3. Routes to sandbox-specific logic

### Step 2: Simulation Check

**File**: `hooks/usePracticeNavigation.ts:84-146`

```typescript
if (session.currentStep === "sandbox") {
  // Check if simulation was run
  if (!session.state.sandbox.simulationCompleted) {
    setVerification({
      isVerifying: false,
      result: {
        blocking: [
          {
            category: "requirement",
            severity: "blocking",
            message: "Please run the simulation before continuing.",
            actionable: "Click the 'Run Simulation' button to test your design.",
          },
        ],
        canProceed: false,
      },
      error: null,
    });
    return;
  }

  // Wait for simulation to complete
  setWaitingForSimulation(true);
  // ... polling logic
}
```

**What happens:**

1. Checks `session.state.sandbox.simulationCompleted` flag
2. If simulation wasn't run, shows blocking error
3. If simulation is running, waits for completion
4. Once complete, proceeds to evaluation

### Step 3: Evaluate Current Step

**File**: `hooks/usePracticeNavigation.ts:150`

```typescript
const result = await evaluateCurrentStep(session.currentStep, session);
```

This calls into `usePracticeScoring.ts`.

---

## Verification & Scoring Pipeline

### Scoring Entry Point

**File**: `hooks/usePracticeScoring.ts:29-115`

```typescript
const evaluateCurrentStep = async (
  step: PracticeStep,
  session: ReturnType<typeof usePracticeSession>
): Promise<FeedbackResult | null> => {
  setScoringFeedback(null);

  switch (step) {
    case "sandbox": {
      const progress = createDesignProgress();
      progress.onProgress(setScoringProgressSteps);

      result = await evaluateDesignOptimized(
        {
          nodes: session.state.design.nodes,
          edges: session.state.design.edges,
          functionalRequirements: session.state.requirements.functional,
          nonFunctionalRequirements: session.state.requirements.nonFunctional,
        },
        config.steps.design,
        {
          useAI: true,
          explainScore: true,
          progress,
        }
      );
      break;
    }
  }
};
```

**What happens:**

1. Creates a progress tracker for UI updates
2. Gathers input data:
   - Design nodes (components placed on board)
   - Design edges (connections between components)
   - Functional requirements from Step 1
   - Non-functional requirements from Step 2
3. Calls `evaluateDesignOptimized` with AI-powered feedback enabled

---

## Design Scoring Engine

### Main Evaluation Function

**File**: `lib/scoring/engines/design.ts:332-466`

```typescript
export async function evaluateDesignOptimized(
  input: DesignScoringInput,
  config: DesignScoringConfig,
  options: EvaluationOptions = {}
): Promise<FeedbackResult> {
  const { useAI = false, explainScore = false, progress } = options;

  const engine = new DesignScoringEngine();

  // Step 1: Fast structural evaluation
  progress?.update("structural", "in_progress");
  const structuralResult = engine.evaluate(input, config);
  progress?.update("structural", "complete");

  // Step 2: AI explanation (if enabled)
  if (useAI && explainScore) {
    progress?.update("ai_feedback", "in_progress");
    const aiResult = await engine.explainWithAI(structuralResult, input, config);
    progress?.update("ai_feedback", "complete");
    return aiResult;
  }

  return structuralResult;
}
```

### Phase 1: Structural Evaluation

**File**: `lib/scoring/engines/design.ts:34-103`

The structural evaluation has multiple phases:

#### 1.1 Component Requirements Check

```typescript
// Check if required components are present
for (const requirement of config.componentRequirements) {
  const matchingNodes = nodes.filter((node) => {
    if (node.spec.kind === requirement.kind) return true;
    if (requirement.alternativesAccepted?.includes(node.spec.kind)) return true;
    return false;
  });

  if (requirement.required && matchingNodes.length === 0) {
    blocking.push({
      category: "requirement",
      severity: "blocking",
      message: requirement.feedbackTemplates.missing,
      relatedTo: requirement.kind,
    });
  } else if (matchingNodes.length > 0) {
    score += requirement.weight;
    positive.push({
      category: "architecture",
      severity: "positive",
      message: requirement.feedbackTemplates.present,
      relatedTo: requirement.kind,
    });
  }
}
```

**What it checks:**

- Is there a Service component? ✓
- Is there a Cache (Redis/Memcached)? ✓
- Is there a Database (Postgres/MySQL/MongoDB)? ✓
- Are there Message Queues (if analytics selected)? ✓
- Are there Worker Pools (if analytics selected)? ✓
- Is there a Rate Limiter (if rate limiting selected)? ✓

**Scoring:**

- Each required component present = +5 points
- Each optional component present = +2-3 points
- Missing required component = blocking error

#### 1.2 Architecture Pattern Validation

```typescript
for (const pattern of config.architecturePatterns) {
  // Check if pattern is required based on functional requirements
  const isRequired = pattern.triggeredBy.functionalReqs?.some(
    (reqId) => functionalRequirements[reqId]
  );

  if (!isRequired && !pattern.required) continue;

  // Validate required components exist
  const hasAllComponents = pattern.requiredComponents.every((kind) =>
    nodes.some((n) => n.spec.kind === kind)
  );

  // Validate required connections exist
  const hasAllConnections = pattern.requiredConnections.every((conn) => {
    return edges.some((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      return fromNode?.spec.kind === conn.from && toNode?.spec.kind === conn.to;
    });
  });

  if (hasAllComponents && hasAllConnections) {
    score += pattern.weight;
    positive.push({
      message: pattern.feedbackTemplates.present,
    });
  }
}
```

**Patterns checked:**

1. **Cache-Aside Pattern**:
   - Service → Cache → Database
   - Required for redirection functionality

2. **Async Event Processing**:
   - Service → Message Queue → Worker Pool
   - Required if analytics selected

3. **Rate Limiting Layer**:
   - API Gateway → Rate Limiter → Service
   - Required if rate limiting selected

4. **Horizontal Scaling**:
   - Load Balancer + multiple Service replicas
   - Required if read RPS > 10,000

#### 1.3 Critical Path Validation

```typescript
for (const criticalPath of config.criticalPaths) {
  if (!criticalPath.required) continue;

  // Find a path from start to end components
  const pathExists = findPath(
    nodes,
    edges,
    criticalPath.startComponents,
    criticalPath.endComponents,
    criticalPath.mustInclude
  );

  if (pathExists) {
    score += criticalPath.weight;
  } else {
    warnings.push({
      message: criticalPath.feedbackTemplates.missing,
    });
  }
}
```

**Critical paths:**

1. **Redirect Path (Read)**:
   - Start: Web/API Gateway
   - Must include: Service, Cache
   - End: Database
   - Max hops: 7, Min hops: 4

2. **Analytics Processing Path**:
   - Start: Service
   - Must include: Message Queue
   - End: Worker Pool
   - Max hops: 3

### Phase 2: AI-Enhanced Feedback

**File**: `lib/scoring/engines/design.ts:121-311`

If AI feedback is enabled, the system uses OpenAI to provide detailed explanations:

```typescript
private async explainWithAI(
  result: FeedbackResult,
  input: DesignScoringInput,
  config: DesignScoringConfig
): Promise<FeedbackResult> {
  const systemPrompt = this.buildSystemPrompt(config);
  const userMessage = this.buildUserMessage(result, input, config);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
  });

  // Parse AI response and enhance feedback
  return enhancedResult;
}
```

**AI receives:**

- Current score breakdown
- List of components in design
- List of connections in design
- Functional requirements from Step 1
- Non-functional requirements from Step 2
- What's working (positive feedback)
- What's missing (warnings/blocking)

**AI provides:**

- Enhanced explanations of architectural decisions
- Specific advice on improving the design
- Context-aware suggestions based on requirements

---

## Simulation Execution

### Simulation Trigger

**File**: `components/practice/stages/RunStage.tsx:168-309`

When user clicks "Run Simulation":

```typescript
const handleRunSimulation = async () => {
  setIsRunning(true);
  setSimulationError(null);

  try {
    // Find path through architecture
    const path = findScenarioPath(design.nodes, design.edges, SCENARIOS.urlShortener);

    // Evaluate the scenario
    const results = evaluateScenario(
      SCENARIOS.urlShortener,
      design.nodes,
      design.edges,
      path.nodeIds
    );

    // Save results
    setSandbox({
      ...design,
      simulationResults: results,
      simulationCompleted: true,
    });

    // Update session
    session.setSimulation({
      simulationResults: results,
      simulationCompleted: true,
    });
  } catch (err) {
    setSimulationError("Simulation failed");
  } finally {
    setIsRunning(false);
  }
};
```

**What happens:**

1. Finds a valid path through the architecture
2. Simulates requests flowing through that path
3. Calculates latencies, throughput, costs
4. Stores results in session state
5. Sets `simulationCompleted = true` flag

---

## Path Finding Algorithm

### Scenario-Based Path Discovery

**File**: `app/components/utils.ts:99-199`

```typescript
export function findScenarioPath(
  nodes: PlacedNode[],
  edges: Edge[],
  scenario: Scenario
): { nodeIds: NodeId[]; missingKinds: string[] } {
  type State = {
    current: NodeId | null;
    path: NodeId[];
    visited: Set<NodeId>;
  };

  // Build bidirectional adjacency map
  const adjacency = buildBidirectionalAdjacency(edges);

  // Index nodes by component kind
  const byKind = new Map<string, NodeId[]>();
  for (const node of nodes) {
    const existing = byKind.get(node.spec.kind) ?? [];
    existing.push(node.id);
    byKind.set(node.spec.kind, existing);
  }

  const missingKinds = new Set<string>();
  let states: State[] = [{ current: null, path: [], visited: new Set() }];

  // For each step in the scenario flow
  for (const step of scenario.flow) {
    const candidates = byKind.get(step.kind) ?? [];
    const nextStates: State[] = [];
    let stepAdvanced = false;

    for (const state of states) {
      for (const candidate of candidates) {
        // Skip if already visited
        if (state.visited.has(candidate)) continue;

        // If first step, just add it
        if (state.current === null) {
          nextStates.push({
            current: candidate,
            path: [candidate],
            visited: new Set([candidate]),
          });
          stepAdvanced = true;
        }
        // Check if candidate is reachable from current
        else if (adjacency.get(state.current)?.has(candidate)) {
          nextStates.push({
            current: candidate,
            path: [...state.path, candidate],
            visited: new Set([...state.visited, candidate]),
          });
          stepAdvanced = true;
        }
      }
    }

    if (!stepAdvanced) {
      missingKinds.add(step.kind);
    }

    states = dedupeStates(nextStates);
  }

  // Return best path found
  const bestState = states.reduce((best, curr) =>
    curr.path.length > best.path.length ? curr : best
  );

  return {
    nodeIds: bestState.path,
    missingKinds: Array.from(missingKinds),
  };
}
```

**Algorithm:**

1. **Build Graph**: Create adjacency map from edges
2. **Index Components**: Map component kinds to node IDs
3. **State Exploration**: For each scenario step:
   - Find all candidate nodes of the required kind
   - Check if reachable from current position
   - Create new states for each valid transition
   - Track visited nodes to avoid cycles
4. **Deduplicate**: Remove duplicate states
5. **Select Best**: Choose longest valid path found

**Example for URL Shortener:**

Scenario flow: `Web → API Gateway → Service → Cache → Database`

```
Step 1: Find "Web" nodes → [web-1]
Step 2: Find "API Gateway" connected to web-1 → [api-gw-1]
Step 3: Find "Service" connected to api-gw-1 → [service-1]
Step 4: Find "Cache (Redis)" connected to service-1 → [cache-1]
Step 5: Find "DB (Postgres)" connected to cache-1 → [db-1]

Result path: [web-1, api-gw-1, service-1, cache-1, db-1]
```

### Scenario Evaluation

**File**: `lib/scenarios.ts:79-186`

Once path is found, simulate request:

```typescript
export function evaluateScenario(
  scenario: Scenario,
  nodes: PlacedNode[],
  edges: Edge[],
  path: NodeId[]
): SimulationResults {
  let totalLatency = 0;
  let minRps = Infinity;
  let totalCost = 0;
  let failureRate = 0;

  const pathComponents: { kind: string; latency: number; rps: number }[] = [];

  // Calculate metrics for each node in path
  for (const nodeId of path) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const spec = node.spec;
    const replicas = node.replicas ?? 1;

    // Latency (affected by load and replicas)
    const latency = spec.baseLatencyMs * (1 + Math.random() * 0.2);
    totalLatency += latency;

    // Throughput (capacity * replicas)
    const effectiveRps = spec.capacityRps * replicas;
    minRps = Math.min(minRps, effectiveRps);

    // Cost
    totalCost += spec.costPerHour * replicas;

    // Failure rate (accumulates)
    failureRate += spec.failureRate;

    pathComponents.push({
      kind: spec.kind,
      latency: Math.round(latency),
      rps: effectiveRps,
    });
  }

  // Check against requirements
  const meetsRpsRequirement = minRps >= scenario.requirements.minRps;
  const meetsLatencyRequirement = totalLatency <= scenario.requirements.maxLatencyMs;

  return {
    success: meetsRpsRequirement && meetsLatencyRequirement,
    latency: Math.round(totalLatency),
    throughput: Math.round(minRps),
    cost: Math.round(totalCost * 100) / 100,
    path: pathComponents,
    meetsRequirements: {
      rps: meetsRpsRequirement,
      latency: meetsLatencyRequirement,
    },
  };
}
```

**Metrics calculated:**

1. **Total Latency**: Sum of all component latencies
2. **System Throughput**: Minimum RPS of any component in path (bottleneck)
3. **Cost**: Sum of all component costs per hour
4. **Failure Rate**: Accumulated probability of failure
5. **Success**: Whether design meets requirements

---

## Validation Against Previous Steps

### How Requirements Flow Through

```
Step 1 (Functional) → Step 2 (Non-Functional) → Step 3 (API) → Step 4 (Design)
        ↓                       ↓                      ↓              ↓
  What to build          How fast/big           Endpoints      Architecture
```

### Functional Requirements → Design

**File**: `lib/scoring/configs/url-shortener.json:437-527`

Each component requirement can be `requiredBy` functional requirements:

```json
{
  "kind": "Cache (Redis)",
  "required": true,
  "requiredBy": ["redirection"],
  "feedbackTemplates": {
    "missing": "A cache layer is essential for fast redirects."
  }
}
```

**Validation logic** (`lib/scoring/engines/design.ts:56-73`):

```typescript
// Component is required if any of its requiredBy conditions are met
const isRequired = requirement.requiredBy?.some((reqId) => functionalRequirements[reqId]);

if (isRequired && matchingNodes.length === 0) {
  // User selected "redirection" but no cache present
  blocking.push({
    message: "Cache is required for redirection",
  });
}
```

**Examples:**

| Functional Requirement | Required Components        |
| ---------------------- | -------------------------- |
| `url-shortening`       | Service, Database          |
| `redirection`          | Service, Cache, Database   |
| `basic-analytics`      | Message Queue, Worker Pool |
| `rate-limiting`        | Rate Limiter               |

### Non-Functional Requirements → Design

**File**: `lib/scoring/configs/url-shortener.json:696-713`

Architecture patterns can be triggered by NFR thresholds:

```json
{
  "id": "horizontal-scaling",
  "triggeredBy": {
    "nfrThresholds": {
      "readRps": 10000
    }
  },
  "requiredComponents": ["Load Balancer"],
  "feedbackTemplates": {
    "missing": "With 10K+ RPS, you need horizontal scaling (Load Balancer + replicas)."
  }
}
```

**Validation logic** (`lib/scoring/engines/design.ts:85-101`):

```typescript
// Check if NFR thresholds trigger this pattern
const isTriggered =
  pattern.triggeredBy.nfrThresholds &&
  Object.entries(pattern.triggeredBy.nfrThresholds).some(
    ([key, threshold]) => nonFunctionalRequirements[key] >= threshold
  );

if (isTriggered && !hasAllComponents) {
  warnings.push({
    message: pattern.feedbackTemplates.missing,
  });
}
```

**Examples:**

| NFR Threshold        | Required Pattern              |
| -------------------- | ----------------------------- |
| readRps > 10,000     | Load Balancer + replicas      |
| p95RedirectMs < 50ms | Cache-aside pattern           |
| availability > 99.9% | Multi-region deployment hints |

### API Definitions → Design

APIs don't directly affect design scoring, but they inform the user about endpoints their architecture needs to support.

---

## Component Changes & Re-simulation

### Real-Time State Management

**File**: `components/practice/stages/DesignStage.tsx:255-348`

When user modifies the board:

```typescript
const handleNodesChange = (newNodes: PlacedNode[]) => {
  setDesign({
    ...design,
    nodes: newNodes,
  });

  // Clear simulation results when design changes
  setSandbox({
    ...design,
    nodes: newNodes,
    simulationCompleted: false,
    simulationResults: null,
  });

  // Clear design score
  session.setStepScore("design", undefined);
};
```

**What happens:**

1. **Update Design State**: New nodes stored in local state
2. **Invalidate Simulation**: Set `simulationCompleted = false`
3. **Clear Score**: Remove previous design score
4. **Force Re-evaluation**: User must re-run simulation

### Change Detection

```typescript
// When a node is added
handleDrop(componentKind) {
  const newNode = createNode(componentKind);
  setDesign({
    nodes: [...design.nodes, newNode],
    edges: design.edges
  });
  invalidateSimulation();
}

// When a node is deleted
handleDeleteNode(nodeId) {
  setDesign({
    nodes: design.nodes.filter(n => n.id !== nodeId),
    edges: design.edges.filter(e => e.from !== nodeId && e.to !== nodeId)
  });
  invalidateSimulation();
}

// When an edge is added
handleConnect(fromId, toId) {
  const newEdge = { id: uuid(), from: fromId, to: toId };
  setDesign({
    nodes: design.nodes,
    edges: [...design.edges, newEdge]
  });
  invalidateSimulation();
}

// When an edge is deleted
handleDeleteEdge(edgeId) {
  setDesign({
    nodes: design.nodes,
    edges: design.edges.filter(e => e.id !== edgeId)
  });
  invalidateSimulation();
}
```

### Re-simulation Flow

```
User modifies board
        ↓
State updated
        ↓
simulationCompleted = false
        ↓
Score cleared
        ↓
User clicks "Run Simulation"
        ↓
New path found
        ↓
New metrics calculated
        ↓
Results displayed
        ↓
simulationCompleted = true
        ↓
User clicks "Next"
        ↓
Design evaluated with new state
```

---

## Code Reference Map

### Key Files & Their Roles

#### Navigation & Orchestration

- **`hooks/usePracticeNavigation.ts`**: Handles "Next" button, verification flow
- **`components/practice/PracticeFlow.tsx`**: Main practice session container
- **`components/practice/PracticeFooter.tsx`**: Footer with navigation buttons

#### Scoring & Evaluation

- **`hooks/usePracticeScoring.ts`**: Evaluates each step, routes to engines
- **`lib/scoring/engines/design.ts`**: Design scoring engine (components, patterns, paths)
- **`lib/scoring/configs/url-shortener.json`**: Requirements and scoring rules
- **`lib/scoring/types.ts`**: TypeScript types for scoring system

#### Simulation

- **`components/practice/stages/RunStage.tsx`**: Simulation UI and execution
- **`lib/scenarios.ts`**: Scenario definitions and evaluation logic
- **`app/components/utils.ts`**: Path finding algorithms
- **`app/components/data.ts`**: Component library with specs

#### Design State Management

- **`components/practice/stages/DesignStage.tsx`**: Design board container
- **`app/components/ReactFlowBoard.tsx`**: React Flow integration
- **`app/components/SystemDesignNode.tsx`**: Individual component rendering
- **`components/practice/session/PracticeSessionProvider.tsx`**: Session state

#### Feedback & UI

- **`components/practice/FeedbackModal.tsx`**: Scoring feedback modal
- **`components/practice/VerificationFeedback.tsx`**: Inline validation feedback
- **`components/practice/EvaluationProgress.tsx`**: Progress indicator during scoring

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Clicks "Next"                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ usePracticeNavigation  │
                    │   handleNext()         │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Check simulation       │
                    │ completed?             │
                    └───┬────────────────┬───┘
                  NO    │                │ YES
        ┌───────────────▼──┐          ┌──▼──────────────────┐
        │ Show blocking    │          │ Call                 │
        │ error: "Run      │          │ evaluateCurrentStep  │
        │ simulation"      │          └──┬──────────────────┘
        └──────────────────┘             │
                                ┌────────▼─────────┐
                                │ usePracticeScoring│
                                │ evaluateCurrentStep│
                                └────────┬─────────┘
                                         │
                        ┌────────────────▼────────────────┐
                        │ evaluateDesignOptimized         │
                        │ (lib/scoring/engines/design.ts) │
                        └────────┬────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐   ┌──────────▼──────────┐  ┌─────────▼────────┐
│ Phase 1:       │   │ Phase 2:            │  │ Phase 3:         │
│ Component      │   │ Architecture        │  │ Critical Path    │
│ Requirements   │   │ Pattern Validation  │  │ Validation       │
└───────┬────────┘   └──────────┬──────────┘  └─────────┬────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Structural Score       │
                    │ (0-35 points)          │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ AI Enhancement         │
                    │ (GPT-4o-mini)          │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ FeedbackResult         │
                    │ - score                │
                    │ - blocking/warnings    │
                    │ - positive feedback    │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Display FeedbackModal  │
                    │ - Show score           │
                    │ - Show feedback        │
                    │ - Allow Continue/Revise│
                    └────────────────────────┘
```

---

## Complete Example Walkthrough

### Scenario: User designs URL Shortener

**Step-by-Step:**

1. **User places components:**
   - Drag "Web" to board
   - Drag "API Gateway" to board
   - Drag "Service" to board
   - Drag "Cache (Redis)" to board
   - Drag "DB (Postgres)" to board

2. **User creates connections:**
   - Connect Web → API Gateway
   - Connect API Gateway → Service
   - Connect Service → Cache
   - Connect Cache → Database

3. **User clicks "Run Simulation":**

   ```typescript
   // Path finding starts
   findScenarioPath(nodes, edges, SCENARIOS.urlShortener);

   // Returns: [web-1, api-gw-1, service-1, cache-1, db-1]

   // Scenario evaluation
   evaluateScenario(scenario, nodes, edges, path);

   // Calculates:
   // - Latency: 3ms + 2ms + 5ms + 1ms + 4ms = 15ms ✓
   // - Throughput: min(10k, 8k, 6k, 15k, 1.2k) = 1,200 RPS ✓
   // - Cost: $0.18/hr
   ```

4. **Results displayed:**

   ```
   ✓ Latency: 15ms (target: <100ms)
   ✓ Throughput: 1,200 RPS (target: >1,000 RPS)
   $ Cost: $0.18/hour

   Path: Web → API Gateway → Service → Cache → Database
   ```

5. **User clicks "Next":**

   ```typescript
   // Verification starts
   handleNext() → evaluateCurrentStep("sandbox")

   // Design scoring begins
   evaluateDesignOptimized({
     nodes: [web-1, api-gw-1, service-1, cache-1, db-1],
     edges: [e1, e2, e3, e4],
     functionalRequirements: {
       "url-shortening": true,
       "redirection": true,
       "basic-analytics": false
     },
     nonFunctionalRequirements: { ... }
   })
   ```

6. **Component check:**

   ```typescript
   // ✓ Service present (+5 points)
   // ✓ Cache (Redis) present (+5 points)
   // ✓ DB (Postgres) present (+5 points)
   // ✗ Message Queue missing (0 points - not required)
   // ✗ Worker Pool missing (0 points - not required)
   ```

7. **Pattern check:**

   ```typescript
   // ✓ Cache-aside pattern detected (+10 points)
   //   Service → Cache → Database connection found
   // ✗ Async analytics pattern N/A (analytics not selected)
   // ✗ Rate limiting pattern N/A (rate limiting not selected)
   ```

8. **Critical path check:**

   ```typescript
   // ✓ Redirect path valid (+10 points)
   //   Web → API Gateway → Service → Cache → Database
   //   Contains required: Service, Cache ✓
   //   Hops: 5 (between 4-7) ✓
   ```

9. **Final score:**

   ```
   Components: 15/15
   Patterns: 10/10
   Paths: 10/10
   Total: 35/35 (100%)
   ```

10. **AI feedback generated:**

    ```
    ✓ Outstanding architecture!
    ✓ Cache-aside pattern ensures fast redirects
    ✓ All required components present

    💭 Think about: Consider adding analytics for tracking
    ```

11. **FeedbackModal shown:**
    - User sees score: 35/35
    - User sees positive feedback
    - User can click "Continue" or "Revise"

12. **User adds Message Queue:**

    ```typescript
    // State updated
    simulationCompleted = false; // Invalidated
    designScore = undefined; // Cleared

    // Must re-run simulation
    ```

13. **User re-runs simulation, clicks "Next":**
    - New path found: includes Message Queue
    - New score calculated: 35/35 + bonus points
    - New feedback: "Great! Added analytics capability"

---

## Performance Considerations

### Optimization Strategies

1. **Debounced State Updates**
   - Component positions debounced to reduce re-renders
   - Only notify parent when significant changes occur

2. **Memoization**
   - Component specs memoized
   - Path finding results cached per design state
   - AI feedback cached per score combination

3. **Progressive Loading**
   - Structural evaluation completes first
   - AI feedback loads in background
   - Progress indicators show each phase

4. **Simulation Caching**
   - Results stored in session state
   - Only re-calculated when design changes
   - Path finding optimized with early exits

### Bottlenecks & Solutions

| Bottleneck              | Impact                     | Solution                                               |
| ----------------------- | -------------------------- | ------------------------------------------------------ |
| AI feedback latency     | 2-3s delay                 | Show structural results immediately, AI enhances async |
| Path finding complexity | O(n²) worst case           | Bidirectional search, early pruning, deduplication     |
| React Flow re-renders   | Laggy dragging             | Memoized node data, debounced position updates         |
| Large edge lists        | Slow connection validation | Adjacency map indexing, Set-based lookups              |

---

## Future Enhancements

### Planned Improvements

1. **Multi-Path Analysis**
   - Find all valid paths, not just one
   - Compare latency/throughput of different routes
   - Suggest optimal path based on requirements

2. **Load Distribution Simulation**
   - Model traffic split across replicas
   - Calculate uneven load scenarios
   - Identify bottlenecks under stress

3. **Cost Optimization Suggestions**
   - Identify over-provisioned components
   - Suggest cheaper alternatives
   - Show cost vs. performance trade-offs

4. **Real-Time Validation**
   - Validate as user builds (not just on submit)
   - Show warnings inline on components
   - Highlight missing connections in red

5. **Template Designs**
   - Pre-built patterns for common scenarios
   - One-click scaffold for URL shortener
   - Learn from top-scoring designs

---

## Debugging Guide

### Common Issues & Solutions

#### Issue: "Run simulation first" error

**Cause**: `simulationCompleted` flag is false

**Debug**:

```typescript
console.log(session.state.sandbox.simulationCompleted); // false
```

**Solution**: Click "Run Simulation" button

#### Issue: Score always 0

**Cause**: Components not matching configuration

**Debug**:

```typescript
console.log(
  "Nodes:",
  nodes.map((n) => n.spec.kind)
);
console.log(
  "Required:",
  config.componentRequirements.map((r) => r.kind)
);
```

**Solution**: Check component names match exactly (case-sensitive)

#### Issue: Path not found

**Cause**: Missing connections in architecture

**Debug**:

```typescript
console.log("Adjacency:", adjacency);
console.log("Missing kinds:", missingKinds);
```

**Solution**: Ensure all required components are connected in sequence

#### Issue: AI feedback not showing

**Cause**: OpenAI API error or rate limit

**Debug**:

```typescript
console.log("AI error:", error);
```

**Solution**: Check API key, rate limits, network connectivity

---

## Conclusion

Step 4's simulation and scoring system is a multi-phase pipeline that:

1. **Validates** architecture completeness
2. **Scores** design quality structurally
3. **Enhances** feedback with AI
4. **Simulates** request flow
5. **Evaluates** against requirements

The system is designed to be:

- **Incremental**: Score updates as user builds
- **Explainable**: Detailed feedback on every decision
- **Adaptive**: Requirements flow from previous steps
- **Performant**: Optimized algorithms with caching

By understanding this flow, you can:

- Debug scoring issues
- Extend scoring rules
- Add new component types
- Improve simulation accuracy
- Enhance user feedback

---

**Document Version**: 1.0
**Last Updated**: 2025-01-07
**Author**: System Design Sandbox Team
