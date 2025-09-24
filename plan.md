# Practice Page Implementation Plan

## Overview

Implement a comprehensive practice system for URL shortener design problems with guided steps, localStorage persistence, and sandbox integration.

## Current Status

✅ **COMPLETED COMPONENTS:**

- Basic practice page with problem table (`/practice`)
- Guided stepper interface (`/practice/[slug]`)
- All four step components:
  - `ReqForm` - Functional/non-functional requirements
  - `HighLevelPresets` - Architecture selection with diagrams
  - `LowLevelEditor` - Schema/API/capacity planning
  - `ReviewPanel` - Markdown brief generation
- Data models and types (`lib/practice/types.ts`)
- Default presets and configurations (`lib/practice/defaults.ts`)
- Brief markdown generation (`lib/practice/brief.ts`)
- LocalStorage persistence (`lib/practice/storage.ts`)
- Design encoding for sandbox handoff (`lib/practice/encoder.ts`)
- Basic analytics tracking integration
- Mobile-first responsive design
- Step locking/unlocking logic

## Missing Features to Implement

### 1. Share Link Functionality

**Goal:** Allow read-only sharing of practice briefs via URL parameter

**Implementation:**

- Add `?s=<encoded-state>` parameter to `/practice/[slug]`
- Decode shared state and render in read-only mode
- Disable all form inputs when viewing shared state
- Update page title/description for shared links

**Files to modify:**

- `app/practice/[slug]/page.tsx` - Add searchParams handling
- `components/practice/PracticeFlow.tsx` - Add read-only mode
- Update all form components to accept `readOnly` prop

### 2. Scoring & Evaluation System

**Goal:** Provide pass/fail feedback with hints after sandbox validation

**Requirements:**

- Score calculation: SLO pass (latency + RPS) 60% + checklist 30% + cost sanity 10%
- Hint system for failures
- Integration with existing evaluation utilities

**Implementation:**

- Create `lib/practice/scoring.ts` with evaluation logic
- Import and use existing `lib/evaluate.ts` and `lib/scoring.ts`
- Add scoring display to ReviewPanel
- Track scoring events in analytics

### 3. Enhanced Analytics Tracking

**Goal:** Track detailed user interactions for product insights

**Events to add:**

- `practice_problem_selected` - When user clicks "Start"
- `practice_step_viewed` - Track step navigation
- `practice_requirement_changed` - Track requirement modifications
- `practice_preset_selected` - Track architecture choices
- `practice_schema_modified` - Track schema changes
- `practice_api_modified` - Track API modifications
- `practice_capacity_changed` - Track capacity assumptions
- `practice_shared` - Track share link usage

### 4. Mobile Optimizations

**Goal:** Improve touch interactions and offline experience

**Improvements:**

- Increase tap target sizes (minimum 44px)
- Add haptic feedback for selections
- Improve drag-and-drop alternatives for mobile
- Add "Continue on desktop" CTA for complex interactions
- Enhance offline localStorage sync

### 5. API Linting Integration

**Goal:** Add real-time validation feedback for APIs

**Implementation:**

- Import existing `lib/apiLint.ts`
- Add linting feedback to LowLevelEditor API table
- Show validation errors/warnings inline
- Prevent progression with critical API issues

### 6. Accessibility Enhancements

**Goal:** Ensure WCAG compliance

**Improvements:**

- Add proper ARIA labels to all form elements
- Implement keyboard navigation for stepper
- Add screen reader announcements for state changes
- Ensure sufficient color contrast
- Add reduced motion support

### 7. Content Expansion

**Goal:** Add more practice problems beyond URL shortener

**Future problems to add:**

- Rate limiter service
- Distributed cache
- Message queue system
- Load balancer
- CDN implementation

## Implementation Priority

### Phase 1 (Immediate) - Core Completion

1. **Share Link Functionality** - High user value for collaboration
2. **Scoring System** - Essential for learning feedback
3. **API Linting** - Improves design quality

### Phase 2 (Next Sprint) - Polish & Analytics

4. **Enhanced Analytics** - Data-driven improvements
5. **Mobile Optimizations** - Better user experience
6. **Accessibility** - Compliance and usability

### Phase 3 (Future) - Expansion

7. **Content Expansion** - More practice problems

## Technical Integration Points

### With Existing Systems

- **Scenarios**: Use `SCENARIOS["url-shortener"]` for validation
- **Evaluator**: Import `lib/evaluate.ts` for design checking
- **API Lint**: Import `lib/apiLint.ts` for API validation
- **Share Links**: Use existing `lib/shareLink.ts` for encoding
- **Analytics**: Extend `lib/analytics.ts` for practice events

### Database/Backend (Future)

- **Supabase Integration**: For cross-device persistence
- **User Accounts**: For progress tracking
- **Social Features**: Comments, ratings, comparisons

## Success Metrics

- **Engagement**: Time spent in practice mode
- **Completion**: % of users finishing all steps
- **Sandbox Usage**: % of briefs tested in sandbox
- **Share Usage**: Social sharing adoption
- **Learning**: Score improvements over time

## Testing Strategy

- **Unit Tests**: Component behavior and data transformations
- **Integration Tests**: End-to-end practice flow
- **Accessibility Tests**: Screen reader and keyboard navigation
- **Performance Tests**: Bundle size and runtime performance
- **Mobile Tests**: Touch interactions and responsive design

## Rollout Plan

1. **Alpha**: Internal testing of share links and scoring
2. **Beta**: Limited user group with analytics monitoring
3. **GA**: Full release with A/B testing for engagement
4. **Iteration**: Data-driven improvements based on usage patterns
