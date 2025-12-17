# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev           # Start dev server with Turbopack
npm run build         # Production build
npm run typecheck     # TypeScript type checking
npm test              # Run tests once (Vitest)
npm run test:watch    # Run tests in watch mode
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check
```

Run a single test file:
```bash
npm test -- __tests__/simulate.test.ts
```

## Git Hooks

- **pre-commit**: Runs `npm run format`
- **pre-push**: Runs `npm run test && npm run lint && npm run typecheck && npm run build`

## Architecture Overview

### App Structure (Next.js 15 App Router)

**Two Main User Flows:**
1. **Play Mode** (`/play`) - Free-form system design sandbox with scenario selection
2. **Practice Mode** (`/practice/[slug]`) - Guided multi-step practice sessions for specific scenarios (e.g., URL shortener)

**Practice Flow Steps** (defined in `lib/practice/types.ts`):
- `functional` → `nonFunctional` → `api` → `highLevelDesign` → `score`

### Core Domains

**System Design Editor** (`app/components/`):
- `ReactFlowBoard.tsx` - Main canvas using @xyflow/react for node-based diagram editing
- `SystemDesignNode.tsx` - Custom React Flow node component
- `simulation.ts` - Lightweight simulation engine (bottleneck + latency sum model)
- `types.ts` - Core types: `PlacedNode`, `Edge`, `ComponentSpec`, `ComponentKind`
- `data.ts` - Component library with specs (latency, capacity, failure rates)

**Scenario System** (`lib/scenarios.ts`):
- `Scenario` type defines RPS/latency targets, acceptance criteria, flow steps
- Scenarios: URL Shortener, Spotify Play/Search, Rate Limiter, CDN, etc.

**Scoring Engine** (`lib/scoring/`):
- Multi-engine scoring: API, design, functional, non-functional requirements
- AI-powered feedback via Gemini (`lib/scoring/ai/`)
- Iterative feedback system with topic coverage tracking

**Practice Session** (`lib/practice/`):
- `types.ts` - Practice state machine types
- `storage.ts` - Session persistence
- `validation.ts`, `verification.ts` - Step validation logic
- `scenario-configs.ts`, `step-configs.ts` - Per-scenario configuration

### Key Type Relationships

```
ComponentKind → ComponentSpec → PlacedNode → SystemDesignNode (React Flow)
Scenario → FlowStep[] → acceptance criteria → simulation results
PracticeState → Requirements, ApiDefinition, DesignState, RunState
```

### UI Components

- `components/ui/` - shadcn/ui primitives (button, card, dialog, etc.)
- `components/practice/` - Practice mode components (steps, stages, feedback)
- `app/components/layout/` - Desktop/Mobile responsive layouts

### External Services

- **Clerk** - Authentication
- **Supabase** - Database
- **PostHog** - Analytics (proxied through `/ingest` rewrites)
- **Sentry** - Error tracking (tunneled through `/monitoring`)
- **Gemini** - AI feedback
- **Resend** - Email

## Path Alias

`@/*` maps to project root (configured in `tsconfig.json`)

## Testing

Vitest with jsdom, setup in `config/vitest.setup.ts`. Tests use deterministic RNG (`lib/rng.ts`) for reproducible simulation results.

## ESLint

Uses `next/core-web-vitals` and `next/typescript`. Unused vars with `_` prefix are allowed.

## Git Commits

Do not add Claude as a co-author in commit messages.
