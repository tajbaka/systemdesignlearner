# 📋 Practice Mode Improvements TODO

> User feedback and improvement tasks for the practice flow experience
>
> **Design Principle**: Mobile-first design for all components

---

## 📊 Implementation Status Summary

**Overall Progress: ~65% Complete (9/14 core items)**

### ✅ Fully Implemented (9 items)

1. Pre-submission validation for requirements (functional reqs) - `FunctionalRequirementsStep.tsx:55-86`
2. Next button behavior (single arrow, disabled states) - `PracticeFooter.tsx:85-112`
3. Step progression control (locking, visual states) - `PracticeStepper.tsx:73-78, 126-207`
4. API Definition cleanup (example text removed, slash auto-strip) - `ApiDefinitionStep.tsx:108-116`
5. Hamburger menu + sidebar (mobile & desktop) - `PracticeSidebar.tsx:15-232`
6. Sandbox card redesign (SystemDesignNode clean) - `SystemDesignNode.tsx:216-246`
7. Auth modal simplification (no skip button, no clutter) - `AuthGateStep.tsx:26-42`
8. Forward slash auto-removal from endpoints - `ApiDefinitionStep.tsx:108-116`
9. Step locking with clear visual indicators - `PracticeStepper.tsx`

### ⚠️ Partially Done (3 items)

1. **NFR validation** - Shows info box but doesn't parse text for numbers - `NonFunctionalRequirementsStep.tsx:81-87`
2. **API validation** - Works but uses error box instead of tooltip - `ApiDefinitionStep.tsx:155-167`
3. **Performance metrics removal** - `SystemDesignNode.tsx` clean, but `NodeCard.tsx:118` still has metrics

### ❌ Not Started (2 major items)

1. **Tooltip-based error messages** - Tooltip component exists but not integrated
2. **Interview-style hints system** - Full Socratic method guidance not implemented

---

## 🎯 High Priority

### Validation & Error Handling

- [x] **Pre-submission validation for requirements advice** ✅ DONE
  - Move advice/recommendation box validation to frontend
  - Highlight the requirements box in red when empty/invalid
  - Show frontend error message without hitting the API
  - Prevent submission until requirements are properly filled
  - **Implementation**: Client-side validation before API call
  - **Location**: `FunctionalRequirementsStep.tsx:55-86`

- [~] **Non-functional requirements validation** ⚠️ PARTIAL
  - Add warning/notice when numeric values are not provided for NFRs
  - **ALLOW** progression even without quantitative metrics (numbers optional)
  - Show a gentle reminder that quantitative metrics are preferred (e.g., "Consider adding specific numbers like '100ms' for latency")
  - Don't block users, but educate them on best practices
  - **Status**: Shows blue info box but doesn't parse text for numeric patterns
  - **Location**: `NonFunctionalRequirementsStep.tsx:81-87`

- [~] **API endpoint validation** ⚠️ PARTIAL
  - Handle empty endpoint submissions gracefully
  - Highlight API definition box in red when empty/incomplete
  - Prevent moving forward without at least one valid API endpoint defined
  - Use tooltip-based error (not error box) to indicate what's missing
  - **Status**: Validation works but uses error box instead of tooltip
  - **Location**: `ApiDefinitionStep.tsx:155-167`

### Navigation & Flow Control

- [x] **Fix "Next" button behavior** ✅ DONE
  - Ensure "Next" button (arrow) works consistently when a step is completed
  - Remove any redundant "Continue" button if present
  - **Single, clear CTA**: Keep only the current arrow button, don't add new buttons
  - Button should be disabled/locked until step requirements are met
  - **Status**: Single arrow button, disables when invalid, shows spinner
  - **Location**: `PracticeFooter.tsx:85-112`

- [x] **Step progression control** ✅ DONE
  - Lock steps until prerequisites are met (disable clicking ahead)
  - Clear visual indication: completed (green check) vs. locked (gray/disabled)
  - User cannot skip ahead without completing current step
  - **Status**: Fully implemented with visual states (blue=current, green=complete, gray=locked)
  - **Location**: `PracticeStepper.tsx:73-78, 126-207`

## 💡 User Experience Improvements

### Interview-Style Guidance System

- [ ] **Interactive AI hints - Don't Give Direct Answers**
  - **Philosophy**: Mimic real interview experience with Socratic method
  - Don't provide direct answers to design challenges
  - Nudge users toward solutions with guiding questions instead of solutions
  - Present **one hint/question at a time** (not multiple at once)
  - **Center the guidance on screen** for focus (modal or centered card)
  - **Progressive hint system**:
    1. First hint: Very subtle, high-level question
    2. Second hint: More specific, pointing to area to explore
    3. Third hint: Direct question about specific concept
    4. User must actively request next hint (don't auto-show)

### Content & Text Refinement

- [x] **API Definition Step cleanup** ✅ DONE
  - **Remove this entire example text**:
    > "Request: { url, customSlug? } → Response: { slug, shortUrl, expiresAt? }. Include validation and slug collision handling. Redirect 302 to the long URL. Mention cache behavior and how to handle expired/unknown slugs."
  - Keep interface clean and focused on the task itself
  - **Remove forward slash prefix** from endpoint examples:
    - Remove leading `/` from `/{shortId}` → show as `{shortId}`
    - Remove leading `/` from `/{slug}` → show as `{slug}`
    - **Reason**: The forward slash is already hardcoded and non-editable in the UI
  - **Status**: Example text removed, forward slashes auto-stripped
  - **Location**: `ApiDefinitionStep.tsx:108-116`

- [~] **Remove performance metrics labels in sandbox** ⚠️ NEEDS VERIFICATION
  - Remove ALL instances of "ms" (milliseconds) labels and their numeric values
  - Remove ALL instances of "rps" (requests per second) labels and their numeric values
  - Keep the component performance info internal, don't clutter UI with these details
  - **File location**: Check sandbox component cards (NodeCard or similar)
  - **Status**: `SystemDesignNode.tsx` is clean, but `NodeCard.tsx:118` still has metrics
  - **TODO**: Verify which component is used in practice sandbox

## 🎨 UI/UX Polish (Mobile-First)

### Visual Improvements

- [x] **Redesign sandbox component cards** ✅ DONE (in SystemDesignNode.tsx)
  - **Larger icons**: Increase symbol/icon size for better visibility at standard zoom
  - **Layout change**:
    - Icon: Vertically centered, left-aligned
    - Component name: Right side of icon, vertically centered
  - **Remove ALL of this content**:
    - Performance text: `10ms · 20000 rps`
    - Replica controls: The `−` / `1` / `+` buttons
    - The entire bottom metadata row
  - **Result**: Clean card with just icon + name
  - **File**: `SystemDesignNode.tsx:216-246` ✅ (but NodeCard.tsx:118 still needs cleanup)

- [ ] **Error messaging with tooltips** ❌ NOT DONE
  - Replace error boxes with tooltip-based error messages
  - Less intrusive, cleaner interface
  - Contextual errors appear near the relevant input field
  - Dismiss on click outside or after timeout
  - **Mobile consideration**: Tooltips must work on touch (not just hover)
  - **Status**: Tooltip component exists but not integrated into validation steps
  - **Affects**: FunctionalRequirementsStep, NonFunctionalRequirementsStep, ApiDefinitionStep

### Navigation Redesign - Mobile-First

- [x] **🍔 Hamburger menu + sidebar for Practice mode** ✅ DONE
  - **Scope**: Apply ONLY to `/practice` page and onwards (not homepage)
  - **Mobile-first design**: Primary experience optimized for mobile
  - **Components to build**:
    1. **Hamburger icon button**: Fixed position (top-left or top-right) ✅
    2. **Sliding sidebar**: Overlay that slides in from left/right ✅
    3. **Sidebar content**: Current navbar items (logo, links, user menu) ✅
    4. **Backdrop**: Dark overlay when sidebar is open (click to close) ✅
  - **Behavior**:
    - Default: Hamburger menu visible in practice mode ✅
    - Sidebar hidden by default, opens on hamburger click ✅
    - Smooth slide-in/out animation ✅
    - Close on: backdrop click, close button, or navigation ✅
  - **Desktop**: Consider keeping sidebar always visible on large screens (> 1024px) ✅
  - **Accessibility**: ESC key closes sidebar, focus trap when open ✅
  - **Status**: Fully implemented with mobile hamburger and expanding desktop sidebar
  - **Location**: `PracticeSidebar.tsx:15-232`

- [ ] **Simplify/remove top step indicator** ❌ NOT EVALUATED YET
  - **Evaluate**: Do users need the full step-through display at top?
  - **Test**: Try showing only current step name (not full stepper)
  - **Mobile priority**: Top stepper takes valuable vertical space on mobile
  - **Alternative**: Move step indicator to sidebar or bottom sheet

## 🔐 Authentication Flow

### Sign In/Up UI Simplification

- [x] **Simplify auth modal for first-time users** ✅ MOSTLY DONE
  - **What to remove**:
    1. ❌ "Skip for now" button/link ✅ NOT PRESENT
    2. ❌ Top explanatory text above the sign-in card ✅ REMOVED
    3. ❌ "Don't have an account? Sign up" footer text in Clerk component ✅ REMOVED
    4. ❌ The entire **outer wrapper container** (the one with the blue badge and celebration message) ✅ CLEAN
  - **What to keep**:
    - ✅ Just the inner Clerk component (the actual sign-in form) ✅
    - ✅ Simple congratulations message if needed (currently shows "Congrats! 🎉")
  - **Simplified structure**:

    ```
    Before:
    [Outer container with "Save progress" badge → "Sign in to see results! 🎉" → description → [Clerk SignIn component]]

    After:
    [Clerk SignIn component] + optional simple "Congrats!" text ✅
    ```

  - **Goal**: Reduce visual clutter, make auth feel lighter and faster
  - **File**: `AuthGateStep.tsx:26-42`
  - **Status**: Modal is clean, could optionally remove "Congrats! 🎉" for even simpler look

## 📊 Testing Requirements

### Functional Testing

- [ ] Test all validation changes with:
  - Empty inputs (should block progression)
  - Partially complete inputs (should show specific errors)
  - Complete valid inputs (should allow progression)

### UX Testing

- [ ] User test the interview-style hint system for effectiveness
  - Do users feel guided vs. given answers?
  - Is one hint at a time better than showing multiple?

### Responsive Testing (Mobile-First Priority)

- [ ] Test hamburger menu + sidebar on:
  - Mobile (320px - 768px) ← **Primary focus**
  - Tablet (768px - 1024px)
  - Desktop (1024px+)
- [ ] Validate error tooltip placement and clarity on touch devices
- [ ] Ensure all interactions work with touch (not just hover)

### A/B Testing Candidates

- [ ] Hamburger menu position (left vs. right)
- [ ] Top step display (full stepper vs. current step only vs. hidden)
- [ ] Hint presentation (modal vs. inline vs. sidebar)

## 🚀 Future Considerations

- [ ] Progress persistence (save partial progress to localStorage or DB)
- [ ] Voice feedback for hints (accessibility + hands-free practice)
- [ ] Keyboard shortcuts for power users (Vim-style navigation?)
- [ ] Gamification elements:
  - Daily streak tracking
  - Achievement badges (first pass, perfect score, etc.)
  - Leaderboard for fastest completion times
- [ ] Collaborative practice mode (pair programming style)

---

## 📝 Implementation Notes

### Priority Levels

1. **P0 (Critical)**: Validation, navigation fixes
2. **P1 (High)**: Mobile-first hamburger menu, tooltip errors
3. **P2 (Medium)**: Interview-style hints, content cleanup
4. **P3 (Low)**: Auth simplification, visual polish

### Technical Considerations

- **Mobile-first**: Start with mobile layout, enhance for desktop
- **Performance**: Lazy load sidebar content, use CSS transforms for animations
- **Accessibility**: WCAG 2.1 AA compliance (keyboard nav, focus management, ARIA labels)
- **Browser support**: Last 2 versions of Chrome, Safari, Firefox, Edge

### File References

When implementing, focus on these likely files:

- Validation: `*RequirementsStep.tsx`, `ApiDefinitionStep.tsx`
- Navigation: `PracticeStepper.tsx`, `PracticeFlow.tsx`
- Hamburger menu: Create new `HamburgerMenu.tsx` + `Sidebar.tsx` components
- Auth: `AuthModal.tsx`, `AuthGateStep.tsx`
- Sandbox cards: `SystemDesignNode.tsx`, `NodeCard.tsx`

---

**Last Updated:** 2025-01-06
**Design Principle:** Mobile-first, accessible, interview-realistic experience

mobile:
full text boxes instead of box in box for the first 2 steps in the practice and for the step 3
