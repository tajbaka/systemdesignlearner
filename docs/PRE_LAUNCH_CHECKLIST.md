# Pre-Launch Checklist

> Infrastructure and cost controls needed before public launch

## Current Status

- ✅ **Auth**: Clerk integration complete
- ✅ **Database**: Supabase configured
- ✅ **Analytics**: PostHog tracking
- ✅ **Error Tracking**: Sentry configured
- ✅ **LLM Integration**: Gemini API (2.0 Flash)
- ❌ **Rate Limiting**: Not implemented
- ❌ **Usage Tracking**: No per-user quotas
- ❌ **Cost Monitoring**: No alerts set up

---

## Critical (Must-Have Before Public Launch)

### 1. Rate Limiting on LLM Endpoints

**Priority**: 🔴 Critical

**Endpoints to protect**:

- `/api/iterative-feedback` (POST)
- `/api/practice/verify-step` (POST)

**Implementation options**:

#### Option A: Supabase-based rate limiting (Recommended)

```typescript
// Create table: user_api_usage
// Columns: user_id, endpoint, request_count, window_start, created_at
// Index: (user_id, endpoint, window_start)

// Limits:
// - 10 requests/hour per user for iterative-feedback
// - 20 requests/hour per user for verify-step
// - 100 requests/day total per user
```

#### Option B: Vercel Edge Config (if on Pro plan)

- Faster, edge-based rate limiting
- Costs extra but reduces database load

**Estimated effort**: 2-3 hours

---

### 2. Client-Side Throttling

**Priority**: 🟡 High

**Quick wins**:

- [ ] Debounce iterative feedback calls (500ms)
- [ ] Disable submit buttons during API calls
- [ ] Add loading states to prevent double-clicks
- [ ] Show "Processing..." overlay for LLM calls

**Files to update**:

- `hooks/useIterativeFeedback.ts:99`
- `components/practice/steps/*.tsx`

**Estimated effort**: 1 hour

---

### 3. Cost Monitoring & Alerts

**Priority**: 🟡 High

**Setup required**:

#### Google Cloud Console (Gemini API)

- [ ] Set up billing alerts at $50, $100, $200/month
- [ ] Enable daily budget notifications
- [ ] Review quota limits (requests/minute)

#### Vercel

- [ ] Configure spending notifications
- [ ] Set function execution time alerts
- [ ] Monitor bandwidth usage

#### PostHog Events

- [ ] Track `llm_call_made` event with metadata:
  - `endpoint`: which API route
  - `user_id`: who made the call
  - `tokens_estimated`: rough token count
  - `duration_ms`: call duration

**Estimated effort**: 1 hour

---

### 4. Usage Quotas per User

**Priority**: 🟡 High

**Free tier limits** (recommended for launch):

- 50 LLM calls per user per day
- 500 LLM calls per user per month
- Reset daily at midnight UTC

**Implementation**:

- [ ] Create Supabase table: `user_quotas`
- [ ] Add middleware to check quota before LLM calls
- [ ] Show user their remaining quota in UI
- [ ] Display upgrade prompt when quota exhausted

**Estimated effort**: 3-4 hours

---

## Important (Should-Have for Better UX)

### 5. Error Handling for Rate Limits

**Priority**: 🟢 Medium

- [ ] Graceful error messages when rate limited
- [ ] Show time until rate limit reset
- [ ] Suggest using practice mode without AI feedback
- [ ] Add retry logic with exponential backoff

**Current handling**: Basic 429 error in `app/api/iterative-feedback/route.ts:229`

**Estimated effort**: 2 hours

---

### 6. Session Storage Architecture Review

**Priority**: 🟡 High

**Current state**:

- Clerk handles auth sessions
- Supabase stores persistent user data
- No clarity on what should be in cookies vs. database

**Research & decide**:

- [ ] Audit what data is stored in Supabase per user:
  - Practice session state (designs, progress, scores)
  - User preferences (theme, tutorial completion)
  - Usage quotas and rate limit counters
  - LLM call history
- [ ] Evaluate cookie-based session storage:
  - ✅ **Pros**: No database reads, faster page loads, lower Supabase costs
  - ❌ **Cons**: 4KB cookie limit, security risks, sync issues across devices
- [ ] Define data storage strategy:
  - **Cookies/LocalStorage**: UI preferences, feature flags, anonymous sessions
  - **Database (Supabase)**: User account data, usage quotas, LLM history, saved designs
  - **URL hash**: Temporary design state (already implemented via shareLink.ts)
- [ ] Best practices:
  - Session tokens in httpOnly cookies (Clerk handles this)
  - Transient UI state in localStorage/sessionStorage
  - Persistent user data in database
  - Never store sensitive data in cookies/localStorage

**Decision criteria**:

- Multi-device sync needed? → Use database
- Need server-side validation? → Use database
- Just UI preferences? → Use localStorage
- Rate limiting/quotas? → MUST use database (can't trust client)

**Recommendation**:

- Keep rate limiting, quotas, and LLM history in **Supabase** (server-controlled)
- Move UI preferences to **localStorage** (tutorial state, theme, collapsed panels)
- Keep practice session state in **URL hash** for sharing (already implemented)

**Estimated effort**: 3-4 hours (research + implementation)

---

### 7. Caching Strategy

**Priority**: 🟢 Medium

**Opportunities**:

- [ ] Cache verification results for identical inputs (hash user content)
- [ ] Cache scenario configs and step requirements
- [ ] Use Vercel KV for hot-path data (if on Pro plan)

**Potential savings**: 30-50% reduction in LLM calls

**Estimated effort**: 4-5 hours

---

### 7. PostHog Analytics Setup

**Priority**: 🟡 High

**Data Cleanup**:

- [ ] Clean up development/testing data in PostHog:
  - Delete events from your own testing
  - Remove close friends' test sessions
  - Filter out localhost events (if captured)
  - Set baseline to launch date for accurate metrics
- [ ] Create test account filters:
  - Add your email domains to PostHog filters
  - Tag internal team accounts with `is_internal: true`
  - Exclude internal users from production analytics

**Feature Flags & Filters**:

- [ ] Create feature flag for `enable_llm_features` (kill switch)
- [ ] Set up user property filters:
  - `is_paying_user` (boolean)
  - `signup_date` (timestamp)
  - `total_llm_calls` (number)
  - `subscription_tier` (free/pro/enterprise)
  - `is_internal` (boolean) - for filtering out team/test accounts
- [ ] Configure cohorts:
  - Heavy users (>100 LLM calls/month)
  - Free users hitting quota
  - Power users (daily active)
  - Internal users (for exclusion from metrics)
- [ ] Create custom dashboards:
  - LLM usage trends (daily/weekly)
  - Cost per user metrics
  - Feature adoption rates

**Track in PostHog**:

- [ ] LLM call frequency per user
- [ ] Average tokens per call (estimate)
- [ ] Most expensive features (which step uses most LLM calls)
- [ ] Conversion: free users → paying users (if monetizing)
- [ ] Session duration per practice mode
- [ ] Drop-off points in user flow

**How to clean PostHog data**:

1. Go to PostHog → Project Settings → Data Management
2. Delete specific events by user ID or date range
3. Or: Create a new PostHog project for production (recommended)
4. Migrate feature flags/dashboards to new project
5. Keep old project for historical reference

**Estimated effort**: 3-4 hours

---

## Nice-to-Have (Post-Launch Improvements)

### 8. Payment Integration

**Priority**: 🔵 Low (unless monetizing immediately)

**Options**:

- Stripe for subscriptions
- Credits-based system (buy LLM credits)
- Usage-based billing (pay per API call)

**Estimated effort**: 1-2 weeks

---

### 9. Background Job Processing

**Priority**: 🔵 Low

**Use case**: Offload expensive LLM calls to background queue

- Prevents timeout on long-running requests
- Better UX with streaming/polling
- Easier to implement retries

**Options**:

- Vercel Cron + Supabase queue
- Inngest (serverless queue)
- BullMQ + Redis

**Estimated effort**: 1 week

---

### 10. LLM Cost Optimization

**Priority**: 🔵 Low (optimize after launch data)

**Strategies**:

- [ ] A/B test prompt length (shorter = cheaper)
- [ ] Use cheaper models for simple validations
- [ ] Batch multiple validations in single call
- [ ] Implement streaming for better perceived performance

**Estimated effort**: Ongoing

---

## Timeline Estimate

**Minimum viable launch** (Critical items only):

- Rate limiting: 2-3 hours
- Client throttling: 1 hour
- Cost monitoring: 1 hour
- **Total**: ~5 hours (1 evening)

**Recommended launch** (Critical + Important):

- Everything above + usage quotas + error handling + PostHog setup + session storage review
- **Total**: ~20 hours (2-3 weekends)

---

## Launch Readiness Checklist

Before sharing publicly:

- [ ] Rate limiting implemented and tested
- [ ] Cost alerts configured in GCP and Vercel
- [ ] PostHog feature flags configured (LLM kill switch)
- [ ] PostHog cohorts and dashboards created
- [ ] Usage tracking events firing in PostHog
- [ ] Session storage strategy implemented (cookies vs. DB)
- [ ] Error handling tested (simulate 429 errors)
- [ ] Load test with 100 concurrent users
- [ ] Daily cost budget set (<$10/day to start)
- [ ] Monitoring dashboard created (PostHog/Vercel)
- [ ] Incident response plan (what if costs spike?)

---

## Monitoring After Launch

**Daily** (first week):

- Check Gemini API costs in GCP Console
- Review PostHog LLM call volume
- Check Sentry for rate limit errors
- Verify no abuse patterns in logs

**Weekly** (first month):

- Analyze cost per user
- Review rate limit effectiveness
- Identify expensive features
- Optimize prompts based on usage

**Monthly**:

- Calculate unit economics (cost per user)
- Decide on monetization strategy
- Plan infrastructure scaling

---

## Emergency Response Plan

**If costs spike unexpectedly**:

1. **Immediate** (< 5 minutes):
   - Disable LLM endpoints via feature flag
   - Show maintenance page for AI features
   - Check Vercel logs for abuse

2. **Short-term** (< 1 hour):
   - Identify abusive users (top 10 by volume)
   - Temporarily block high-usage accounts
   - Reduce rate limits globally (50% reduction)

3. **Long-term** (< 1 day):
   - Implement stricter quotas
   - Add CAPTCHA for suspicious patterns
   - Consider moving to cheaper LLM provider

**Cost kill-switch**: Environment variable to disable all LLM calls

```bash
DISABLE_LLM_FEATURES=true
```

---

## Cost Estimates

**Conservative estimate** (100 active users):

- 50 LLM calls/user/day = 5,000 calls/day
- Gemini 2.0 Flash: ~$0.0001/call (rough estimate)
- **Daily cost**: $0.50 - $2/day
- **Monthly cost**: $15 - $60/month

**Aggressive growth** (1,000 active users):

- **Monthly cost**: $150 - $600/month

**Budget recommendation**: Start with $100/month cap, adjust based on actual usage.

---

## Resources

- [Clerk Rate Limiting Docs](https://clerk.com/docs/references/backend/rate-limiting)
- [Vercel Edge Middleware](https://vercel.com/docs/functions/edge-middleware)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [PostHog Event Tracking](https://posthog.com/docs/getting-started/send-events)
- [Supabase Rate Limiting Pattern](https://supabase.com/docs/guides/realtime/rate-limits)

---

**Last Updated**: 2025-11-16
