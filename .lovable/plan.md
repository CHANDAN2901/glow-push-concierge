

## Problem Analysis

Two bugs in the onboarding wizard:

### Bug 1: Buttons "not clickable"
Steps 3 and 4 have action buttons ("Open Timeline Editor", "Edit questions", "Edit policy") that call `onClose()` to close the wizard and open the respective editor. When the user finishes with the editor and returns, the wizard does **not** reopen because the `useEffect` that triggers `setShowOnboarding(true)` only runs when `[user, profileFetched, isNewSignupFlow]` change — none of which change when returning from an editor. The user perceives this as buttons "not working" because the wizard vanishes permanently without completing.

### Bug 2: Disappears on refresh
The X (close) button on the wizard permanently dismisses onboarding by setting both `localStorage('gp-onboarding-done')` and `onboarding_checklist_dismissed: true` in the database. If a user clicks X at any step (even accidentally), the wizard is gone forever — even on refresh. The user can never resume where they left off.

---

## Plan

### 1. Persist current onboarding step in the database
- Add a column or use the existing `onboarding_checklist_state` JSON field in `profiles` to store `{ currentStep: number, completed: boolean }`.
- On each step transition, save the current step so it survives refresh and cross-device login.

### 2. Fix wizard re-opening after editor actions
- When steps 3/4 close the wizard to open an editor, store a flag (e.g. `sessionStorage('gp-onboarding-returning')`) so the dashboard knows to reopen the wizard when the editor closes.
- Alternatively, track `showOnboarding` more explicitly: instead of relying on a one-shot `useEffect`, add a callback from the editor-close handlers that re-triggers the wizard.

### 3. Change X button behavior — skip vs. dismiss
- The X button should **not** permanently dismiss onboarding. Instead, it should just hide the wizard for the current session.
- Add an explicit "Skip all setup" link at the bottom for permanent dismissal.
- This way, on next login/refresh, users who haven't completed onboarding will see the wizard again at the step they left off.

### 4. Resume from saved step on mount
- When the wizard opens, read the saved step from `onboarding_checklist_state` and set `step` accordingly instead of always starting at 0.
- On refresh, the dashboard checks `onboarding_checklist_dismissed` — if false and `gp-onboarding-done` is not set, show the wizard at the saved step.

### Files to modify
- **`src/components/OnboardingWizard.tsx`** — load/save current step, change X behavior, resume from saved step
- **`src/pages/ArtistDashboard.tsx`** — fix the useEffect to allow wizard re-opening after editor actions, remove permanent dismissal from localStorage on X

### Technical details
- Use existing `onboarding_checklist_state` JSON column (already in DB) to store `{ step: number }`.
- On wizard open: fetch saved step from profile, initialize `step` state.
- On step change: update `onboarding_checklist_state` in DB.
- X button: only calls `onClose()` without setting `gp-onboarding-done` or `onboarding_checklist_dismissed`.
- "Skip all" link: keeps current permanent dismissal behavior.
- Dashboard useEffect: use a re-trigger mechanism (e.g., depend on `showOnboarding` being false + onboarding not done) or use a callback pattern.

