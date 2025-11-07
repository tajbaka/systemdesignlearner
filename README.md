# 🧠 System Design Sandbox

> Interactive system design playground — drag, connect, and simulate realistic architectures

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.x-6E9F18.svg)](https://vitest.dev/)

## ✨ What Makes It Special

**Problem**: System design is abstract and hard to practice without real feedback loops.

**Solution**: A visual, hands-on editor where you place components (Web, CDN, API Gateway, Service, Redis, Postgres, S3, Kafka, Load Balancer), wire them up, and run a lightweight simulation against real-world scenarios (Spotify search/play, URL shortener, rate limiter, CDN).

### 🎯 Core Ideas

- **Drag‑and‑Design**: Place nodes on an infinite grid and connect them with edges
- **Scenario‑Driven**: Pick a scenario with RPS and latency SLOs and get instant feedback
- **Fast Simulation**: Simple bottleneck + latency model to surface constraints quickly
- **Share & Fork**: One‑click shareable links encode your design; recipients can fork
- **Deterministic Chaos**: Optional chaos mode with seeded RNG for reproducible runs

---

## 🖥️ Live Experience

- Zoomable/pannable board with crisp grid and connection arrows
- Sidebar palette with performance hints on each component
- Scenario panel with requirements, results, and bottleneck hints
- Selected node panel with quick connect/delete actions

---

## 🏆 Features

### Core

- ✅ Place components: Web, CDN, API Gateway, Load Balancer, Service, Redis, Postgres, S3, Kafka Topic
- ✅ Connect nodes with directional links (latency per hop)
- ✅ Undo/Redo with snapshot stack
- ✅ Scenario selection with latency/RPS targets
- ✅ Simulation output: P95 latency, capacity (RPS), SLO checks, backlog growth

### Sharing & Collaboration

- ✅ URL encoding of designs (compressed, URL‑safe Base64)
- ✅ Read‑only view for shared links + Fork to edit

### Usability

- ✅ Smooth zoom/pan with center‑preserving zoom
- ✅ Keyboard shortcuts: Undo ⌘Z / Redo ⇧⌘Z
- ✅ Visual path highlighting from last simulation

### Developer Experience

- ✅ TypeScript end‑to‑end
- ✅ Vitest unit tests (deterministic RNG)
- ✅ Next.js App Router, client components

---

## 🛠️ Technology Stack

```text
Framework:   Next.js 15 (App Router)
Language:    TypeScript 5
UI:          React 19, Tailwind CSS 4, framer-motion (foundation), react-zoom-pan-pinch
Logic:       Lightweight simulation engine, deterministic RNG
Testing:     Vitest + Testing Library + jsdom
Build/Lint:  Turbopack dev, next build, ESLint + Prettier
```

### Architecture Highlights

- **Component‑Driven** UI in `app/components/*`
- **Scenario Catalog** in `lib/scenarios.ts`
- **Simulation Engine** in `app/components/simulation.ts` (bottleneck + latency sum)
- **Graph Utilities** in `app/components/utils.ts`
- **Shareable Links** via `lib/shareLink.ts` (pako deflate + URL‑safe base64)
- **Undo/Redo** via `lib/undo.ts` snapshot stack

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn/bun)

### Installation

```bash
# Clone the repository
git clone https://github.com/AntonioCoppe/system-design-sandbox.git
cd system-design-sandbox

# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev
```

### Build & Run

```bash
# Type check
npm run typecheck

# Production build
npm run build

# Start production server
npm start
```

### Tests

```bash
# Run once
npm test

# Watch mode
npm run test:watch

# Speech-to-text hooks
npm test -- __tests__/hooks/useWhisperStt.test.tsx
```

---

## 📖 Usage Guide

1. Open the app and pick a scenario (e.g., Spotify: Search Catalog)
2. Drag components from the palette onto the board
3. Connect nodes in the logical flow order (Web → API GW → Service → DB, etc.)
4. Click Run to simulate
5. Review results: P95 latency, capacity bottleneck, backlog growth
6. Toggle Chaos mode to introduce failure probabilities
7. Share your design via Share (URL is copied to clipboard)

### Simulation Model

- Sum of intrinsic node latencies + link latencies along the path
- Capacity = min(capacity of all nodes on the path)
- SLO checks: `meetsLatency` and `meetsRps`
- Backlog growth when required RPS > capacity

---

## 🏗️ Project Structure

```text
system-design-sandbox/
├─ app/
│  ├─ components/
│  │  ├─ SystemDesignEditor.tsx   # Main editor shell
│  │  ├─ Board.tsx                # Zoom/pan board + grid + edges
│  │  ├─ NodeCard.tsx             # Visual node with ports
│  │  ├─ Palette.tsx              # Component palette
│  │  ├─ ScenarioPanel.tsx        # Scenario selection & results
│  │  ├─ SelectedNodePanel.tsx    # Node actions (connect/delete)
│  │  ├─ simulation.ts            # Simulation engine
│  │  ├─ utils.ts                 # Graph utilities & path finder
│  │  ├─ types.ts                 # Core types
│  │  └─ data.ts                  # Component library defaults
│  ├─ page.tsx                    # Entry page
├─ lib/
│  ├─ scenarios.ts                # Scenario catalog
│  ├─ shareLink.ts                # Encode/decode shareable designs
│  ├─ rng.ts                      # Seeded RNG (mulberry32)
│  └─ undo.ts                     # Undo stack
├─ __tests__/simulate.test.ts     # Deterministic simulation tests
└─ vitest.config.ts               # Vitest setup
```

---

## 🔧 Development

### Available Scripts

```bash
npm run dev         # Start dev server (Turbopack)
npm run build       # Build for production
npm start           # Start production server
npm run typecheck   # TypeScript type check
npm test            # Run tests once
npm run test:watch  # Run tests in watch mode
npm run lint        # ESLint
npm run format      # Prettier write
npm run format:check# Prettier check
```

### Code Quality

- **TypeScript**: strict typings end‑to‑end
- **ESLint + Prettier**: consistent style and static checks
- **Testing Library**: component testing ergonomics

---

## 🧪 Scenarios Included

- Spotify: Play a Track — 200ms P95, 2k RPS
- Spotify: Search Catalog — 300ms P95, 1.5k RPS
- URL Shortener — 100ms P95, 5k RPS
- Rate Limiter — 120ms P95, 2k RPS
- CDN Design — 80ms P95, 8k RPS

Each scenario includes a recommended flow and hints. Optional steps are supported.

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes with tests where meaningful
3. Ensure `npm run typecheck && npm test && npm run lint` pass
4. Open a pull request with a clear description and screenshots/GIFs if UI related

### Adding a New Scenario

- Update `lib/scenarios.ts` with a new `Scenario` entry
- Provide clear `flow` steps and helpful `hints`

---

## 📄 License

Private & Proprietary — not open source.

---

## 👨‍💻 Author

Built with ❤️ by **Antonio Coppe**

- GitHub: <https://github.com/AntonioCoppe>
- LinkedIn: <https://linkedin.com/in/antonioscoppe>
- Portfolio: <https://antonioscoppe.dev>

If you find this interesting, consider leaving a ⭐️!
