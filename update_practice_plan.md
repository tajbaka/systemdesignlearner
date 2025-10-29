# Practice Flow Refresh — URL Shortener First

> Transform the `/practice` experience into a 6-step guided flow, landing first on `/practice/url-shortener` but structured for future scenarios (Rate Limiter, CDN, etc.).

---

## 0. Objectives & Guardrails
- Ship a polished walkthrough for URL Shortener that captures functional + non-functional requirements, locks in the API, pushes users into the sandbox, and culminates in save/share.
- Avoid bespoke UI per scenario. Introduce a step-driven layout shell that reads its configuration (labels, prompts, component reuse) from scenario metadata.
- Keep the mobile sandbox untouched; only wrap it with navigation and panel filters.
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
  - `paletteFilters` derived from requirements answers (used by sandbox).
- **Component reuse:** lean on existing cards, nav, sandbox modules. Only build thin wrappers where missing.

---

## 2. Step Details

### Step 1 — Functional Requirements
- **Header:** `1 / 6` indicator, label `Functional Requirements`, scenario title `URL Shortener`.
- **Content:** 
  - Prompt `"What should this system do?"`.
  - Textarea inside the existing mobile-style card container. Placeholder: `"Example: shorten URL, redirect by slug, custom alias, analytics, delete URL"`.
  - Speech-to-text mic icon aligned with input right edge (reuse pattern from any existing voice UI; otherwise add simple `IconButton` placeholder).
- **Footer:** single `Next` button (reuse Bottom nav single-button state).
- **Implementation notes:**
  - Reuse `MobileLayoutWrapper` + `CardInput`.
  - Persist text to `formData.functionalRequirements`.
  - Guard Next: allow empty but show subtle prompt if untouched.

### Step 2 — Non-Functional Requirements
- **Header:** `2 / 6`, label `Non-Functional Requirements`.
- **Content:** 
  - Prompt `"Define constraints and performance goals."`.
  - Stack of form rows: Latency target (ms), Write RPS target, Read RPS target, Rate limit notes, Availability target.
  - Multi-line notes textarea at bottom.
  - Speech-to-text mic icon (same component as Step 1).
  - Spacing should mirror `ReqForm.tsx` (check `antoniocoppe-system-design-sand…` reference).
- **Footer:** `Back` | `Next`.
- **Implementation notes:**
  - Extract shared input row styles from `ReqForm.tsx` into reusable primitive if needed.
  - Store numeric inputs with validation messaging inline (but allow progression with blanks).
  - Use existing bottom nav component in dual-button mode.

### Step 3 — API Definition
- **Header:** `3 / 6`, label `API`.
- **Content:** 
  - Prompt `"Based on your requirements, define the API endpoints."`.
  - Auto-suggest list (cards or rows) seeded with `POST /shorten`, `GET /:slug`. 
  - Selecting suggestion opens detail editor panel:
    - Method dropdown (read-only for seeded endpoints).
    - Path input.
    - Body JSON field (POST only).
    - Response JSON preview (read-only for now, placeholder text).
  - Ideally reuse bottom sheet / accordion patterns from scenario panels.
- **Footer:** `Back` | `Next`.
- **Implementation notes:**
  - Data structure: `apiEndpoints: Array<{ id; method; path; body; response; isSuggested; }>` stored in state.
  - Use bottom slide-up panel pattern from mobile (e.g., `BottomSheet.tsx`) for endpoint editor.
  - Add ability to add custom endpoints later; keep UI scalable.

### Step 4 — High-Level Design (Sandbox)
- **Header:** `4 / 6`, label `High-Level Design`.
- **Content:** embed existing mobile sandbox with:
  - Hidden top nav (wrap or prop).
  - Visible bottom toolbar, `+` button opens component palette.
  - Auto-center on load retouched (keep behavior).
  - Palette filtered using requirements inputs (simple gating map; hide components that don't align).
  - `MobileSimulationPanel` remains hidden until "Run".
- **Footer:** `Back` | `Next` | `+` (button triggers palette open).
- **Implementation notes:**
  - No redesign. Pass down filters via props.
  - Ensure sandbox respects speech icon absence (not used here).
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
  - Buttons: `Improve design` (returns to Sandbox step 4), `Share badge`.
  - Social row with LinkedIn share CTA.
  - Text `"Continue practice tomorrow for new systems."`
- **Footer:** Buttons `Back to Sandbox` (step 4) and `Home`.
- **Implementation notes:**
  - Reuse existing review screen components—strip down to essentials.
  - `Share badge` triggers existing share flow.
  - Summaries pull from current scoring logic (ensure data available after Step 4 run).

---

## 3. Component Reuse Matrix (Quick Ref)
| Step | Reuse |
|------|-------|
| 1 | `MobileLayoutWrapper`, card input container, bottom nav (single button) |
| 2 | `ReqForm.tsx` row pattern, card container, bottom nav |
| 3 | `BottomSheet.tsx`, scenario accordion styles, shared form inputs |
| 4 | Entire mobile sandbox module, palette bottom sheet |
| 5 | Landing `Button` components, `EmailCapture` styling |
| 6 | Review/Score components, PASS badge visuals |

Speech-to-text icon only appears on Steps 1–2; hide elsewhere.

---

## 4. State & Navigation Strategy
- Centralize flow state in a `PracticeSessionProvider` scoped to `/practice/[slug]`.
- Step config defined as array:
  ```ts
  type StepConfig = {
    id: 'functional' | 'nonFunctional' | 'api' | 'sandbox' | 'auth' | 'score';
    label: string;
    component: React.ComponentType;
    nav: { back?: boolean; next?: boolean; extra?: 'palette' | 'home'; };
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
4. **Step 4 Integration** — embed sandbox, implement palette filtering (map requirements to component categories).
5. **Steps 5–6** — hook into existing auth + scoring; confirm share button works.
6. **Polish & QA** — mobile + desktop check, keyboard focus order, persistence.

---

## 6. Testing & Validation Checklist
- Manual walkthrough on `/practice/url-shortener` covering:
  - Fresh user (all steps sequential, skip auth).
  - Returning authed user (auth gate auto-unlocked).
  - Sandbox state persists when jumping back from Step 6 → Step 4.
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

