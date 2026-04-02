# Interval Cue Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make interval mode announce `Go` immediately, then announce the selected cue after the correct cue-specific delay.

**Architecture:** Keep interval timing logic in `utils/intervalCuePlan.ts` so the existing timer transition and cue scheduler continue to handle announcement timing, pause, and resume without special cases. Add deterministic planner tests by temporarily controlling `Math.random()` in the test file.

**Tech Stack:** TypeScript, Node test runner, existing timer engine and cue planner utilities

---

### Task 1: Add the regression tests

**Files:**

- Modify: `utils/intervalCuePlan.test.ts`
- Test: `utils/intervalCuePlan.test.ts`

- [ ] **Step 1: Write failing tests for interval timing buckets**

```ts
test('interval work phase announces Go and schedules Run at 500ms', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.51;

  try {
    const plan = buildIntervalCuePlan();

    assert.equal(plan.announcement, 'Go');
    assert.equal(plan.currentExercise, 'Run');
    assert.deepEqual(plan.cuePlan, [{ id: 1, label: 'Run', offsetMs: 500 }]);
  } finally {
    Math.random = originalRandom;
  }
});
```

- [ ] **Step 2: Run the test file to verify failure**

Run: `node --test utils/intervalCuePlan.test.ts`
Expected: FAIL because the planner still returns the cue as the immediate announcement and an empty `cuePlan`.

- [ ] **Step 3: Add range tests for the other cue buckets**

```ts
test('interval work phase schedules Left and Right within the lateral bucket', () => {
  // Force cue selection, then force timing selection for the min and max of the bucket.
});

test('interval work phase schedules Come Back within the comeback bucket', () => {
  // Force cue selection, then force timing selection for the min and max of the bucket.
});
```

- [ ] **Step 4: Re-run the test file and confirm the new assertions still fail for the current implementation**

Run: `node --test utils/intervalCuePlan.test.ts`
Expected: FAIL with mismatches on `announcement` and `cuePlan`.

### Task 2: Implement the planner change

**Files:**

- Modify: `utils/intervalCuePlan.ts`
- Test: `utils/intervalCuePlan.test.ts`

- [ ] **Step 1: Add a helper that maps the selected interval cue to its timing bucket**

```ts
const getRandomIntInclusive = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const getIntervalCueOffsetMs = (cue: string) => {
  if (cue === 'Run') return 500;
  if (cue === 'Come Back') return getRandomIntInclusive(2300, 2500);
  return getRandomIntInclusive(1200, 2200);
};
```

- [ ] **Step 2: Return `Go` plus a one-item delayed cue plan**

```ts
export const buildIntervalCuePlan = (): IntervalCuePlan => {
  const cue = pickRandomIntervalCue();

  return {
    announcement: 'Go',
    currentExercise: cue,
    cuePlan: [{ id: 1, label: cue, offsetMs: getIntervalCueOffsetMs(cue) }],
  };
};
```

- [ ] **Step 3: Run the targeted test file to verify it passes**

Run: `node --test utils/intervalCuePlan.test.ts`
Expected: PASS

### Task 3: Verify timer integration

**Files:**

- Modify: none expected
- Test: `utils/intervalCuePlan.test.ts`

- [ ] **Step 1: Confirm no additional timer-engine edits are needed because work-phase transitions already schedule non-empty cue plans**

Reference:

```ts
if (next.phase === TimerPhase.WORK && next.cuePlan.length > 0) {
  startCuePlan(next.cuePlan);
}
```

- [ ] **Step 2: Run related tests as a regression check**

Run: `node --test utils/intervalCuePlan.test.ts utils/saqCuePlan.test.ts`
Expected: PASS
