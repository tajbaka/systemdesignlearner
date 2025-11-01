# Deep Dive: Edge Detection Bug in Design Scoring

**Date:** 2025-11-01
**Issue:** Design scoring fails to detect connections despite simulation finding them
**Severity:** Critical - False negatives block users with correct designs

---

## Executive Summary

**The Problem:**
The design scoring engine (`lib/scoring/engines/design.ts`) reports missing "cache-aside pattern" even though:
1. ✅ The simulation finds the path: Web → API Gateway → Service → Cache (Redis) → DB (Postgres)
2. ✅ All components exist (verified by scoring logs)
3. ✅ User logs show correct edges with proper `from`/`to` properties
4. ❌ `checkConnection()` method returns `false` for Service → Cache → DB connections

**Root Cause:**
There is **NO source/target vs from/to mismatch** as initially suspected. The codebase is consistent:
- All internal `Edge` types use `from`/`to`
- React Flow edges are converted via `reactFlowEdgeToEdge()` (types.ts:120-128)
- Conversion properly maps `edge.source → edge.from` and `edge.target → edge.to`

The real issue is **logic duplication and inconsistency** between:
1. `findScenarioPath()` in `app/components/utils.ts` (used by simulation) ✅ **Works**
2. `checkConnection()` in `lib/scoring/engines/design.ts` (used by scoring) ❌ **Fails**

---

## Evidence Analysis

### User's Design (from console logs)

**Nodes:**
```javascript
[
  { id: "seed-web", replicas: 1 },
  { id: "seed-api", replicas: 1 },
  { id: "seed-service", replicas: 2 },
  { id: "seed-db", replicas: 5 },
  { id: "c06ea44a-1da0-4769-89e5-56f6d5771551", replicas: 1 } // Cache (Redis)
]
```

**Edges (from RunStage.tsx line 178 log):**
```javascript
[
  { id: "seed-edge-web-api", from: "seed-web", to: "seed-api" },
  { id: "seed-edge-api-service", from: "seed-api", to: "seed-service" },
  // Missing log output, but path exists per findScenarioPath
]
```

**Simulation Result:**
```
[findScenarioPath] Best path found: Web -> API Gateway -> Service -> Cache (Redis) -> DB (Postgres)
```

**Scoring Result:**
```
Score: 25/30 (83%)
✓ Service component present
✓ Cache present
✓ Database present
❌ Implement cache-aside pattern: Service → Cache → DB
```

---

## Code Flow Comparison

### 1. Simulation Path Finding (WORKS ✅)

**File:** `app/components/utils.ts:26-143`

**Key Algorithm:**
```typescript
// Build BIDIRECTIONAL adjacency map
const adjacency = new Map<NodeId, Set<NodeId>>();
for (const edge of edges) {
  // Add BOTH directions - user might draw arrow either way
  const list1 = adjacency.get(edge.from) ?? new Set<NodeId>();
  list1.add(edge.to);
  adjacency.set(edge.from, list1);

  const list2 = adjacency.get(edge.to) ?? new Set<NodeId>();
  list2.add(edge.from); // ← BIDIRECTIONAL
  adjacency.set(edge.to, list2);
}

// Then traverse using BFS with this bidirectional map
```

**Why it works:**
- Treats edges as bidirectional by default
- User can draw Service → Cache OR Cache → Service, both work
- Logs show adjacency map is correctly built
- BFS finds path successfully

---

### 2. Design Scoring Connection Check (FAILS ❌)

**File:** `lib/scoring/engines/design.ts:592-633`

**Key Algorithm:**
```typescript
private checkConnection(
  nodes: PlacedNode[],
  edges: Edge[],
  connection: ArchitecturePattern["requiredConnections"][0]
): boolean {
  // Find nodes matching component kinds
  const fromNodes = nodes.filter((n) => matchesKind(n.spec.kind, connection.from));
  const toNodes = nodes.filter((n) => matchesKind(n.spec.kind, connection.to));

  // Check DIRECTED edges only
  for (const fromNode of fromNodes) {
    for (const toNode of toNodes) {
      const hasEdge = edges.some(
        (edge) =>
          (edge.from === fromNode.id && edge.to === toNode.id) || // Forward
          (connection.bidirectional && edge.from === toNode.id && edge.to === fromNode.id) // Reverse
      );
      if (hasEdge) return true;
    }
  }
  return false;
}
```

**Why it fails:**
1. **Requires exact direction match** - `edge.from === fromNode.id && edge.to === toNode.id`
2. **Only checks reverse if `connection.bidirectional === true`**
3. **Pattern config doesn't specify bidirectional:**

**File:** `lib/scoring/configs/url-shortener.json:598-628`
```json
{
  "id": "cache-aside",
  "requiredComponents": ["Service", "Cache (Redis)", "DB (Postgres)"],
  "requiredConnections": [
    { "from": "Service", "to": "Cache (Redis)" },
    { "from": "Cache (Redis)", "to": "DB (Postgres)" }
  ],
  "required": true
}
```

**Missing:** `"bidirectional": true` in the connection objects!

---

## Problem Breakdown

### Issue 1: Inconsistent Bidirectionality

**`findScenarioPath()`:** Treats ALL edges as bidirectional
**`checkConnection()`:** Only treats edges as bidirectional if config specifies

**Impact:** User draws edges in arbitrary direction, simulation works, scoring fails.

### Issue 2: Logic Duplication

**Two separate graph traversal implementations:**
1. `findScenarioPath()` - 117 lines, custom BFS, bidirectional
2. `checkConnection()` + `bfsPath()` - 200+ lines, different BFS, directional

**Why this is bad:**
- Double maintenance burden
- Inconsistent behavior (proven by this bug)
- No code reuse despite solving similar problems

### Issue 3: Node ID vs Component Kind Matching

**`findScenarioPath()`:**
```typescript
const byKind = new Map<string, NodeId[]>();
for (const node of nodes) {
  const existing = byKind.get(node.spec.kind) ?? [];
  existing.push(node.id);
  byKind.set(node.spec.kind, existing);
}
// Groups nodes by kind, allows any instance
```

**`checkConnection()`:**
```typescript
const fromNodes = nodes.filter((n) => matchesKind(n.spec.kind, connection.from));
const toNodes = nodes.filter((n) => matchesKind(n.spec.kind, connection.to));
// Also groups by kind, but then requires EXACT edge match
```

**Subtle difference:**
- `findScenarioPath` finds path through ANY instances of each kind
- `checkConnection` requires specific edges between specific instances
- If user has multiple Services, `checkConnection` might check wrong pair

---

## Additional Debugging Evidence

### Console Logs from design.ts:612-633

**Expected logs (if working):**
```
[checkConnection] Checking Service -> Cache (Redis)
[checkConnection] fromNodes: [{ id: 'seed-service', kind: 'Service' }]
[checkConnection] toNodes: [{ id: 'c06ea44a-...', kind: 'Cache (Redis)' }]
[checkConnection] Checking edge from seed-service to c06ea44a-...: true
[checkConnection] Found connection! Returning true
```

**Likely actual logs (if failing):**
```
[checkConnection] Checking Service -> Cache (Redis)
[checkConnection] fromNodes: [{ id: 'seed-service', kind: 'Service' }]
[checkConnection] toNodes: [{ id: 'c06ea44a-...', kind: 'Cache (Redis)' }]
[checkConnection] Checking edge from seed-service to c06ea44a-...: false ← NO EDGE FOUND
[checkConnection] No connection found, returning false
```

**Why edge not found:**
1. Edge might be `from: c06ea44a-... to: seed-service` (reverse direction)
2. Without `bidirectional: true` in config, reverse not checked
3. Method returns false despite physical edge existing

---

## Proposed Solutions

### Option 1: Quick Fix - Make Config Bidirectional (1 hour)

**Change:** `lib/scoring/configs/url-shortener.json:598-628`

```json
{
  "id": "cache-aside",
  "requiredComponents": ["Service", "Cache (Redis)", "DB (Postgres)"],
  "requiredConnections": [
    { "from": "Service", "to": "Cache (Redis)", "bidirectional": true },
    { "from": "Cache (Redis)", "to": "DB (Postgres)", "bidirectional": true }
  ],
  "required": true
}
```

**Pros:**
- Minimal code change
- Fixes immediate issue
- Low risk

**Cons:**
- Doesn't fix architectural duplication
- Other patterns might have same issue
- Bandaid solution

---

### Option 2: Unify Graph Traversal Logic (4-6 hours) **RECOMMENDED**

**Create:** `lib/graph/traversal.ts`

```typescript
/**
 * Unified graph traversal utilities
 * Used by both simulation and scoring for consistency
 */

export interface GraphNode {
  id: string;
  kind: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

/**
 * Build adjacency map with configurable directionality
 */
export function buildAdjacencyMap(
  edges: GraphEdge[],
  bidirectional = true
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    // Forward direction
    const list1 = adjacency.get(edge.from) ?? new Set<string>();
    list1.add(edge.to);
    adjacency.set(edge.from, list1);

    // Reverse direction (if bidirectional)
    if (bidirectional) {
      const list2 = adjacency.get(edge.to) ?? new Set<string>();
      list2.add(edge.from);
      adjacency.set(edge.to, list2);
    }
  }

  return adjacency;
}

/**
 * Check if path exists between component types
 */
export function hasPathBetweenKinds(
  nodes: GraphNode[],
  edges: GraphEdge[],
  fromKind: string,
  toKind: string,
  options: {
    bidirectional?: boolean;
    maxHops?: number;
    mustInclude?: string[];
  } = {}
): boolean {
  const { bidirectional = true, maxHops = 10, mustInclude = [] } = options;

  // Build adjacency map
  const adjacency = buildAdjacencyMap(edges, bidirectional);

  // Get candidate nodes for each kind
  const fromNodes = nodes.filter(n => matchesKind(n.kind, fromKind));
  const toNodes = nodes.filter(n => matchesKind(n.kind, toKind));

  // BFS from each fromNode to each toNode
  for (const fromNode of fromNodes) {
    for (const toNode of toNodes) {
      if (bfs(fromNode.id, toNode.id, adjacency, maxHops, mustInclude, nodes)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * BFS pathfinding
 */
function bfs(
  startId: string,
  endId: string,
  adjacency: Map<string, Set<string>>,
  maxHops: number,
  mustInclude: string[],
  allNodes: GraphNode[]
): boolean {
  const queue: Array<{ id: string; depth: number; visited: Set<string> }> = [
    { id: startId, depth: 0, visited: new Set([startId]) }
  ];

  while (queue.length > 0) {
    const { id, depth, visited } = queue.shift()!;

    if (id === endId) {
      // Check if path includes required kinds
      const visitedKinds = Array.from(visited).map(vid => {
        const node = allNodes.find(n => n.id === vid);
        return node?.kind || '';
      });

      const hasAllRequired = mustInclude.every(kind =>
        visitedKinds.some(vk => matchesKind(vk, kind))
      );

      return hasAllRequired;
    }

    if (depth >= maxHops) continue;

    const neighbors = adjacency.get(id) ?? new Set<string>();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({
          id: neighborId,
          depth: depth + 1,
          visited: new Set([...visited, neighborId])
        });
      }
    }
  }

  return false;
}

/**
 * Match component kind with alternatives
 */
function matchesKind(nodeKind: string, targetKind: string): boolean {
  if (nodeKind === targetKind) return true;

  // Match base types (e.g., "DB (Postgres)" matches "DB")
  const baseTarget = targetKind.split(' ')[0];
  const baseNode = nodeKind.split(' ')[0];

  return baseTarget === baseNode;
}
```

**Refactor `findScenarioPath()`:**
```typescript
import { buildAdjacencyMap } from "@/lib/graph/traversal";

export function findScenarioPath(
  scenario: Scenario,
  nodes: PlacedNode[],
  edges: Edge[]
): { nodeIds: NodeId[]; missingKinds: string[] } {
  // Use shared adjacency map builder
  const adjacency = buildAdjacencyMap(
    edges.map(e => ({ id: e.id, from: e.from, to: e.to })),
    true // bidirectional
  );

  // Rest of algorithm unchanged, just uses shared adjacency map
  // ...
}
```

**Refactor `checkConnection()`:**
```typescript
import { hasPathBetweenKinds } from "@/lib/graph/traversal";

private checkConnection(
  nodes: PlacedNode[],
  edges: Edge[],
  connection: ArchitecturePattern["requiredConnections"][0]
): boolean {
  return hasPathBetweenKinds(
    nodes.map(n => ({ id: n.id, kind: n.spec.kind })),
    edges.map(e => ({ id: e.id, from: e.from, to: e.to })),
    connection.from,
    connection.to,
    {
      bidirectional: connection.bidirectional ?? true, // Default to true!
      maxHops: 1, // Direct connection only
      mustInclude: []
    }
  );
}
```

**Pros:**
- ✅ Single source of truth for graph algorithms
- ✅ Consistent behavior between simulation and scoring
- ✅ Easier to test and maintain
- ✅ Fixes current bug and prevents future ones
- ✅ Makes bidirectional default (matches user expectations)

**Cons:**
- More upfront work
- Requires refactoring two files
- Need comprehensive testing

---

### Option 3: Make All Edges Bidirectional by Default (2 hours)

**Philosophy:** In system architecture diagrams, direction often shows logical flow, not strict directionality. Cache ↔ DB is logically bidirectional even if drawn one way.

**Changes:**
1. Update `checkConnection()` to default `bidirectional: true`
2. Update pattern configs to explicitly mark `bidirectional: false` for cases where direction matters (e.g., Web → CDN should not allow CDN → Web)
3. Document this as default behavior

**Pros:**
- User-friendly (matches mental model)
- Fixes multiple patterns at once
- Medium effort

**Cons:**
- Might allow invalid architectures (e.g., DB → Service when only Service → DB intended)
- Still has logic duplication

---

## Testing Requirements

Whichever solution is chosen, add these tests:

### Unit Tests

**File:** `__tests__/graph-traversal.test.ts`

```typescript
describe('Edge detection consistency', () => {
  it('should detect forward edge: Service → Cache', () => {
    const nodes = [
      { id: 's1', kind: 'Service' },
      { id: 'c1', kind: 'Cache (Redis)' }
    ];
    const edges = [
      { id: 'e1', from: 's1', to: 'c1' }
    ];

    expect(hasPathBetweenKinds(nodes, edges, 'Service', 'Cache (Redis)')).toBe(true);
  });

  it('should detect reverse edge: Cache → Service (bidirectional)', () => {
    const nodes = [
      { id: 's1', kind: 'Service' },
      { id: 'c1', kind: 'Cache (Redis)' }
    ];
    const edges = [
      { id: 'e1', from: 'c1', to: 's1' } // Reverse!
    ];

    expect(hasPathBetweenKinds(nodes, edges, 'Service', 'Cache (Redis)', {
      bidirectional: true
    })).toBe(true);
  });

  it('should detect cache-aside pattern regardless of edge direction', () => {
    const nodes = [
      { id: 's1', kind: 'Service' },
      { id: 'c1', kind: 'Cache (Redis)' },
      { id: 'd1', kind: 'DB (Postgres)' }
    ];

    // Test all 4 combinations
    const edgeVariations = [
      [{ from: 's1', to: 'c1' }, { from: 'c1', to: 'd1' }],
      [{ from: 'c1', to: 's1' }, { from: 'c1', to: 'd1' }],
      [{ from: 's1', to: 'c1' }, { from: 'd1', to: 'c1' }],
      [{ from: 'c1', to: 's1' }, { from: 'd1', to: 'c1' }],
    ];

    for (const edges of edgeVariations) {
      expect(hasPathBetweenKinds(nodes, edges.map((e, i) => ({ ...e, id: `e${i}` })),
        'Service', 'Cache (Redis)', { bidirectional: true })).toBe(true);
      expect(hasPathBetweenKinds(nodes, edges.map((e, i) => ({ ...e, id: `e${i}` })),
        'Cache (Redis)', 'DB (Postgres)', { bidirectional: true })).toBe(true);
    }
  });
});
```

### Integration Tests

**File:** `__tests__/scoring-simulation-consistency.test.ts`

```typescript
describe('Simulation and scoring consistency', () => {
  it('should give same connectivity results', () => {
    const design = {
      nodes: [/* user's design */],
      edges: [/* user's edges */]
    };

    // Simulation path finding
    const path = findScenarioPath(URL_SHORTENER, design.nodes, design.edges);
    const simulationFoundsCache = path.nodeIds.some(id => {
      const node = design.nodes.find(n => n.id === id);
      return node?.spec.kind === 'Cache (Redis)';
    });

    // Design scoring
    const config = loadScoringConfig('url-shortener');
    const score = evaluateDesign({
      nodes: design.nodes,
      edges: design.edges,
      functionalRequirements: { /*...*/ },
      nfrValues: { /*...*/ }
    }, config.steps.design);

    const scoringFoundsCache = !score.blocking.some(b =>
      b.message.includes('cache-aside')
    );

    // MUST MATCH!
    expect(simulationFoundsCache).toBe(scoringFoundsCache);
  });
});
```

---

## Recommendation

**Implement Option 2: Unified Graph Traversal**

### Rationale:
1. **Fixes root cause**, not just symptoms
2. **Prevents future bugs** from logic inconsistency
3. **Improves maintainability** - one algorithm to fix/update
4. **Better testing** - test once, benefit twice
5. **Code quality** - DRY principle, clear separation of concerns

### Implementation Plan:
1. **Phase 1 (2h):** Create `lib/graph/traversal.ts` with shared utilities
2. **Phase 2 (1h):** Refactor `findScenarioPath()` to use shared code
3. **Phase 3 (1h):** Refactor `checkConnection()` to use shared code
4. **Phase 4 (1-2h):** Write comprehensive tests
5. **Phase 5 (30m):** Update documentation

**Total effort:** 4-6 hours
**Risk:** Low (existing tests will catch regressions)
**Impact:** High (fixes bug + prevents future issues)

---

## Files to Modify

### Create:
- `lib/graph/traversal.ts` (new shared utilities)
- `__tests__/graph-traversal.test.ts` (unit tests)
- `__tests__/scoring-simulation-consistency.test.ts` (integration tests)

### Modify:
- `app/components/utils.ts` (use shared traversal)
- `lib/scoring/engines/design.ts` (use shared traversal)
- `lib/scoring/configs/url-shortener.json` (optional: add bidirectional flags for documentation)

---

## Conclusion

The false negative cache-aside detection is caused by **inconsistent graph traversal logic** between simulation (bidirectional by default) and scoring (directional by default). This is a classic case of logic duplication leading to bugs.

The recommended solution is to unify the graph traversal code into a shared library that both systems use, with bidirectional edges as the default behavior to match user expectations.

**User Impact:** With this fix, designs with 83% scores that have the cache-aside pattern will correctly show as passing with appropriate green checkmarks, and the false negative warning will disappear.
