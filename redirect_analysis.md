# Redirect Analysis (Sandbox → Score)

This document traces every piece of logic that influences whether the user remains on Step 4 (sandbox) or advances to Step 5 (score) in the URL-shortener practice flow.

---

## 1. Practice steps and persistence

- **Declared steps** – `lib/practice/types.ts:66-119` defines `PracticeStep` and the ordered `PRACTICE_STEPS = ["functional","nonFunctional","api","sandbox","score"]`. The current step is derived from the first falsey entry in `state.completed`.
- **Storage** – `lib/practice/storage.ts` persists the entire `PracticeState` into `localStorage` (`sds-practice-url-shortener`). `PracticeSessionProvider` keeps a 400 ms debounced autosave _and_ now registers `beforeunload/pagehide` listeners to flush the latest state immediately before the browser navigates away, which is what keeps the Clerk redirect from discarding freshly toggled flags.

## 2. Session provider (state bootstrap & gating)

`components/practice/session/PracticeSessionProvider.tsx`

- **mergeState** (`lines 132-233`): loads saved state, ensures modern shape, normalises auth sub-tree, etc.
- **deriveInitialStep** (`236-243`): iterates through `PRACTICE_STEPS` and returns the first incomplete step. This is what puts users back on Step 4 after a reload if `completed.sandbox === false`.
- **ensureAuthProgressConsistency** (`245-261`): whenever persisted state says the user is _not_ authenticated, both `completed.sandbox` and `completed.score` are forced back to `false`, regardless of their stored value. This guarantees “score” never stays complete if auth is lost.
- **State updates** – `markStep` (`410-419`) toggles entries inside `state.completed`; `setAuth` (`400-408`) updates `state.auth`. Both funnel through `setStateWithTimestamp`, which then triggers the save-to-localStorage effect when not in read-only mode.

## 3. Step completion helpers

`lib/practice/step-configs.ts`

- Each entry supplies `nextDisabled` + optional `onNext`.
- `completeStep` (`lines 14-19`): shared helper invoked from every `onNext`. It marks a step as complete via `session.markStep` and fires an analytics event. For sandbox, `onNext` just calls `completeStep(session,"sandbox")`.

## 4. Navigation & “Continue” button

`hooks/usePracticeNavigation.ts`

- **`handleNext`** (`118-420`): orchestrates scoring & validation. After sandbox scoring passes, it calls `proceedToNext`.
- **`proceedToNext`** (`87-116`):
  - Grabs the current step’s config and defines `advance()` which runs `config.onNext` and `session.goNext()`.
  - Special-cases `session.currentStep === "sandbox"`:
    - If `state.auth.isAuthed` is already `true`, it calls `advance()` (so `completeStep` runs and `currentStep` increments).
    - Else if the Clerk session reports `isSignedIn === true`, it sets `state.auth.isAuthed = true` and calls `advance()`.
    - Otherwise it clears scoring feedback and flips `showAuthModal` to open the Clerk modal. **No `advance()` call happens yet**, so `completed.sandbox` remains `false`.
- **`handleAuthModalAuthenticated`** (`432-441`):
  - Called by the modal after Clerk reports success.
  - Sets `auth.isAuthed = true`, closes the modal, then manually runs the current step’s `onNext` followed by `session.goNext()`. (This was recently patched to mirror the `advance()` behavior inside `proceedToNext`.)

## 5. Auth modal and Step 5 gate

`components/practice/AuthModal.tsx`

- Renders `<SignIn>` from Clerk with `forceRedirectUrl` / `fallbackRedirectUrl` set to `window.location.href`. After sign-in, Clerk hard-refreshes the same practice URL, re-triggering the provider bootstrap logic in §2.
- On every render, if `isSignedIn && isOpen`, it fires `onAuthenticated` (the hook callback above).

`components/practice/steps/AuthGateStep.tsx`

- This is the UI for Step 5 (“Save progress”). `useEffect` observes Clerk’s session; once `isSignedIn && !isAuthed`, it marks `state.auth.isAuthed = true` and tracks completion.
- Provides a “Skip” button. Skipping sets `state.auth.skipped = true` but leaves `isAuthed = false`, which means §2 will still demote the user back to sandbox after a reload.

## 6. PracticeFlow side effects (extra redirects)

`components/practice/PracticeFlow.tsx`

- **Score auto-completion** (`lines 97-102`): when on the `score` step and either `state.auth.isAuthed` or Clerk says `isSignedIn`, it marks the score step complete.
- **Auth guard effect** (`103-134`):
  - Runs whenever auth status, completion flags, or `currentStep` change.
  - If Clerk reports a signed-in user but `state.auth.isAuthed` is still false (e.g., after a redirect), it now immediately flips the flag to true to keep the flow aligned with Clerk’s session.
  - If the user signs out (`!isSignedIn && state.auth.isAuthed`), it resets the flag to false and returns early.
  - While `state.auth.isAuthed` is false, it clears both `completed.score` and `completed.sandbox` so persistence never claims they passed without auth, and it forces `setStep("sandbox")` if the UI somehow reached Step 5.

## 7. Putting it all together (why the redirect happens)

1. User clears scoring on sandbox and hits “Continue”.
2. `proceedToNext` sees `auth.isAuthed === false`, so it opens the Clerk modal without marking the step complete.
3. User signs in; Clerk redirects back to `/practice/url-shortener`.
4. During that redirect, the in-memory React state is destroyed. On the fresh load:
   - `PracticeSessionProvider` calls `loadPractice`. The persisted state still has `completed.sandbox === false` because `onNext` never ran before the hard refresh.
   - `ensureAuthProgressConsistency` also forces `completed.sandbox = false` if `auth.isAuthed` is falsy inside the saved blob (which it is).
   - `deriveInitialStep` picks `sandbox` as the first incomplete step, so the experience restarts on Step 4.
5. Separately, the `PracticeFlow` auth guard effect notices `currentStep === "score"` while auth is missing and pushes the user back to sandbox even if manual navigation reached Step 5 before state finished hydrating.

## 8. Surfaces to double-check when fixing

1. **Timing of `completeStep("sandbox")`** – currently it only runs when we successfully call `advance()` (authed) or inside `handleAuthModalAuthenticated`. If Clerk refreshes the page before that state has a chance to persist, the next load won’t see the completion flag.
2. **Persisting `auth.isAuthed`** – `setAuth` writes to state, but a refresh within the 400 ms debounce window can drop that change. Consider flushing immediately upon auth transitions or using `useEffect` to call `savePractice` synchronously before redirecting.
3. **`ensureAuthProgressConsistency` + PracticeFlow guard** – both reset sandbox/score when `auth.isAuthed` is false. If Clerk reports `isSignedIn` but the saved blob still has `auth.isAuthed = false`, the guard still rewinds progress until `setAuth` runs again on the client. This mismatch can cause a visible flicker/redirect even when the user is technically signed in.

Reviewing every area above should make it clear why the flow currently loops on Step 4 and where a durable fix can be applied (e.g., mark sandbox complete before opening the modal, or persist auth/completion before Clerk’s redirect fires).
