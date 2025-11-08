# System Design Sandbox - Improvement TODO List
*Based on Arian's review from November 8, 2025*

---

## 🎨 UI/UX Improvements

### Form Validation & States
- [ ] **Fix initial error state display** (Priority: High)
  - Don't show red error borders on initial page visit
  - Keep neutral state (gray) until user attempts to submit
  - Only show red validation errors after submission attempt or validation failure
  - Apply to all text input fields across the app
  - Reference: Screenshot 1 (12.51.58)

### Voice Recorder
- [ ] **Improve voice recorder UX** (Priority: Medium)
  - Current: Clicking just shows loading state, unclear how to start/stop
  - Solution: Copy ChatGPT's voice recorder interaction pattern
  - Make it clear when recording is active vs inactive
  - Reference: Lines 5-7

### Navigation & Interactions
- [ ] **Add Enter key support** (Priority: Medium)
  - Enable 'Enter' key to submit/continue (act as clicking the arrow button)
  - Reference: Screenshot 5 (13.10.33)

- [ ] **Improve modal close behavior** (Priority: Low)
  - Current: Only clicking "Revise" closes the feedback modal
  - Add: Clicking outside the modal should also close it
  - Reference: Screenshot 4 (13.01.31)

---

## 🎯 Feedback System - CRITICAL IMPROVEMENTS

### Feedback Quality (HIGHEST PRIORITY)
- [ ] **Implement focused, iterative feedback system** (Priority: CRITICAL)
  - **Problem**: Feedback is too generic, mentions all topics at once (performance, scale, availability, reliability)
  - **Solution**: Focus on ONE specific topic at a time with actionable questions
  - **Examples of specific questions to ask**:
    - "How many users need to use the redirection part per day?"
    - "How many will use the URL creation portion?"
    - "How much throughput do we need to handle?"
  - **Flow**:
    1. Show generic checklist (as is)
    2. Give specific, insightful advice about ONE topic
    3. When user addresses it properly → add to green checklist
    4. Move specific advice to next lacking topic
    5. Repeat until comprehensive
  - **Quality over optimization**: Don't worry about LLM calls - use 5 calls if needed for quality
  - Reference: Screenshot 7 (13.14.09), Lines 14-19

- [ ] **Fix topic recognition** (Priority: High)
  - System didn't recognize that availability was already discussed
  - Improve parsing/understanding of user's existing answers
  - Reference: Screenshot 7 (13.14.09)

- [ ] **Provide actionable advice even at passing scores** (Priority: High)
  - Example: At 80% score, still show how to get to 100%
  - At 67% API section score, unclear what's missing
  - Every score < 100% should have clear next steps
  - Reference: Screenshot 2 (12.57.51), Screenshot 8 (13.20.11), Line 21

- [ ] **Clarify what score represents** (Priority: Medium)
  - Make it clear if score is for the current section or overall
  - Reference: Line 20

### Visual Feedback Indicators
- [ ] **Add border highlighting for multi-box sections** (Priority: High)
  - **API section and similar**: When multiple boxes/endpoints exist
  - Red border: The specific box that needs improvement (what advice is about)
  - Green border: Boxes that are complete
  - Neutral border: Other boxes
  - Apply to all sections with multiple input areas
  - This helps user know exactly what to fix
  - Reference: Line 21-22

---

## 🏗️ Component & Design Stage

### Component Selection
- [ ] **Implement problem-specific component filtering** (Priority: High)
  - Don't show all components for every problem
  - Show general components always (Client, Service, DB, Cache, Load Balancer)
  - Add problem-specific components based on scenario needs
  - **Remove rarely-used/overly-technical items from default list**:
    - Telemetry (every app needs it, doesn't need explicit modeling)
    - Edge Function (too technical for most scenarios)
  - This gives hints about what should be used without overwhelming
  - Reference: Screenshot 10 (14.32.44), Lines 27-28

### Initial State
- [ ] **Fix auto-connection behavior** (Priority: Medium)
  - User expects to see ONLY client initially
  - Check if API Gateway is being auto-connected
  - User should build from scratch
  - Reference: Screenshot 9 (14.27.16), Line 26

### Component Customization
- [ ] **Allow renaming components** (Priority: High)
  - Users should be able to rename generic components to be more specific
  - Examples:
    - "Service" → "URL Shortening Service"
    - "Service" → "Background Service"
    - "Cache" → "LFU Cache"
    - "DB" → "Available URLs"
    - "DB" → "Total URL Bucket"
  - More specific names should boost score (closer to actual solution)
  - Reference: Screenshot 15 (14.45.43), Lines 34-36

### Flow Representation
- [ ] **Improve cache miss → DB flow representation** (Priority: Medium)
  - Make it clearer how to represent conditional flows (cache miss, then DB)
  - Consider visual affordances or guidance
  - Reference: Screenshot 11 (14.34.07), Line 28

---

## ✅ Solution Validation

### Flexible Architecture Matching
- [ ] **Support multiple valid component orderings** (Priority: CRITICAL)
  - **Problem**: Currently too tightly coupled to one specific tree structure
  - **Valid variations to support**:
    - Client → Load Balancer → API Gateway → Service
    - Client → API Gateway → Load Balancer → Service
    - Load Balancer → API Gateway → Load Balancer → Service
  - API Gateway shouldn't always be required (it's boilerplate for many problems)
  - Reference: Screenshot 12-14 (14.34.52, 14.35.48, 14.39.55), Lines 29-41

- [ ] **Accept semantically equivalent architectures** (Priority: High)
  - Service → DB with separate Service → Cache should equal Service → Cache → DB
  - Both represent the same semantic flow (just visual differences)
  - Focus on logical correctness, not exact drawing style
  - Reference: Lines 41-42

- [ ] **Review necessity of API Gateway requirement** (Priority: High)
  - Often implemented at code level (Express router, etc.)
  - Making it explicit might distract from problem-specific solutions
  - Users should focus on unique aspects (hashing algorithm, background services, caching strategy)
  - Not on boilerplate components that apply to all problems
  - Reference: Lines 31-33

---

## 🎓 Content & Guidance

### Tutorial Links
- [ ] **Add tutorial links to "Need ideas?" footers** (Priority: Low)
  - Already implemented footers - good!
  - Link to our own tutorials or partner tutorials
  - Reference: Screenshot 3 (13.00.04), Line 11

---

## 🐛 Bug Fixes

### Completion Flow
- [ ] **Fix problem completion state** (Priority: High)
  - Problem should be marked as "finished" after completion
  - First completion redirects to homepage instead of showing score
  - Should show score immediately after completion
  - Only redirect after user has seen their score
  - Reference: Screenshot 16 (14.55.29), Lines 43-46

### Progress Indication
- [ ] **Make path from 80% → 100% clear** (Priority: Medium)
  - User got stuck at 80%, didn't know how to reach 100%
  - Provide clearer guidance on what's missing
  - Reference: Screenshot 2 (12.57.51), Lines 8-10

---

## 📝 Content Review

### Improvement Feedback Messages
- [ ] **Review and improve "Areas for Improvement" messages** (Priority: Medium)
  - Check if they're specific enough
  - Example feedback shown:
    - "Endpoint api/v1/urls needs better documentation"
    - "Implement cache-aside pattern: Service → Cache → DB for fast redirects"
    - "Consider optimizing the redirect path to reduce latency"
  - Validate these against actual user solutions
  - Reference: Screenshot 17 (14.58.17), Line 47

---

## 📊 Overall Strategy Notes

**Arian's Vision**:
> "I think our main bread and butter is how to provide valuable feedback to the user... this way it inches the user closer and closer to the right answer, and it's a real practice tool where someone with limited time researching these ideas can simply get better by just trying it out."

**Key Principles**:
1. Quality feedback > LLM optimization (for now)
2. Iterative, focused guidance (one topic at a time)
3. Specific, actionable questions
4. Visual indicators for what to fix
5. Flexibility in accepting valid solutions
6. Focus on problem-specific insights, not boilerplate

---

## 📈 Next Steps for Content Creation

From Arian (Line 48):
- Create AI-generated content to drive traffic
- Once more polished, capture GIFs/videos from actual tool
- Test performance of actual tool footage vs generic content
