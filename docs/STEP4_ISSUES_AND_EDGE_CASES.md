# Step 4 Simulation: Issues, Edge Cases, and Failure Modes

This document identifies potential issues, edge cases, race conditions, and failure scenarios in the Step 4 simulation and scoring system.

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [Race Conditions](#race-conditions)
3. [State Management Issues](#state-management-issues)
4. [Path Finding Edge Cases](#path-finding-edge-cases)
5. [Simulation Edge Cases](#simulation-edge-cases)
6. [Scoring Edge Cases](#scoring-edge-cases)
7. [UI/UX Issues](#uiux-issues)
8. [Performance Issues](#performance-issues)
9. [Data Consistency Issues](#data-consistency-issues)
10. [Recommended Fixes](#recommended-fixes)

---

## Critical Issues

### 🔴 Issue #0: Architectural Flaw - Validation Failures Treated as Exceptions

**Severity**: Critical (Architecture)

**Location**:
- `components/practice/stages/RunStage.tsx:184-189`
- `hooks/usePracticeNavigation.ts:88-100`

**Root Cause**:
The simulation flow conflates **expected validation failures** (missing components, invalid paths) with **unexpected exceptional errors** (network failures, null pointers). This fundamental design flaw causes:

1. **JavaScript errors logged to console** for normal user actions
2. **Poor user experience** - feels like something "broke" when it's just validation feedback
3. **Technical debt** - error handling code wrapped around expected flows
4. **Confusion** - developers treat validation as exceptions requiring try/catch

**The Problem Flow**:
```typescript
// usePracticeNavigation.ts:95-99
if (!hasRun || !hasDesignScore) {
  if (window._runSimulation) {
    logger.info("Automatically running simulation from Next button");
    setWaitingForSimulation(true);
    window._runSimulation();  // Triggers auto-run
    return;
  }
}

// RunStage.tsx:184-186
if (path.missingKinds.length > 0) {
  throw new Error(`Add the missing components...`);  // ❌ THROWS for expected validation
}

// RunStage.tsx:311-316
} catch (err) {
  logger.error("Simulation error", err);  // ❌ Logs to console as "error"
  // ... error handling ...
}
```

**Why This Is Wrong**:

1. **Validation failures are NOT exceptional conditions**:
   - Missing database is an **expected scenario** during design iteration
   - Invalid path is **normal user exploration**
   - These are business logic validations, not system errors

2. **Console error spam**:
   - Every validation failure logs full stack trace to console
   - Makes debugging real issues impossible
   - Looks broken to users who open DevTools
   - Unprofessional in production

3. **Flow feels broken**:
   - User removes DB, clicks Next
   - Sees "Error: Add the missing components..." in console
   - Message DOES appear in UI, but feels like a crash happened
   - "Did something go wrong? Should I refresh?"

**What Should Happen Instead**:

Validation should return **result objects**, not throw exceptions:

```typescript
// BETTER APPROACH:
type ValidationResult =
  | { valid: true; path: NodeId[] }
  | { valid: false; reason: string; missingComponents: string[] };

function validateDesign(nodes, edges): ValidationResult {
  const path = findScenarioPath(...);

  if (path.missingKinds.length > 0) {
    return {
      valid: false,
      reason: "Missing required components",
      missingComponents: path.missingKinds
    };
  }

  if (path.nodeIds.length === 0) {
    return {
      valid: false,
      reason: "No valid path found",
      missingComponents: []
    };
  }

  return { valid: true, path: path.nodeIds };
}

// Usage:
const validation = validateDesign(nodes, edges);
if (!validation.valid) {
  // Show user-friendly feedback - NO ERROR THROWING
  setFeedback({
    type: "validation",
    message: validation.reason,
    actionable: `Add: ${validation.missingComponents.join(", ")}`
  });
  return;
}
```

**Impact**:

Current user experience when removing DB and clicking Next:
1. ✓ Message shows in UI: "Add the missing components to run simulation: DB (Postgres)"
2. ❌ Console shows: `Error: Add the missing components...` with stack trace
3. ❌ Feels like app crashed/errored
4. ❌ Developer thinks "why is it throwing? Let me add try/catch"
5. ❌ More error handling code added = more technical debt

Ideal user experience:
1. ✓ Validation runs silently
2. ✓ User-friendly message appears: "Your design needs a database to complete the redirect flow"
3. ✓ No console errors (clean DevTools)
4. ✓ Feels like helpful guidance, not a crash
5. ✓ Code is simpler - no try/catch for expected flows

**The Cascade Effect**:

This architectural mistake has cascaded into multiple areas:

1. **Timeout confusion** (Issue #2): Added 15s timeout to catch "hanging", but validation failures trigger timeout error messages
2. **Error clearing callbacks** (`_clearWaitingForSimulation`): Global window callbacks to clean up after "errors" that aren't errors
3. **Complex error state management**: `verification.error`, `verification.isVerifying`, `waitingForSimulation` - all to handle validation as errors
4. **Race conditions**: Errors interrupt async flows, causing state inconsistencies

**Recommended Architectural Fix**:

1. **Separate concerns**:
   - `validateDesign()`: Returns validation result object
   - `runSimulation()`: Only for actual simulation (assumes valid design)
   - Error handling: Only for true exceptions (network, null pointer, etc.)

2. **Update flow**:
```typescript
// Step 1: Validate (synchronous, no exceptions)
const validation = validateDesign(nodes, edges);
if (!validation.valid) {
  showValidationFeedback(validation);
  return;
}

// Step 2: Run simulation (async, may throw for real errors)
try {
  const results = await runSimulation(validation.path);
  showResults(results);
} catch (err) {
  // Only real errors here (network, timeout, etc.)
  logger.error("Simulation failed unexpectedly", err);
  showErrorMessage("Something went wrong. Please try again.");
}
```

3. **Remove error handling from validation**:
   - No `throw` for missing components
   - No `throw` for invalid paths
   - No try/catch for expected flows
   - Clean console logs

**Testing the Fix**:
1. Remove database from valid design
2. Click "Next"
3. Should see: Clean feedback message, no console errors
4. Should NOT see: Stack traces, "Error: ...", timeout messages

**Why This Matters**:
- Maintainability: Future developers won't add more error handling for validation
- User trust: App feels polished and intentional, not buggy
- Debugging: Real errors stand out in clean console logs
- Code clarity: Validation logic separate from error handling

---

### 🔴 Issue #1: Simulation State Not Cleared on Design Changes

**Severity**: Critical

**Location**: `components/practice/stages/DesignStage.tsx:351-386`

**Problem**:
When user modifies the design (adds/removes nodes or edges), the handlers update the design state but **DO NOT** clear the simulation results or set `simulationCompleted = false`.

```typescript
const handleNodesChange = useCallback(
  (nextNodes: PlacedNode[]) => {
    updateDesign((prev) => {
      return {
        ...prev,
        nodes: nextNodes,
        edges: pruneEdges(prev.edges, nextNodes),
      };
    });
    // ❌ MISSING: Clear simulation state
    // ❌ MISSING: Clear design score
  },
  [locked, readOnly, updateDesign]
);
```

**Impact**:
1. User runs simulation → gets results
2. User adds/removes component
3. User clicks "Next"
4. System uses **stale simulation results** from old design
5. Score doesn't reflect current architecture

**Example Scenario**:
```
1. User creates: Web → Service → Database
2. Runs simulation: passes (simple path)
3. User adds Cache between Service and Database
4. Clicks "Next" WITHOUT re-running simulation
5. System evaluates using old path (without cache)
6. Cache-aside pattern not detected → wrong score
```

**Reproduction**:
1. Create minimal architecture and run simulation
2. Add required component (e.g., Cache)
3. Click "Next" immediately
4. Observe that old simulation results are used

---

### 🔴 Issue #2: Multiple Rapid Simulation Clicks

**Severity**: High

**Location**: `components/practice/stages/RunStage.tsx:170-247`

**Problem**:
The `handleRun` function has a `running` flag check, but there's a window between setting `setRunning(true)` and the async operations completing where race conditions can occur.

```typescript
const handleRun = useCallback(async () => {
  if (locked || readOnly || running) return;
  setRunning(true);  // ✓ Good

  try {
    // Path finding (synchronous)
    const path = findScenarioPath(...);

    // Design evaluation (async, can take 2-3 seconds)
    const designScore = await evaluateDesignOptimized(...);

    // If user clicks again during this time, second call is blocked
    // But what if first call fails midway?
  } catch (err) {
    // ❌ If error occurs, setRunning(false) might not happen
  } finally {
    setRunning(false);
  }
}
```

**Impact**:
1. User clicks "Run Simulation"
2. Network error occurs during AI evaluation
3. `setRunning(false)` never executes
4. Button stays disabled forever
5. User must refresh page

**Missing Safeguard**:
- No timeout mechanism
- No retry logic
- No graceful degradation if AI fails

---

### 🔴 Issue #3: Session State vs Local State Divergence

**Severity**: High

**Location**: `components/practice/stages/DesignStage.tsx` & `components/practice/session/PracticeSessionProvider.tsx`

**Problem**:
Design state exists in TWO places:
1. Local component state (DesignStage)
2. Session state (PracticeSessionProvider)

These can get out of sync.

```typescript
// In DesignStage.tsx
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

// Nodes are updated via updateDesign callback
updateDesign((prev) => ({
  ...prev,
  nodes: nextNodes
}));

// But selectedNodeId is local state!
// If node is deleted in session but selection isn't cleared...
```

**Impact**:
1. User selects node
2. Another component deletes that node from session
3. DesignStage still has stale `selectedNodeId`
4. Clicking delete button tries to delete non-existent node
5. UI shows phantom selection

---

## Race Conditions

### ⚠️ Race #1: Simulation Running While Design Changes

**Scenario**:
```
Time    User Action              System State
----    -----------              ------------
T0      Clicks "Run Simulation"  setRunning(true)
T1      Path finding starts      Finding path...
T2      User drags node          Design state updated!
T3      Path finding completes   Returns path for OLD design
T4      Simulation runs          Uses stale path
T5      Results saved            Incorrect results stored
```

**Why It Happens**:
- No locking mechanism during simulation
- Design can be modified while async operations run
- Path is calculated at T1 but design changes at T2

**Fix Needed**:
- Lock design board while simulation runs, OR
- Validate design hasn't changed before saving results

---

### ⚠️ Race #2: Clicking "Next" While Simulation Running

**Scenario**:
```
T0: User clicks "Run Simulation"
T1: Simulation starts (3 second operation)
T2: User quickly clicks "Next" button
T3: Navigation checks simulationCompleted flag
T4: Flag is still false (simulation not done)
T5: Shows "Run simulation first" error
T6: Simulation completes, updates flag
T7: User is confused - "But I DID run it!"
```

**Current Mitigation**:
```typescript
// hooks/usePracticeNavigation.ts:74
if (verification.isVerifying || waitingForSimulation) {
  return; // Prevents double-clicks
}
```

**Problem**: This only prevents clicks AFTER verification starts. User can click before that check.

---

### ⚠️ Race #3: Concurrent Design Evaluation Requests

**Scenario**:
User modifies design rapidly:
```
T0: Add Service
T1: Evaluation #1 starts (slow AI call)
T2: Add Cache
T3: Evaluation #2 starts (slow AI call)
T4: Add Database
T5: Evaluation #3 starts (slow AI call)
T6: Evaluation #2 completes, sets score
T7: Evaluation #3 completes, sets score
T8: Evaluation #1 completes, OVERWRITES with OLD score!
```

**Why It Happens**:
- No request cancellation
- No sequence numbers to track order
- Last response wins, even if it's for stale data

---

## State Management Issues

### 🟡 Issue #4: Unclear State Ownership

**Problem**: Multiple sources of truth for similar data

**Example**:
```typescript
// Where is simulation state stored?
// 1. RunStage local state:
const [running, setRunning] = useState(false);
const [result, setResult] = useState<SimulationResult | null>(null);

// 2. Session state:
session.state.run.lastResult

// 3. Sandbox state:
session.state.sandbox.simulationResults

// 4. Design score:
session.state.scores?.design
```

**Confusion**:
- Which is the source of truth?
- What happens if they disagree?
- When user goes back, which state is used?

---

### 🟡 Issue #5: Stale Closure Over Session State

**Location**: Event handlers and callbacks

**Problem**:
```typescript
const handleNext = useCallback(async () => {
  // This captures session.state at closure creation time
  const hasRun = session.state.run.lastResult !== null;

  // If session updates elsewhere, this value is stale
  // Callback doesn't re-execute with new values
}, []); // ❌ Empty dependency array!
```

**Impact**:
- Handler uses outdated state
- Validation checks pass/fail incorrectly
- User sees inconsistent behavior

---

### 🟡 Issue #6: Simulation Flag Never Reset

**Problem**: Once `simulationCompleted = true`, when does it become `false` again?

**Current Logic**:
```typescript
// Set to true after simulation
session.setSimulation({
  simulationCompleted: true,
  simulationResults: results
});

// But where is it set to false?
// ❌ Not cleared when design changes
// ❌ Not cleared when navigating back
// ❌ Not cleared when starting new practice
```

**Impact**:
- Flag persists across sessions
- User can skip re-simulation when they shouldn't
- Stale results persist in session storage

---

## Path Finding Edge Cases

### 🟠 Edge Case #1: Multiple Valid Paths

**Scenario**:
```
Design has two paths:
Path A: Web → Service → Cache → DB (fast)
Path B: Web → Service → DB (slow, skips cache)

Algorithm returns first path found, might be Path B
```

**Problem**:
```typescript
// utils.ts:186
const bestState = states.reduce(
  (best, state) => (state.path.length > best.path.length ? state : best),
  { current: null, path: [], visited: new Set() }
);
```

**Only considers path length, not path quality!**

**Missing**:
- No preference for caching layers
- No preference for shorter latency
- No validation that chosen path is "best"

---

### 🟠 Edge Case #2: Circular Dependencies

**Scenario**:
```
User creates cycle:
Service → Cache → Database → Service (bad architecture!)

Path finding:
1. Starts at Service
2. Goes to Cache
3. Goes to Database
4. Can go back to Service!
5. Visited set prevents infinite loop ✓
6. But path stops prematurely
```

**Current Protection**:
```typescript
if (state.visited.has(candidate)) continue; // ✓ Good
```

**Problem**:
If the ONLY valid path contains a component that was already visited earlier, algorithm fails to find ANY path.

---

### 🟠 Edge Case #3: Disconnected Subgraphs

**Scenario**:
```
User creates TWO separate architectures:

Subgraph A: Web → Service → Database
Subgraph B: Cache → Message Queue → Worker

No connection between them!
```

**What Happens**:
```typescript
const path = findScenarioPath(scenario, nodes, edges);
// Returns path for Subgraph A only
// Ignores Subgraph B entirely
// Score: Missing components from B
```

**Problem**:
- No validation that all components are reachable
- No warning that some components are unused
- User thinks their design is complete

---

### 🟠 Edge Case #4: Wrong Direction Connections

**Scenario**:
```
User connects backwards:
Database → Cache → Service → Web
(Data flows from DB to client!)

Path finding:
- Adjacency is bidirectional
- Algorithm finds path: Web → Service → Cache → DB
- Seems valid, but edges point BACKWARDS
```

**Code**:
```typescript
// utils.ts:110
const adjacency = buildBidirectionalAdjacency(edges);
```

**Problem**: Treats all connections as bidirectional, ignoring actual data flow direction!

---

### 🟠 Edge Case #5: Optional Steps Skipped Incorrectly

**Scenario**:
```
Scenario flow:
1. Web (required)
2. CDN (optional)
3. API Gateway (required)
4. Service (required)

User design:
Web → API Gateway → Service (no CDN)

Path finding marks CDN as "missing" but should mark as "skipped (optional)"
```

**Code Issue**:
```typescript
// utils.ts:176
if (!step.optional && (candidates.length === 0 || !stepAdvanced)) {
  missingKinds.add(step.kind);
}
```

**Problem**: Unclear whether optional component was intentionally skipped or missing.

---

## Simulation Edge Cases

### 🟠 Edge Case #6: Zero Capacity Components

**Scenario**:
```
User sets Service replicas = 0
capacityRps = 6000 * 0 = 0 RPS
System bottleneck!
```

**Code**:
```typescript
// scenarios.ts:124
const effectiveRps = spec.capacityRps * replicas;
minRps = Math.min(minRps, effectiveRps);
```

**If replicas = 0:**
- `minRps = 0`
- System throughput = 0 RPS
- Simulation shows "success" if target RPS = 0 (which it never is)

**Missing Validation**:
- No check for `replicas >= 1`
- No warning if capacity drops to zero

---

### 🟠 Edge Case #7: Component Spec Missing

**Scenario**:
```
User creates custom component or spec is undefined

node.spec = undefined
spec.baseLatencyMs = undefined
```

**What Happens**:
```typescript
// scenarios.ts:120
const latency = spec.baseLatencyMs * (1 + Math.random() * 0.2);
// latency = undefined * 1.2 = NaN

totalLatency += latency;
// totalLatency = NaN
```

**Result**: All simulation metrics become `NaN`

---

### 🟠 Edge Case #8: Extremely Long Paths

**Scenario**:
```
User creates complex architecture:
Web → CDN → API GW → LB → Service → Cache → DB → Analytics → ...

Path length: 15 components
```

**Problem**:
```typescript
// No maximum path length validation
// No timeout for simulation
// If path is 100 components, simulation loops 100 times
```

**Performance Impact**:
- O(n) complexity per path length
- Could cause UI freeze for very long paths
- No upper bound

---

## Scoring Edge Cases

### 🟡 Edge Case #9: Component Name Exact Match Required

**Scenario**:
```
Config expects: "Cache (Redis)"
User component: "cache (redis)" (lowercase)
or: "Cache (Redis) " (trailing space)
or: "Redis Cache"
```

**Code**:
```typescript
// design.ts:56
const matchingNodes = nodes.filter((node) => {
  if (node.spec.kind === requirement.kind) return true; // ❌ Exact match only!
  if (requirement.alternativesAccepted?.includes(node.spec.kind)) return true;
  return false;
});
```

**Result**: No match found, marked as missing even though semantically correct

---

### 🟡 Edge Case #10: Alternatives Not Checked for Patterns

**Scenario**:
```
Config defines pattern:
requiredComponents: ["Cache (Redis)"]

User has: "Object Cache (Memcached)"

Component check: ✓ Passes (alternatives accepted)
Pattern check: ❌ Fails (pattern only checks exact kind)
```

**Code**:
```typescript
// design.ts:87
const hasAllComponents = pattern.requiredComponents.every((kind) =>
  nodes.some((n) => n.spec.kind === kind)
  // ❌ Doesn't check alternatives!
);
```

---

### 🟡 Edge Case #11: Duplicate Components Score Multiple Times

**Scenario**:
```
User adds 3 Cache instances
Each Cache = +5 points
Total = +15 points (should be +5)
```

**Current Code**:
```typescript
if (matchingNodes.length > 0) {
  score += requirement.weight; // ✓ Only adds once per component kind
  positive.push(...); // ✓ Single feedback message
}
```

**Actually OK** - but not clearly documented!

---

### 🟡 Edge Case #12: NFR Threshold Edge Conditions

**Scenario**:
```
Config: readRps threshold = 10000
User: readRps = 9999

Horizontal scaling pattern NOT triggered
User adds one more RPS: 10000
Pattern suddenly required!
```

**Problem**: Abrupt transition at threshold boundary

**Better Approach**: Graduated feedback
- 8000-9999: "Consider horizontal scaling"
- 10000+: "Horizontal scaling required"

---

## UI/UX Issues

### 🔵 Issue #7: Feedback Modal Can't Be Dismissed

**Location**: `components/practice/FeedbackModal.tsx`

**Problem**:
```typescript
// No close button!
// No click-outside-to-close
// User MUST click "Continue" or "Revise"
```

**Impact**:
- User can't review design with modal open
- Can't check requirements while reading feedback
- Feels trapped

---

### 🔵 Issue #8: Progress Indicator Unclear

**Location**: `components/practice/EvaluationProgress.tsx`

**Problem**:
User sees: "Evaluating design..." but doesn't know:
- How long it will take
- What's being evaluated
- If it's stuck or progressing

**Missing**:
- Estimated time remaining
- Current step description
- Cancel button

---

### 🔵 Issue #9: Error Messages Too Technical

**Example**:
```
"Missing kinds: Message Queue (Kafka Topic)"
```

**Better**:
```
"Your design is missing: Message Queue
Why it's needed: You selected 'Analytics' in Step 1, which requires async event processing.
How to fix: Drag a Message Queue component from the palette."
```

---

### 🔵 Issue #10: No Visual Indication of Invalid Design

**Problem**:
User creates disconnected components but board looks fine. Only discovers issue when clicking "Run Simulation".

**Needed**:
- Red outline on disconnected components
- Warning icon on components not in valid path
- Visual cue that connections are required

---

## Performance Issues

### 🟤 Issue #11: Path Finding Performance O(n²)

**Location**: `app/components/utils.ts:102-196`

**Problem**:
```typescript
for (const step of scenario.flow) {          // O(s) steps
  for (const state of states) {              // O(n) states
    for (const candidate of candidates) {    // O(c) candidates
      // Check adjacency
    }
  }
}
```

**Complexity**: O(s × n × c) where:
- s = scenario flow length (5-10)
- n = number of active states (exponential growth!)
- c = candidates per step (1-5)

**Worst Case**:
- 10 steps × 1000 states × 5 candidates = 50,000 iterations
- With large designs, could cause UI freeze

**Missing**:
- No early termination
- No state limit (deduplication helps but not enough)
- No progress reporting

---

### 🟤 Issue #12: React Flow Re-renders on Every Drag

**Location**: `app/components/ReactFlowBoard.tsx`

**Problem**:
```typescript
// Every pixel movement triggers:
handleNodesChange → updateDesign → session.setDesign → re-render

// For 30 FPS dragging = 30 updates/second
```

**Missing Optimization**:
- No debouncing of position updates
- No requestAnimationFrame batching
- No isDragging flag to skip validation

---

### 🟤 Issue #13: AI Feedback Blocking UI

**Problem**:
```typescript
// User clicks "Next"
setVerification({ isVerifying: true }); // UI shows loading

await evaluateDesignOptimized(...);  // 2-3 seconds
// During this time: UI completely blocked
```

**Better Approach**:
1. Show structural results immediately
2. Display "Generating detailed feedback..." message
3. Stream AI feedback as it arrives
4. Allow user to proceed without waiting for AI

---

## Data Consistency Issues

### 🟢 Issue #14: Edge References Deleted Node

**Scenario**:
```
1. User creates: A → B → C
2. User deletes B
3. Edge A→B and B→C should be deleted
4. Are they?
```

**Current Code**:
```typescript
// DesignStage.tsx:356
const edges = pruneEdges(prev.edges, nextNodes); // ✓ Yes!
```

**Actually handled correctly** via `pruneEdges` function.

---

### 🟢 Issue #15: Node ID Collisions

**Problem**:
```typescript
// DesignStage.tsx:304
id: `node-${kind}-${Date.now()}`
```

**If user adds two components in same millisecond**: Collision!

**Better**:
```typescript
id: `node-${kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
// or use crypto.randomUUID()
```

---

### 🟢 Issue #16: Requirements Missing from Previous Steps

**Scenario**:
User skips Step 1 (functional requirements) and jumps to Step 4.

**What Happens**:
```typescript
functionalRequirements: {} // Empty object!

// Scoring checks:
requirement.requiredBy?.some((reqId) => functionalRequirements[reqId])
// Always returns false (no requirements selected)
```

**Impact**:
- Nothing is "required"
- User can pass with minimal design
- Defeats purpose of requirement tracking

**Missing**:
- Validation that previous steps are complete
- Default requirements if skipped
- Warning that steps were skipped

---

## Recommended Fixes

### Priority 1: Critical Fixes

#### Fix #1: Clear Simulation State on Design Change
```typescript
// DesignStage.tsx
const handleNodesChange = useCallback(
  (nextNodes: PlacedNode[]) => {
    updateDesign((prev) => ({
      ...prev,
      nodes: nextNodes,
      edges: pruneEdges(prev.edges, nextNodes),
    }));

    // FIX: Clear simulation state
    session.updateRun((prev) => ({
      ...prev,
      lastResult: null,
    }));

    // FIX: Clear design score
    session.setStepScore("design", undefined);
  },
  [updateDesign, session]
);
```

#### Fix #2: Add Timeout to Simulation
```typescript
const handleRun = useCallback(async () => {
  setRunning(true);

  try {
    // FIX: Add timeout wrapper
    const results = await Promise.race([
      runSimulationWithScoring(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      )
    ]);

    setResult(results);
  } catch (err) {
    if (err.message === 'Timeout') {
      setError('Simulation timed out. Please try again.');
    } else {
      setError(err.message);
    }
  } finally {
    setRunning(false); // ✓ Always clears flag
  }
}, []);
```

#### Fix #3: Lock Board During Simulation
```typescript
// DesignStage.tsx
const isSimulationRunning = useSimulationRunning();

return (
  <ReactFlowBoard
    nodes={design.nodes}
    edges={design.edges}
    readOnly={isSimulationRunning || readOnly} // FIX: Lock when running
    onNodesChange={handleNodesChange}
  />
);
```

---

### Priority 2: Race Condition Fixes

#### Fix #4: Request Cancellation
```typescript
// Use AbortController for AI requests
const abortController = useRef<AbortController>();

const evaluateDesign = async () => {
  // Cancel previous request
  abortController.current?.abort();
  abortController.current = new AbortController();

  try {
    const result = await evaluateDesignOptimized(input, config, {
      signal: abortController.current.signal
    });
    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      // Cancelled, ignore
      return null;
    }
    throw err;
  }
};
```

#### Fix #5: Debounce Design Changes
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedNodesChange = useDebouncedCallback(
  (nodes: PlacedNode[]) => {
    updateDesign(prev => ({ ...prev, nodes }));
  },
  300 // Wait 300ms after last change
);
```

---

### Priority 3: Path Finding Improvements

#### Fix #6: Validate Path Direction
```typescript
export function findScenarioPath(
  scenario: Scenario,
  nodes: PlacedNode[],
  edges: Edge[]
): PathResult {
  // ... existing path finding ...

  // FIX: Validate edges point in correct direction
  const pathEdges = edges.filter(edge => {
    const fromIndex = path.indexOf(edge.from);
    const toIndex = path.indexOf(edge.to);
    return fromIndex >= 0 && toIndex >= 0 && fromIndex < toIndex;
  });

  if (pathEdges.length !== path.length - 1) {
    return {
      ...result,
      warnings: ['Some connections are in the wrong direction']
    };
  }

  return result;
}
```

#### Fix #7: Find Optimal Path
```typescript
// Score paths by multiple criteria
function scorePath(path: NodeId[], nodes: PlacedNode[]): number {
  let score = 0;

  // Prefer shorter latency
  const totalLatency = path.reduce((sum, nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return sum + (node?.spec.baseLatencyMs ?? 0);
  }, 0);
  score += (1000 - totalLatency); // Lower latency = higher score

  // Prefer cache-aside pattern
  const hasCache = path.some(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.spec.kind.includes('Cache');
  });
  if (hasCache) score += 100;

  return score;
}

// Find best path
const allPaths = findAllValidPaths(scenario, nodes, edges);
const bestPath = allPaths.reduce((best, current) =>
  scorePath(current, nodes) > scorePath(best, nodes) ? current : best
);
```

---

### Priority 4: UI/UX Improvements

#### Fix #8: Add Modal Close Button
```typescript
// FeedbackModal.tsx
<div className="relative">
  <button
    onClick={onClose}
    className="absolute top-4 right-4"
    aria-label="Close"
  >
    <XIcon />
  </button>
  {/* ... modal content ... */}
</div>
```

#### Fix #9: Visual Path Highlighting
```typescript
// Highlight components in valid path
const highlightedNodes = useMemo(() => {
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isInPath: validPath.includes(node.id),
      isOrphaned: !isReachable(node.id, edges)
    }
  }));
}, [nodes, validPath, edges]);

// In SystemDesignNode.tsx
<div className={cn(
  'node',
  data.isInPath && 'ring-2 ring-green-400',
  data.isOrphaned && 'ring-2 ring-red-400'
)} />
```

---

## Testing Checklist

### Scenario Testing

- [ ] **Empty Design**: Click "Next" with no components
- [ ] **Minimal Design**: Single component only
- [ ] **Disconnected Graphs**: Two separate architectures
- [ ] **Circular Dependency**: A → B → C → A
- [ ] **Wrong Direction**: DB → Service → Web
- [ ] **Missing Required**: No cache when required
- [ ] **Duplicate Components**: 5 instances of same component
- [ ] **Zero Replicas**: Component with replicas = 0
- [ ] **Very Long Path**: 20+ components in sequence
- [ ] **Mixed Alternatives**: Redis + Memcached both present

### Race Condition Testing

- [ ] **Rapid Clicks**: Click "Run Simulation" 10 times quickly
- [ ] **Modify During Sim**: Drag node while simulation running
- [ ] **Next During Sim**: Click "Next" immediately after "Run"
- [ ] **Multiple Next**: Spam "Next" button repeatedly
- [ ] **Network Timeout**: Simulate slow/failed AI request
- [ ] **Navigate Away**: Go to Step 3 during simulation
- [ ] **Browser Back**: Use browser back button during scoring

### State Testing

- [ ] **Page Refresh**: Refresh during simulation
- [ ] **Local Storage**: Clear local storage mid-session
- [ ] **Session Restore**: Return to session after 1 hour
- [ ] **Multiple Tabs**: Open same session in two tabs
- [ ] **Undo/Redo**: Test after modifying design
- [ ] **Score Persistence**: Verify scores save correctly

### Edge Case Testing

- [ ] **Special Characters**: Component with emoji/unicode name
- [ ] **Very Long Names**: Component name > 100 chars
- [ ] **Missing Specs**: Component without spec defined
- [ ] **Invalid Numbers**: NaN, Infinity, negative values
- [ ] **Boundary Values**: Exactly at threshold (10000 RPS)
- [ ] **Empty Arrays**: No edges, no nodes, no requirements

---

## Monitoring & Debugging

### Recommended Logging

```typescript
// Add comprehensive logging
logger.info('Simulation started', {
  nodeCount: nodes.length,
  edgeCount: edges.length,
  requirements: Object.keys(functionalRequirements)
});

logger.info('Path found', {
  pathLength: path.length,
  components: path.map(id => nodes.find(n => n.id === id)?.spec.kind),
  missingKinds
});

logger.info('Simulation complete', {
  success: result.success,
  latency: result.latency,
  throughput: result.throughput,
  duration: Date.now() - startTime
});
```

### Metrics to Track

- **Simulation Duration**: p50, p95, p99
- **Path Finding Duration**: Average time
- **AI Evaluation Duration**: Success rate, timeouts
- **Error Rate**: By error type
- **User Actions**: Modify after simulation rate
- **Score Distribution**: Histogram of final scores

---

## Conclusion

The Step 4 simulation system has several categories of issues:

### 🔴 **Critical** (Must Fix):
1. Simulation state not cleared on design changes
2. No timeout on async operations
3. Session state divergence

### ⚠️ **High** (Should Fix):
4. Race conditions on rapid interactions
5. Path finding doesn't validate direction
6. No visual feedback for invalid designs

### 🟡 **Medium** (Nice to Have):
7. Performance optimizations
8. Better error messages
9. Graceful degradation

### 🟢 **Low** (Polish):
10. UI/UX improvements
11. Additional validations
12. Enhanced feedback

**Recommended Implementation Order**:
1. Fix critical state management issues (1-3 weeks)
2. Add race condition protections (1 week)
3. Improve path finding accuracy (1 week)
4. UI/UX polish (ongoing)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-07
**Author**: System Design Sandbox Team
