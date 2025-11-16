# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**System Design Sandbox** is an interactive system design playground built with Next.js 15 (App Router) and React 19. Users drag and drop components (Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka, etc.), connect them, and run simulations against real-world scenarios to practice system design concepts with instant feedback.

## Common Development Commands

### Development

```bash
npm run dev              # Start dev server with Turbopack at http://localhost:3000
npm run build           # Production build
npm start               # Start production server
npm run typecheck       # Run TypeScript type checking (no emit)
```

### Testing

```bash
npm test                # Run Vitest tests once
npm run test:watch      # Run Vitest in watch mode
```

### Code Quality

```bash
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without modifying files
```

### Utilities

```bash
npm run generate-icons  # Generate favicon/icon assets from source
```

**Important**: All dev/build/start scripts run through `fix-util.js` which patches a Next.js util issue. Always use npm scripts, not direct `next` commands.

## High-Level Architecture

### Core Design Philosophy

- **Scenario-driven simulation**: Users select a real-world scenario (Spotify playback, URL shortener, rate limiter, etc.) with specific latency/RPS SLOs, then design a system to meet those requirements
- **Lightweight simulation engine**: Simple bottleneck + latency sum model with chaos mode for reproducible failure scenarios
- **URL-based sharing**: Designs are encoded in URL hash using pako deflate + base64 for instant sharing without backend
- **Acceptance criteria system**: Each scenario has checkable requirements (e.g., "CDN before S3", "Cache on read path") that get evaluated and scored

### Key Architectural Layers

#### 1. Component Library (`app/components/data.ts`)

Defines all available system design components with their performance characteristics:

- `ComponentSpec`: kind, label, baseLatencyMs, capacityRps, failureRate, costPerHour
- 18+ components including Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka, Load Balancer, Search Index, etc.
- Each component has realistic(ish) default metrics for simulation

#### 2. Scenario System (`lib/scenarios.ts`)

- **Schema**: Difficulty (easy/medium/hard), Category (Caching/Messaging/Search/Streaming/etc.), flow steps, acceptance criteria, API endpoints
- **SCENARIOS array**: 9+ real-world scenarios with specific SLOs (latency budget, required RPS)
- **Acceptance criteria**: Evaluable checklist items (required vs optional) that determine if a design is correct
- **API design track**: Optional API endpoints with linting suggestions for REST best practices

#### 3. Simulation Engine (`app/components/simulation.ts`)

Simple, deterministic simulation:

- Sums intrinsic node latencies + link latencies along the execution path
- Capacity = min(all node capacities) in the path
- Evaluates SLO compliance: meetsRps, meetsLatency
- Chaos mode: Uses seeded RNG (`lib/rng.ts`) for reproducible failure scenarios
- Calls `lib/evaluate.ts` for acceptance criteria checking
- Calls `lib/scoring.ts` for final score calculation

**Key flow**: `simulate()` → acceptance evaluation → score calculation → return results

#### 4. Board/Editor System (`app/components/`)

Built on `@xyflow/react` (React Flow) for the visual canvas:

- **ReactFlowBoard.tsx**: Main React Flow-based board with zoom/pan/drag
- **SystemDesignNode.tsx**: Custom node component with replicas, custom labels, delete/rename actions
- **SystemDesignEditor.tsx**: Top-level editor orchestrator, manages state
- **Board.tsx**: Legacy board component (being migrated away from)
- **Palette.tsx**: Component sidebar for dragging new nodes
- **ScenarioPanel.tsx**: Scenario selection + results display
- **ScenarioTabs.tsx**: Tabs for Flow vs API design views

Type conversions between internal `PlacedNode`/`Edge` and React Flow's node/edge types happen in `types.ts`.

#### 5. Graph Utilities (`app/components/utils.ts`)

- Path finding algorithms (BFS/DFS for flow paths)
- Node/edge lookup helpers
- Graph validation utilities

#### 6. Sharing System (`lib/shareLink.ts`)

- `encodeDesign()`: JSON → pako deflate → base64 (URL-safe)
- `decodeDesign()`: base64 → inflate → JSON
- Designs stored in URL hash (`#d=...`) for zero-backend sharing

#### 7. State Management

- Undo/redo: Snapshot-based stack in `lib/undo.ts`
- No global state library; React state + URL encoding
- Consider Zustand if state complexity grows

#### 8. Evaluation & Scoring (`lib/evaluate.ts`, `lib/scoring.ts`)

- **evaluate.ts**: Pattern-matches node sequences to check acceptance criteria (e.g., "CDN.\*Object Store" for CDN-before-S3)
- **scoring.ts**: Combines SLO pass/fail + acceptance score + cost efficiency into final score (0-100)
- **apiLint.ts**: Simple REST API design lints (path structure, pagination, etc.)

#### 9. Tutorial System (`app/components/Tutorial.tsx`)

First-run guided walkthrough using coachmarks, persisted in localStorage.

#### 10. Responsive Design (`app/components/layout/`, `app/components/mobile/`)

- **DesktopLayout.tsx**: Sidebar + board layout
- **MobileLayout.tsx**: Bottom sheet + mobile-optimized controls
- **BottomSheet.tsx**: Mobile slide-up panel for scenarios/palette
- **MobileTopBar.tsx**: Mobile header with menu controls

### Data Flow

1. User selects scenario → scenario SLOs + acceptance criteria loaded
2. User drags components onto board → nodes array updated
3. User connects nodes → edges array updated
4. User clicks "Run Simulation":
   - Path is computed from nodes/edges
   - `simulate()` calculates latency, capacity, chaos failures
   - `evaluateScenario()` checks acceptance criteria
   - `calculateScore()` computes final score
   - Results rendered in ScenarioPanel
5. User clicks "Share" → `encodeDesign()` → URL copied to clipboard
6. Recipient opens shared URL → `decodeDesign()` → board state restored + read-only mode with "Fork" option

## Important Implementation Details

### TypeScript Paths

- `@/*` aliases to repo root (configured in tsconfig.json)
- Example: `import { simulate } from "@/app/components/simulation"`

### Testing Strategy

- **Unit tests**: Simulation logic, deterministic RNG, evaluation rules (`__tests__/simulate.test.ts`)
- **Component tests**: React Testing Library + jsdom (`__tests__/practice.test.tsx`)
- Test framework: Vitest with jsdom environment
- Setup file: `vitest.setup.ts` (imports @testing-library/jest-dom)

### Deployment & Monitoring

- **Platform**: Vercel
- **Analytics**: Vercel Analytics + custom tracking in `lib/analytics.ts`
- **Error monitoring**: Sentry (configured in `sentry.*.config.ts`, instrumentation files)
- **Database**: Supabase (optional backend, configured in `lib/supabase.ts`)

### Known Workarounds

- `fix-util.js`: Patches Next.js util for compatibility. Always use npm scripts, not raw `next` commands.

## Code Patterns & Conventions

### Component Library Extension

When adding new components to `app/components/data.ts`:

1. Add to `ComponentKind` union in `types.ts`
2. Add spec to `COMPONENT_LIBRARY` array in `data.ts`
3. Update any relevant TypeScript types

### Adding New Scenarios

1. Define scenario object in `lib/scenarios.ts` following the `Scenario` type
2. Include acceptance criteria with unique IDs
3. Add evaluation logic in `lib/evaluate.ts` (pattern matching or custom logic)
4. Test with simulation to verify SLOs and criteria are balanced

### Acceptance Criteria Evaluation

Pattern matching in `evaluate.ts` uses path representation (e.g., "Web>CDN>Service>Redis"):

- Check node sequences with regex (e.g., `/CDN.*Object Store/`)
- Check node presence (e.g., `pathText.includes("Cache (Redis)")`)
- Avoid false positives by being specific with patterns

### Simulation Engine Limitations

- **Single path only**: No fan-out, no parallel branches (yet)
- **Serial latency**: Sums all latencies along the path
- **Bottleneck capacity**: Min capacity of all nodes
- **No backpressure modeling**: Simple backlog growth calculation
- This is intentional for MVP; keep it simple and understandable

### URL Encoding Constraints

- Compressed design must fit in URL (browser limits ~2KB-8KB depending on browser)
- Large designs may fail to encode/share
- Consider backend storage (Supabase) for complex designs if needed

## File Structure Map

```
app/
├── components/
│   ├── SystemDesignEditor.tsx      # Main editor orchestrator
│   ├── ReactFlowBoard.tsx          # React Flow canvas
│   ├── SystemDesignNode.tsx        # Custom node renderer
│   ├── ScenarioPanel.tsx           # Scenario selector + results
│   ├── ScenarioTabs.tsx            # Flow/API tabs
│   ├── Palette.tsx                 # Component drag palette
│   ├── Tutorial.tsx                # First-run tutorial
│   ├── simulation.ts               # Simulation engine
│   ├── utils.ts                    # Graph algorithms
│   ├── types.ts                    # Core types + React Flow conversions
│   ├── data.ts                     # Component library
│   ├── layout/                     # Desktop/mobile layout wrappers
│   └── mobile/                     # Mobile-specific UI components
├── page.tsx                        # Home page
├── play/page.tsx                   # Editor page
├── practice/[slug]/page.tsx        # Practice mode with predefined challenges
├── docs/page.tsx                   # Documentation
├── feedback/page.tsx               # Feedback form
└── api/                            # API routes (feedback, subscribe)

lib/
├── scenarios.ts                    # Scenario definitions
├── evaluate.ts                     # Acceptance criteria evaluation
├── scoring.ts                      # Score calculation
├── shareLink.ts                    # URL encoding/decoding
├── undo.ts                         # Undo/redo stack
├── rng.ts                          # Seeded RNG (mulberry32)
├── apiLint.ts                      # REST API linting
├── analytics.ts                    # Analytics wrapper
└── supabase.ts                     # Supabase client

__tests__/
├── simulate.test.ts                # Simulation engine tests
└── practice.test.tsx               # Component/integration tests
```

## Migration Status

The codebase is transitioning from a custom canvas implementation to React Flow:

- **Old**: `Board.tsx` with manual canvas rendering
- **New**: `ReactFlowBoard.tsx` with @xyflow/react
- Type conversions handle both systems during transition
- Prefer React Flow patterns for new features

## Performance Considerations

- **Turbopack dev mode**: Fast hot reload, but ensure compatibility with standard Webpack build
- **Code splitting**: Editor components are heavy; consider dynamic imports for /play route
- **Lighthouse targets**: Aim for Perf ≥ 90, A11y ≥ 95
- **Initial JS budget**: Keep < 200KB for fast TTI

## Testing Notes

- Use deterministic RNG in tests via `mulberry32(seed)` for reproducible chaos scenarios
- Mock React Flow components if needed (can be heavy in tests)
- Test acceptance criteria evaluation separately from simulation
- Verify URL encode/decode round-trips correctly

## Practice Mode

- Special route `/practice/[slug]` for curated challenges
- Challenges defined in `lib/practice/` directory
- Pre-configured scenarios with specific learning objectives
- Separate from free-form editor mode

## Environment Variables

Check `.env` for required keys:

- Sentry DSN (error monitoring)
- Supabase keys (optional backend)
- Analytics tokens (Vercel Analytics)

Never commit `.env` to version control.
