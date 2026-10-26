# 1 vs 2 Cue Calls Mode Switch Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add a clean toggle on the main setup screen to allow switching between strictly "1 Call" and "2 Calls" per round (replacing the hardcoded 50% random coin flip in OPEN_REACTIVE), with appropriate work duration and persistence.

**Architecture:** Add `reactiveCueCount: 1 | 2` to `DrillSettings` (and Zustand store `useStore`). In `utils/drillPlan.ts`, respect `reactiveCueCount` when building `OPEN_REACTIVE` rounds so that 1 call yields 1 cue (5s work), while 2 calls yields 2 cues (8s work). In `components/TimerSetup.tsx`, provide a stylish two-segment toggle for "1 Call" and "2 Calls" directly above the action row.

**Tech Stack:** React Native, Expo, TypeScript, Zustand, Node test runner (`node --test`).

---

### Task 1: Add `reactiveCueCount` to types and drill settings normalization

**Files:**

- Modify: `types.ts:37-46`
- Modify: `utils/drillPlan.ts:36-80`
- Test: `utils/drillPlan.test.ts`

**Step 1: Write the failing test**
In `utils/drillPlan.test.ts`, add a test asserting `normalizeDrillSettings` respects `reactiveCueCount` (1 | 2, defaulting to 1).

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL (reactiveCueCount property not normalized / present)

**Step 3: Write minimal implementation**

- In `types.ts`: add `reactiveCueCount: 1 | 2;` to `DrillSettings`.
- In `utils/drillPlan.ts`: update `DEFAULT_DRILL_SETTINGS` with `reactiveCueCount: 1`, clamp/normalize in `normalizeDrillSettings`.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

---

### Task 2: Update `OPEN_REACTIVE` plan generation & work duration

**Files:**

- Modify: `utils/drillPlan.ts:229-238, 345-370`
- Modify: `utils/reactiveSession.ts:18-33`
- Test: `utils/drillPlan.test.ts`

**Step 1: Write the failing test**
In `utils/drillPlan.test.ts`, test that when `drillSettings.reactiveCueCount === 1`, `OPEN_REACTIVE` generates exactly 1 event (and work duration is 5s), and when `reactiveCueCount === 2`, it always generates 2 events (and work duration is 8s), instead of checking `random() >= 0.5`.

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL

**Step 3: Write minimal implementation**

- In `utils/drillPlan.ts`:
  - When `condition === 'OPEN_REACTIVE'`:
    - Check `drillSettings.reactiveCueCount === 1` vs `2`.
    - If 1: return 1 event (`TARGET`).
    - If 2: return 2 events (`TARGET` + `CHANGE`).
- In `utils/reactiveSession.ts`: pass `reactiveCueCount` from timer config/store into `drillSettings`.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

---

### Task 3: Store integration & migrations

**Files:**

- Modify: `store.ts`
- Modify: `utils/storeMigrations.ts`
- Test: `utils/storeMigrations.test.ts`

**Step 1: Write the failing test**
In `utils/storeMigrations.test.ts`, test that state hydration / migration preserves or defaults `reactiveCueCount`.

**Step 2: Run test to verify it fails**
Run: `npm test`

**Step 3: Write minimal implementation**

- Update store migrations (version 19 -> 20) to migrate `drillSettings.reactiveCueCount`.
- Add `setReactiveCueCount: (count: 1 | 2) => void` in `store.ts`.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

---

### Task 4: UI Toggle in `TimerSetup.tsx`

**Files:**

- Modify: `components/TimerSetup.tsx`

**Step 1: Implement UI**

- In `TimerSetup.tsx`:
  - Read `reactiveCueCount` and `setReactiveCueCount` from store.
  - Add segmented control between Rounds input and Start button:
    - [ 1 Call ] [ 2 Calls ]
  - Update subtitle: "React to 1 call each round" vs "React to 2 calls each round".

**Step 2: Verification**

- Run `npm test`
- Run `npm run lint`
- Verify locally in browser/Expo
