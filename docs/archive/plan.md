# System Design Sandbox — Product & Implementation Plan (v2)

> A complete roadmap to evolve the sandbox into a lovable, NeetCode-style platform with guided practice tracks, gamified feedback, shareability, analytics, and lightweight monetization — all bootstrapped without a backend first.

---

## 0) Guiding principles

- **Speed to aha**: first win in <5 minutes.
- **Visible progress**: always show what’s next.
- **Tight feedback**: pass/fail + why + what to try.
- **Shareability**: every pass produces a brag-worthy card/link.
- **Gradual backend**: start stateless, add Supabase Auth later.

---

## 1) Landing & SEO

**Goal:** Clear promise + social proof.

### Deliverables

Hero: "Practice System Design. Visually. Fast feedback."
CTA: Try URL Shortener

FAQ + Pricing section + OG tags.

## 2) Practice: URL Shortener (MVP) — _Highest priority_ --> explore tooltips

**Goal:** A 10–15 min guided session (Brief → Design → Run → Review) with rubric checks and shareable result.

### Deliverables

- `PracticeFlow`: 4 steps — **Brief**, **Design**, **Run**, **Review**.
- **Seed board**: pre-place Web → API GW → Service → DB; learner adds Cache (+ optional CDN).
- **Rubric** checks:
  - Cache on GET path
  - Service behind LB/GW
  - Meets 100 ms P95 and 5 k RPS
- **Result panel**: PASS/FAIL badge, P95, capacity, and bottleneck with one-line hint.
- **Share link**: `Copy Run` button encodes board + scenario + pass/fail.
- **301/302 toggle** in side panel.

### Acceptance

- Learner can pass within 15 min with zero docs.
- Failing shows one actionable hint.
- Share link restores exact state.

---

## 3) No-Auth Analytics & Metrics

**Goal:** Track usage without accounts or DB.

### Tracking approach

Use `localStorage` + `track(event, data)` util (PostHog / Umami).

#### Activation

````js
track('practice_pass_first', { scenario });
Compute % of users who pass within first session.

Retention
Store timestamps per scenario; if another opened < 48 h later → track('return_within_48h').

Virality
Fire share_click and og_impression → compute CTR.

Conversion
Track upgrade_modal_view, checkout_click, checkout_success.

#### Implementation
```js
if (!localStorage.getItem('anonId'))
  localStorage.setItem('anonId', crypto.randomUUID());
````

Attach anonId to every event; send to PostHog Cloud Free or Umami endpoint.

## 4) Email Capture

**Goal:** Grow waitlist.

### Deliverables

Input on result screen:
"Get new scenarios & dailies."

MVP: webhook or mailto fallback.

## 5) Learning Path Ladder (Progress bar)

**Goal:** Make progress “finishable.”

### Deliverables

- `/practice` shows ladder:  
  `URL Shortener → Rate Limiter → CDN → News Feed → Messenger`.
- Progress pill (“1/5 completed”) + ✅ per scenario.
- Stored in `localStorage` (Supabase sync later).

---

## 3) Skill Metrics (granular feedback)

**Goal:** After each run, display **Scalability / Fault tolerance / Latency** bars.

### Deliverables

- Compute scores from rubric & simulation (0–100 scale).
- Render 3 bars with explanations like  
  _“Cache hit ratio is low → add Redis on GET path.”_

---

## 4) Social Share + Profile Stub

**Goal:** Let users brag and compare.

### Deliverables

- Dynamic **OG image card** per run (scenario, result, time-to-pass).
- `/u/local` profile stub (shows passed scenarios, best times).
- “Top 5 shared today” client-side widget.

---

## 6) Daily Challenge (habit loop)

**Goal:** One rotating scenario per day.

### Deliverables

- `/daily` page rotates beginner scenarios every 24 h.
- Timer (“⏱ 12h left”) and local pass record.
- Next-day auto-reset.

---

## 7) Skill Metrics (granular feedback)

**Goal:** After each run, display **Scalability / Fault tolerance / Latency** bars.

### Deliverables

- Compute scores from rubric & simulation (0–100 scale).
- Render 3 bars with explanations like
  _"Cache hit ratio is low → add Redis on GET path."_

## 8) Coach Hints (guided help)

**Goal:** Optional progressive hints.

### Deliverables

- 3 hint levels per scenario (concept → placement → trade-off).
- "Show Coach Hints" toggle.
- Track `hint_open` events for analytics.

---

## 9) Monetization (Stripe)

**Goal:** Free habit loop + low-friction upgrade.

### Tiers

| Tier               | Price   | Features                                                         |
| ------------------ | ------- | ---------------------------------------------------------------- |
| **Free**           | $0      | 3 scenarios, progress tracking, daily challenge                  |
| **Pro (Lifetime)** | $29     | All scenarios, Coach Hints, Profile, Share images, Skill metrics |
| **Plus**           | $9 / mo | Interview vault PDFs, AI grader (phase 2)                        |

### Deliverables

- Stripe Checkout (one-time + monthly).
- Client-side gate via `user.plan` in `localStorage` (mock now).
- Upgrade modal on pass/fail with ROI bullets.

---

## 10) Social Share + Profile Stub

**Goal:** Let users brag and compare.

### Deliverables

- Dynamic **OG image card** per run (scenario, result, time-to-pass).
- `/u/local` profile stub (shows passed scenarios, best times).
- "Top 5 shared today" client-side widget.

## 11) Authentication & User State

**Goal:** Persist progress, purchases, and metrics across devices.

### Deliverables

- Email OTP login/signup via **Supabase Auth**.
- `AuthContext` provider.
- Merge local progress → user row on login.
- Attach `stripe_customer_id` to `auth.user.id`.
- Anonymous fallback keeps free flow alive.

### Acceptance

- Login/logout without reload.
- Returning user sees identical progress + Pro status.
- Stripe checkout instantly unlocks Pro features.

### Later expansion

- OAuth (GitHub/Google).
- Public profile toggle for leaderboard.

---

## 12) Leaderboard (lightweight)

**Goal:** Friendly competition.

### Deliverables

- Local PB leaderboard first.
- Optional global top 10 once backend stable.

---

## 13) Docs Primer (5 micro-pages)

**Goal:** Give quick theory anchors.

### Pages

- Caching basics
- 301 vs 302
- Rate limiting
- Load balancing
- DB replicas

Each ≈ 250 words + diagram, linked from hints.

---

## 14) Sandbox UX Polish

**Goal:** Lower cognitive load.

### Deliverables

Highlight hot path after run.

Label bottleneck node ("capacity 3.2k < 5k").

Add "Reset Board" + "Try Alternative Design."

Ensure mobile auto-center on spawn.

---

## 15) PWA & Offline (Optional)

**Goal:** Cache docs & scenarios for fast relaunch.

### Deliverables

Manifest + Service Worker for offline mode.

---

## 16) Teams / Enterprise (Optional)

**Goal:** Mentor + Bootcamp collaboration.

### Deliverables

"Share for Review" link with comment pins.

Team leaderboard (later via Supabase).

🧱 Engineering Plan — Files & Estimates
(Maker-days; parallelize UI / Platform work)

| Stage | Feature                 | Days | Key Files                                |
| ----- | ----------------------- | ---- | ---------------------------------------- |
| A     | Landing & SEO           | 1    | /page.tsx, seo.config.ts                 |
| B     | Practice: URL Shortener | 3-4  | PracticeFlow, lib/practice/scoring.ts    |
| C     | No-Auth Analytics       | 1    | lib/track.ts, PostHog SDK                |
| D     | Email Capture           | 0.5  | components/EmailCapture.tsx              |
| E     | Learning Path Ladder    | 1-2  | /practice/index.tsx, useProgress.ts      |
| F     | Daily Challenge         | 1-2  | /daily/page.tsx                          |
| G     | Skill Metrics           | 1    | lib/scoring.ts, components/ScoreBars.tsx |
| H     | Coach Hints             | 1-2  | lib/hints.ts, components/HintPanel.tsx   |
| I     | Monetization (Stripe)   | 2-3  | stripe.ts, usePlan.ts                    |
| J     | Social Share + Profile  | 2-3  | app/api/og/route.ts, /u/local.tsx        |
| K     | Auth / User State       | 2    | AuthContext.tsx, supabase.ts             |
| L     | Leaderboard             | 1    | useLeaderboard.ts, LeaderboardCard.tsx   |
| M     | Docs Primer             | 1-2  | /docs/\*.mdx                             |
| N     | Sandbox UX Polish       | 1    | Simulator.tsx, ResultPanel.tsx           |
| O     | PWA & Offline           | 1-2  | manifest.json, sw.js                     |
| P     | Teams / Enterprise      | 2-3  | components/TeamShare.tsx, supabase.ts    |

📊 Success Metrics (v1)
Activation: % of users passing URL Shortener in first session.

Retention: % attempting another scenario within 48 h.

Virality: Share-rate / CTR on OG cards.

Conversion: Upgrade modal views → checkouts.

(All measurable with no-auth analytics + optional Supabase later.)

🚨 Risks & Mitigation

| Risk              | Mitigation                        |
| ----------------- | --------------------------------- |
| Scope creep       | Ship 5 scenarios max for v1       |
| Backend delays    | Store everything locally now      |
| Stripe complexity | Use Checkout links + webhook stub |
| Analytics privacy | Anonymous UUID + opt-out toggle   |

🧠 Appendix — UI Copy Examples
Practice card: “Finish URL Shortener in <15 minutes. Real rubric. Share your pass.”

Fail hint: “Your GET path hits the DB on every request. Add a cache between Service and DB, then re-run.”

Upgrade modal: "Unlock Coach Hints, Pro scenarios & share images — one-time $29."

---

This version gives you a **complete implementation map** — from no-auth analytics to Supabase login integration — ordered by impact and difficulty, ready for direct inclusion in your repo as `plan.md`.
