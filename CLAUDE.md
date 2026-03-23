# System Design Sandbox

Interactive system design playground with practice problems, learning articles, and AI-powered feedback.

## Core Principles

- **Domain-Driven Design**: Self-contained domains with clear boundaries
- **Modular Architecture**: Each folder is isolated, imports only from same directory or explicitly shared modules
- **Co-location**: Types, constants, utils live near usage. Higher in tree = more shared
- **Discriminated Unions**: Error handling via `{ data: T } | { error: Code }`
- **Extend via Objects**: Use object maps/registries to add behavior, not switch/if chains

## Project Structure

```
domains/           # Frontend domains (see frontend-builder agent)
server/domains/    # Backend domains (see backend-builder agent)
app/api/           # API routes (thin layer, delegates to controllers)
packages/          # Shared packages (drizzle, etc.)
```

## Naming Conventions

| Type        | Pattern                  | Example                       |
| ----------- | ------------------------ | ----------------------------- |
| Components  | PascalCase               | `VoiceButton.tsx`             |
| Hooks       | useFeatureName           | `useSpeechToText.ts`          |
| Services    | feature.ts               | `problem.ts`, `evaluation.ts` |
| Controllers | feature.controller.ts    | `practice.controller.ts`      |
| Stores      | featureStore.ts          | `chatWidgetStore.ts`          |
| Tests       | `__tests__/Name.test.ts` | `__tests__/List.test.tsx`     |
| Constants   | SCREAMING_SNAKE_CASE     | `MAX_RETRIES`                 |

## Tech Stack

| Layer      | Tech                                    |
| ---------- | --------------------------------------- |
| Framework  | Next.js 16.1 (App Router, Turbopack)    |
| Language   | TypeScript 5 (strict mode)              |
| UI         | React 19, Tailwind CSS 4, Framer Motion |
| State      | Zustand, React Context                  |
| Auth       | Clerk                                   |
| Database   | PostgreSQL via Drizzle ORM (Supabase)   |
| Validation | Zod                                     |
| AI         | Google Gemini (@google/genai)           |
| Testing    | Vitest + React Testing Library          |

## Commands

```bash
npm run dev          # Start dev server
npm test             # Run tests
npm run typecheck    # Type check (tsc)
npm run lint         # Lint check
npm run lint:fix     # Auto-fix lint
npm run db:migrate   # Run migrations
```

## Quality Gates

After completing any task:

1. `npm run typecheck` - ensure types are correct
2. `npm run lint` - ensure code style (max-warnings=0)
3. `npm test` - ensure tests pass

Pre-push hook enforces all three.

## Testing

- Tests co-located in `__tests__/` folders
- Unit tests: `.test.ts` or `.test.tsx`
- Integration tests: `.integration.test.ts`
- Run specific: `npm test -- hints`

## API Routes

Thin layer at `app/api/v2/`. Routes delegate to controllers:

```typescript
export async function GET(request: NextRequest) {
  const result = await controller.doThing();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
```

## Imports

Always use `@/` path alias:

```typescript
import { Button } from "@/components/ui/button";
import { practiceController } from "@/server/domains/practice/controller";
```
