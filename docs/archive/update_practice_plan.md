# Practice Flow Refresh — URL Shortener First

> Transform the `/practice` experience into a 6-step guided flow, landing first on `/practice/url-shortener` but structured for future scenarios (Rate Limiter, CDN, etc.).

---

## 0. Objectives & Guardrails

- Ship a polished walkthrough for URL Shortener that captures functional + non-functional requirements, locks in the API, pushes users into the canvas, and culminates in save/share.
- Avoid bespoke UI per scenario. Introduce a step-driven layout shell that reads its configuration (labels, prompts, component reuse) from scenario metadata.
- Keep the mobile canvas untouched; only wrap it with navigation and panel filters.
- Preserve fast iteration: no new backend work; wire auth gate to existing stubs.

---

## 1. Flow Skeleton (applies to every scenario)

- **Route:** `/practice/[scenarioSlug]` (start with slug `url-shortener`).
- **Global layout shell:**
  - Top header with step indicator (`currentStep / totalSteps`) and step label pulled from flow config.
  - Scenario title pulled from metadata.
  - Content region swaps per step.
  - Footer nav with conditional buttons (`Back`, `Next`, `+`, `Skip`) driven by step config.
- **State model:**
  - `currentStep` (0–5).
  - `formData` keyed by step (reuse existing `ReqForm` state structure where possible).
  - `isAuthed` / `authSkipped` flags gate Step 5 → Step 6.
  - `paletteFilters` derived from requirements answers (used by canvas).
- **Component reuse:** lean on existing cards, nav, canvas modules. Only build thin wrappers where missing.

---

## 2. Step Details

### Step 1 — Functional Requirements

- **Header:** `1 / 6` indicator, label `Functional Requirements`, scenario title `URL Shortener`.
- **Content:**
  - Prompt `"What should this system do?"` followed by a single, tall card with the summary textarea centered below the title—no extra badges or chips.
  - Placeholder copy `"Example: shorten URLs, redirect by slug, allow optional custom aliases and view counts."`.
  - Speech-to-text mic button anchored inside the textarea (bottom-right) so users can type or speak without leaving the same input.
- **Footer:** single `Next` button (reuse Bottom nav single-button state).
- **Implementation notes:**
  - Reuse `MobileLayoutWrapper` + `CardInput`.
  - Persist text to `formData.functionalRequirements`.
  - Guard Next: allow empty but show subtle prompt if untouched.

### Step 2 — Non-Functional Requirements

- **Header:** `2 / 6`, label `Non-Functional Requirements`.
- **Content:**
  - Same layout language as Step 1: title + single card with a tall textarea labelled `"Define constraints and performance goals."`.
  - Within that textarea capture combined notes (latency, throughput, availability, rate limiting) instead of multiple numeric rows.
  - Embed the same bottom-right speech-to-text button so users can dictate their constraints.
- **Footer:** `Back` | `Next`.
- **Implementation notes:**
  - Persist raw text, then parse/extract numbers server-side or during scoring if needed.
  - Keep validation lightweight (warn but don’t block).
  - Reuse dual-button bottom nav.

### Step 3 — API Definition

- **Header:** `3 / 6`, label `API`.
- **Content:**
  - Render a vertical stack of endpoint cards; each card mirrors the Step 1 textarea treatment:
    - Header showing method + path (`POST /shorten`, `GET /:slug`, etc.).
    - Inside, a large textarea for the request/response schema (auto-filled for seeded endpoints) with an inline speech-to-text button so users can dictate updates.
    - Optional helper text below the textarea (e.g., “Describe request body or the redirect behavior”).
  - Provide “Add endpoint” action that appends another card with the same textarea + mic pattern.
- **Footer:** `Back` | `Next`.
- **Implementation notes:**
  - Use `apiEndpoints: Array<{ id; method; path; notes; }>`; tie textarea value to `notes`.
  - Seed with `POST /shorten`, `GET /:slug` but allow freeform additions.
  - Keep speech button accessible (ARIA) and reuse the same component from Steps 1–2.

### Step 4 — High-Level Design (Canvas)

- **Header:** `4 / 6`, label `High-Level Design`.
- **Content:** embed existing mobile canvas with:
  - Hidden top nav (wrap or prop).
  - Visible bottom toolbar, `+` button opens component palette.
  - Auto-center on load retouched (keep behavior).
  - Palette filtered using requirements inputs (simple gating map; hide components that don't align).
  - `MobileSimulationPanel` remains hidden until "Run".
- **Footer:** `Back` | `Next` | `+` (button triggers palette open).
- **Implementation notes:**
  - No redesign. Pass down filters via props.
  - Ensure canvas respects speech icon absence (not used here).
  - Persist board state in scenario context to feed scoring later.

### Step 5 — Auth Gate

- **Header:** `5 / 6`, label `Save Progress`.
- **Content:**
  - Text `"Sign in to save your design and score."`.
  - Buttons: `Continue with Google`, `Continue with Email`.
  - Tiny text link `Skip for now`.
  - Use existing `EmailCapture` button styles + landing page button components.
- **Footer:** `Back`; `Next` disabled until `isAuthed` or `authSkipped`.
- **Implementation notes:**
  - Hook buttons to current auth stubs/modals (no new providers).
  - On skip, set `authSkipped = true`, unlock Next but remind user with toast.
  - When authed, persist flow data to local storage / Supabase later.

### Step 6 — Score & Share

- **Header:** `6 / 6`, label `Finish`.
- **Content:** card with:
  - Score badge (reuse PASS badge styling).
  - Pass/fail or suggestions summary.
  - Buttons: `Improve design` (returns to Canvas step 4), `Share badge`.
  - Social row with LinkedIn share CTA.
  - Text `"Continue practice tomorrow for new systems."`
- **Footer:** Buttons `Back to Canvas` (step 4) and `Home`.
- **Implementation notes:**
  - Reuse existing review screen components—strip down to essentials.
  - `Share badge` triggers existing share flow.
  - Summaries pull from current scoring logic (ensure data available after Step 4 run).

---

## 3. Component Reuse Matrix (Quick Ref)

| Step | Reuse                                                                   |
| ---- | ----------------------------------------------------------------------- |
| 1    | `MobileLayoutWrapper`, card input container, bottom nav (single button) |
| 2    | `ReqForm.tsx` row pattern, card container, bottom nav                   |
| 3    | `BottomSheet.tsx`, scenario accordion styles, shared form inputs        |
| 4    | Entire mobile canvas module, palette bottom sheet                       |
| 5    | Landing `Button` components, `EmailCapture` styling                     |
| 6    | Review/Score components, PASS badge visuals                             |

Speech-to-text icon only appears on Steps 1–2; hide elsewhere.

---

## 4. State & Navigation Strategy

- Centralize flow state in a `PracticeSessionProvider` scoped to `/practice/[slug]`.
- Step config defined as array:
  ```ts
  type StepConfig = {
    id: "functional" | "nonFunctional" | "api" | "canvas" | "auth" | "score";
    label: string;
    component: React.ComponentType;
    nav: { back?: boolean; next?: boolean; extra?: "palette" | "home" };
  };
  ```
- Use config to render header, content, footer, and to determine speech icon visibility + palette filters.
- Persist progress in `localStorage` keyed by `scenarioSlug` so returning users can resume.
- Gate navigation:
  - Step 5 `Next` requires `isAuthed || authSkipped`.
  - Step 6 `Share` should fail gracefully offline (toast).
- Keep flow extensible: scenario metadata describes placeholder text, suggested API endpoints, palette filter rules.

---

## 5. Implementation Phases

1. **Scaffold Layout Shell** — create provider, stepper component, footer nav states.
2. **Steps 1–2** — port inputs into card wrapper, add speech icon placeholder (wire later).
3. **Step 3** — build auto-suggest list + bottom sheet editor; ensure design tokens consistent.
4. **Step 4 Integration** — embed canvas, implement palette filtering (map requirements to component categories).
5. **Steps 5–6** — hook into existing auth + scoring; confirm share button works.
6. **Polish & QA** — mobile + desktop check, keyboard focus order, persistence.

---

## 6. Testing & Validation Checklist

- Manual walkthrough on `/practice/url-shortener` covering:
  - Fresh user (all steps sequential, skip auth).
  - Returning authed user (auth gate auto-unlocked).
  - Canvas state persists when jumping back from Step 6 → Step 4.
- Responsive checks for 320px width and desktop.
- Accessibility: step indicator announced, buttons labelled, mic icon has `aria-pressed`.
- Analytics hooks (if available): track step completions, share clicks.

---

## 7. Future Extensibility Hooks

- Scenario config file to map slug → prompts, defaults, suggested API endpoints, palette filters.
- Optional rubrics per scenario to adjust scoring copy on Step 6.
- Speech recognition fallback to text input if browser unsupported.
- Expand Step 3 to allow custom endpoints with validation badges.

---

## 8. Open Questions

- Do we soft-lock Step 4 `Run` until requirements filled? (Currently optional.)
- Should speech-to-text actually record audio now or remain stubbed icon?
- LinkedIn share: use existing OG image or new badge asset?
- Palette filtering mapping rules: derive from requirements keywords or explicit toggles?

Document these decisions before implementation to keep `/practice` scenarios consistent.
