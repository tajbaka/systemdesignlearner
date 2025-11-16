# 90DaysPlan.md

> Goal: Validate whether **System Design Sandbox** (or renamed product) can become a real, profitable business with recurring user interest — within 90 days, with minimal backend and cost.

---

## 🎯 Mission

Prove three things fast:

1. **People care** about visual, hands-on system design practice.
2. **They return** to use it again.
3. **Some pay** for deeper value (Coach Hints, Profile, Metrics).

---

## ⚙️ Core Principles

- Ship small, fast, measurable increments.
- Favor _localStorage + no-auth analytics_ over premature backend.
- Every week must produce **observable data** (users, engagement, revenue).
- Stop if metrics stay flat after two pivots.

---

## 🗓️ Timeline Overview

| Phase | Duration   | Theme                          | Key Outcome                     |
| ----- | ---------- | ------------------------------ | ------------------------------- |
| 1     | Weeks 1–4  | Attention & Problem Validation | People click, play, and sign up |
| 2     | Weeks 5–8  | Retention & Habit Loop         | People return & share results   |
| 3     | Weeks 9–12 | Monetization & Decision        | People pay or clearly don’t     |

---

## 🔹 Phase 1 — Weeks 1–4: **Attention & Problem Validation** ✅ IMPLEMENTED

### Goal

Confirm that developers _want_ to practice system design visually.

### Deliverables ✅ COMPLETED (Oct 11, 2025)

- ✅ Landing page:
  "**Practice System Design. Visually. Finish URL Shortener < 15 min.**"
- ✅ Static MVP with **1 scenario (URL Shortener)**
  - `Brief → Design → Run → Review`
  - PASS/FAIL rubric + shareable result
- ✅ Add `EmailCapture` on pass screen + homepage footer
- ✅ PostHog tracking configured:
  - `practice_start`, `practice_run_completed`, `practice_pass_first`
  - `email_capture_success`, `email_capture_submitted`, `email_capture_already_subscribed`
  - `practice_shared`, `$pageview`
- ✅ Phase-1 Metrics Dashboard created in PostHog

### Launch Channels (Pending)

- Reddit (`r/systemdesign`, `r/learnprogramming`)
- X / LinkedIn / ProductHunt teaser
- Send demo to 5 mentors / friends for feedback

### Success Metrics - 2 Week Tracking

**Start Date:** Oct 11, 2025
**Week 1 Check:** Oct 18, 2025
**Week 2 Check:** Oct 25, 2025 (Final Review)

| Metric          | PostHog Event              | Target  | Week 1 Actual (Oct 18) | Week 2 Actual (Oct 25) | Status      |
| --------------- | -------------------------- | ------- | ---------------------- | ---------------------- | ----------- |
| Unique visitors | `$pageview` (unique users) | 500     | —                      | —                      | ✅ Tracking |
| Practice starts | `practice_start`           | 100     | —                      | —                      | ✅ Tracking |
| Email signups   | `email_capture_success`    | 30 (6%) | —                      | —                      | ✅ Tracking |
| Organic shares  | `practice_shared`          | 10+     | —                      | —                      | ✅ Tracking |
| First-pass wins | `practice_pass_first`      | N/A     | —                      | —                      | ✅ Tracking |

**Baseline (Oct 11):** 1 visitor, 1 practice start, 1 email signup, 6 shares, 3 first-pass wins

### Review Checkpoint

If visitors <200 or plays <50 → revisit headline & thumbnail.

---

## 🔹 Phase 2 — Weeks 5–8: **Retention & Habit Loop**

### Goal

Check if users come back and finish multiple challenges.

### Deliverables

- Add **Progress Ladder** (`localStorage`)
- Add **Daily Challenge** (`/daily` rotating scenario)
- Add **Skill Metrics bars**: Scalability / Latency / Fault Tolerance
- Add **Coach Hints (3-tier)** toggle
- Add lightweight tracking:  
  `return_within_48h`, `share_click`, `hint_open`

### Growth Actions

- Post short demo videos showing “visual feedback loop”
- Run $50 Reddit/X ad test for dev keywords
- DM or email early users: “How did it feel?”

### Success Metrics

| Metric                    | Target                |
| ------------------------- | --------------------- |
| ≥25% returning within 48h | ✅ Retention signal   |
| ≥10% share pass card      | ✅ Virality seed      |
| ≥3 user interviews        | ✅ Qual feedback loop |

### Review Checkpoint

If retention <10% → revise ladder UX, shorten time-to-aha.

---

## 🔹 Phase 3 — Weeks 9–12: **Monetization & Decision**

### Goal

Test willingness to pay — _do users value the upgrade?_

### Deliverables

- Stripe Link integration (no backend)
  - $29 lifetime “Pro” tier → unlock hints, profile, metrics
- Add upgrade modal on pass/fail screen  
  “Unlock Coach Hints, Pro scenarios, share cards.”
- Add `/u/local` stub profile
- Add OG share images via `/api/og`

### Launch

- Announce to waitlist
- Product Hunt + Indie Hackers “v1 launch”
- Track `checkout_view`, `checkout_click`, `checkout_success`

### Success Metrics

| Metric                               | Target                |
| ------------------------------------ | --------------------- |
| ≥3% free→Pro conversion              | ✅ Market willingness |
| ≥$500 revenue in 30 days             | ✅ Business potential |
| ≥5 public posts/tweets mentioning it | ✅ Organic resonance  |

### Review Checkpoint

If conversion <1% but traffic healthy → pivot to mentor/bootcamp B2B or AI feedback angle.

---

## ⚖️ Decision Framework

| Evidence                                | Interpretation  | Next Step                           |
| --------------------------------------- | --------------- | ----------------------------------- |
| Strong activation + retention + payment | Business ✅     | Expand scenarios, add Supabase Auth |
| Good activation, poor conversion        | Interest only   | Add more value before paywall       |
| Weak activation (<3%)                   | No clear demand | Pivot or pause idea                 |

---

## 🧭 Optional Stretch Goals (after day 90)

- Add Supabase Auth for syncing progress
- Implement public leaderboards
- Add AI Coach feedback (GPT-based)
- Bundle with interview-prep YouTubers (affiliate)

---

## 📈 Tracking Stack

- **Analytics**: PostHog / Umami (anon UUID)
- **Payments**: Stripe Link / LemonSqueezy
- **Hosting**: Vercel
- **Storage**: LocalStorage (Supabase later)
- **Feedback**: Manual DMs + form
- **KPIs Dashboard**: Notion / Airtable manually updated weekly

---

## 🚨 Kill or Commit Rule

If by day 90:

- <25% returning users,
- <3% upgrade conversion,
- <50 total signups →  
  → archive project or reposition to **B2B bootcamp training tool.**

Otherwise → proceed to Supabase Auth + 5 more scenarios → **v1 launch.**

---

**End of 90DaysPlan.md**
