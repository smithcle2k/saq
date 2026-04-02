# Interval Cue Timing Design

## Goal

Fix interval mode so the work phase says `Go` immediately, then announces the randomly selected movement cue after the correct delay bucket instead of speaking the movement cue right away.

## Current Problem

Interval mode currently transitions into work by returning the selected cue as the phase announcement and an empty `cuePlan`. The timer engine therefore speaks the movement cue immediately on work start and has no delayed cue left to schedule.

## Intended Behavior

- Entering any interval work phase announces `Go` immediately.
- A single delayed interval cue is scheduled for that round.
- The delayed cue uses these timing rules relative to work start:
- `Run`: exactly 500ms
- `Left` or `Right`: random value from 1200ms to 2200ms inclusive
- `Come Back`: random value from 2300ms to 2500ms inclusive
- `currentExercise` should still reflect the selected cue for the round.
- Pause and resume should preserve the remaining time until the delayed cue because the existing scheduler already supports elapsed-time rescheduling.

## Design

### Cue Planning

`buildIntervalCuePlan()` will:

- pick one random interval cue
- return `announcement: 'Go'`
- return `currentExercise` as the selected cue
- return a single-item `cuePlan` containing the selected cue and its computed `offsetMs`

The cue item will continue to use the existing `IntervalCue` shape so no new timer-engine path is needed.

### Timing Selection

Add a small helper in the interval cue planner that maps cue labels to their offset range:

- `Run` -> fixed 500ms
- `Left` and `Right` -> random integer in `[1200, 2200]`
- `Come Back` -> random integer in `[2300, 2500]`

### Timer Flow

No special-case hook logic is required.

The existing timer transition flow already:

- speaks the transition `announcement`
- starts cue scheduling when `cuePlan.length > 0`
- pauses and resumes scheduled cues using elapsed schedule time

By returning a real interval `cuePlan`, interval mode will automatically use the same scheduling path already used for delayed SAQ cues.

## Testing

Add or update interval planner tests to verify:

- work announcement is `Go`
- `currentExercise` stays aligned with the selected cue
- `Run` creates a single cue at 500ms
- `Left` and `Right` create a single cue in the 1200-2200ms range
- `Come Back` creates a single cue in the 2300-2500ms range

## Scope

This change is limited to interval cue planning and its tests. No UI changes and no broader timer refactor are included.
