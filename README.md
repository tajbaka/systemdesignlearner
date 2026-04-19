# System Design Learner

Interactive system design playground with practice problems, learning articles, and AI-powered feedback.

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3-6E9F18.svg)](https://vitest.dev/)

## What it does

Practice real system design interviews end-to-end:

- Walk through curated problems (URL shortener, rate limiter, distributed crawler, etc.) with guided steps for functional requirements, non-functional requirements, API design, and high-level architecture.
- Drag-and-drop architecture canvas with components (services, databases, caches, queues, load balancers) and directional connections.
- AI-powered evaluation (Google Gemini) gives per-step feedback on your design choices.
- Long-form learning articles covering distributed systems fundamentals, scalability patterns, and interview prep.

## Tech Stack

| Layer      | Tech                                    |
| ---------- | --------------------------------------- |
| Framework  | Next.js 16.1 (App Router, Turbopack)    |
| Language   | TypeScript 5 (strict)                   |
| UI         | React 19, Tailwind CSS 4, Framer Motion |
| State      | Zustand, React Context                  |
| Auth       | Clerk                                   |
| Database   | PostgreSQL via Drizzle ORM (Supabase)   |
| Validation | Zod                                     |
| AI         | Google Gemini (`@google/genai`)         |
| Testing    | Vitest + React Testing Library          |

## Quick Start

```bash
git clone https://github.com/tajbaka/systemdesignlearner.git
cd systemdesignlearner
npm install
npm run dev
```

The dev script auto-spins a local Docker Postgres via `scripts/with-local-postgres.sh`. App runs at `http://localhost:3000`.

### Environment

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — Postgres connection string (auto-set in dev)
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini for AI feedback
- `OPENAI_API_KEY` — Whisper for voice transcription (optional)

## Scripts

```bash
npm run dev              # Dev server (Turbopack + local Postgres)
npm run dev:remote       # Dev server against remote DB
npm run build            # Production build
npm start                # Production server
npm run typecheck        # TypeScript
npm run lint             # ESLint (max-warnings=0)
npm test                 # Unit tests
npm run test:integration # Docker-backed integration tests
npm run db:migrate       # Drizzle migrations
```

Pre-push hook runs build + tests + lint + typecheck.

## Project Structure

```text
app/                  # Next.js App Router (pages + API routes)
  api/v2/             # Versioned API endpoints — thin layer over controllers
domains/              # Frontend domains (practice, learn, authentication)
server/domains/       # Backend domains (controllers, services, schemas)
packages/             # Shared (drizzle config, etc.)
lib/                  # Cross-cutting utilities
emails/               # React Email templates
docs/                 # Project docs and plans
__tests__/            # Top-level test suites
```

See `CLAUDE.md` for the architectural conventions (domain-driven, discriminated-union error handling, naming patterns).

## Testing

- Unit/component tests co-located in `__tests__/` folders (`.test.ts(x)`)
- Integration tests (`.integration.test.ts`) run against a disposable Docker Postgres
- Inspect a failed integration DB: `KEEP_INTEGRATION_DB=1 npm run test:integration` — clean up with `npm run test:integration:db:down`

## License

Private & Proprietary — see [LICENSE](./LICENSE).

## Authors

Built by **Arian Taj**

- GitHub: [@tajbaka](https://github.com/tajbaka)
- LinkedIn: [arian-taj](https://www.linkedin.com/in/arian-taj/)

And **Antonio Coppe**

- LinkedIn: [antonio-coppe](https://www.linkedin.com/in/antonio-coppe/)
