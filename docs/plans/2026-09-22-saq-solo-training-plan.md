# SAQ Solo Training Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Upgrade the existing solo interval timer with unpredictable cues, reliable cue presentation, drill modes, optional logging, useful comparisons, and repeatable progression.

**Architecture:** Keep cue selection, scheduling calculations, validation, migrations, and statistics in pure TypeScript utilities. React hooks own runtime scheduling and cancellation; Zustand owns persisted settings and completed records. Capture session configuration at Start so an active workout has stable settings and later history describes what actually ran.

**Tech Stack:** Existing Expo 55 / React 19 / React Native 0.83, TypeScript, Zustand 5 with AsyncStorage, expo-speech, expo-audio, date-fns, react-native-svg, and Node's built-in test runner.

---

## How to use this prompt

You are working in my existing SAQ (speed, agility, quickness) app. Follow this document as the implementation prompt. It is a proposed plan, not a claim that these features exist or approval to implement all phases.

First recheck the current code, give me a short summary and a short Phase 1 plan, then wait for approval to implement Phase 1. After approval, complete only that phase. At every phase boundary, run tests and lint, report changes, verification results and limitations, update the milestone tracker, and wait for my approval before starting the next phase. Milestones within an approved phase do not require separate approval. Expand later phases into test-first tasks when they become current; do not implement their scaffolding prematurely.

The app is for ONE person training alone, with the phone on the ground or a bench several meters away. No coach, partner, accounts, cloud sync, multi-device features, sensors, force measurement, strength programming, or nutrition programming. Rep outcomes and times are self-reported; never describe them as automatically measured reaction times.

## Verified code baseline — 2026-09-22

Read these files before implementing, and verify that this baseline still holds:

| Area                     | Actual behavior and relevant files                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cue vocabulary           | `utils/defaultCues.ts`: exactly Left, Right, Run, Come Back. Invalid/empty enabled lists normalize to all four in canonical order. Settings allows a single enabled cue.                                                                                                                                    |
| Cue planning             | `utils/intervalCuePlan.ts`: one random enabled cue per WORK round, `Go` announcement, Run at 500 ms, Left/Right at 1200–2200 ms, Come Back at 2300–2500 ms. No weights or streak memory.                                                                                                                    |
| Phase transitions        | `utils/timerEngine.ts`: PREP → WORK → REST; repeat WORK/REST; after the final REST, optional COOL_DOWN → FINISHED. Preserve that final rest and the duration calculation in `utils/timeUtils.ts`.                                                                                                           |
| Runtime                  | `hooks/useActiveTimerEngine.ts`: 250 ms ticks decrement whole seconds from wall time; separate timeouts dispatch cues. Pause cancels pending timeouts and resume uses accumulated elapsed cue time. This is not a guarantee of reliable background audio or multi-phase catch-up.                           |
| Early visual reveal      | The hook sets `currentCue` to `next.currentExercise` immediately on entering WORK. `components/ActiveTimer.tsx` already displays that word with `CueFlash` before its scheduled speech. Correct this in Phase 1.                                                                                            |
| Audio                    | `utils/tts.ts`: expo-speech, voice preference/loading, interrupt/queue support, Android Chrome special handling, global `voiceEnabled`. `utils/audioCues.ts`: bundled beep/whistle/buzzer WAV players with a separate sound-effects toggle; background playback is disabled. No recorded spoken cue assets. |
| Alerts                   | `utils/timerAlerts.ts` and `ActiveTimer.tsx`: prep/rest final-three-second beeps, work countdown only for work ≥10 s, rest “5 Seconds,” WORK whistle, REST/COOL_DOWN buzzer, optional phase haptics. These can compete with new cue announcements.                                                          |
| Setup                    | `components/TimerSetup.tsx`, `components/NumberInput.tsx`: prep/work/rest/rounds/cool-down. Current UI minima: prep 5 s, work 3 s, rest 15 s; rounds 1–100.                                                                                                                                                 |
| Defaults and persistence | `store.ts`: 10 s prep, 5 s work, 55 s rest, 8 rounds, 0 cool-down. AsyncStorage key `interval-trainer-storage`, version **14**; migrations support earlier mode/config shapes. Three independent voice/sound/haptics booleans.                                                                              |
| History lifecycle        | `App.tsx`: history is written when DONE is tapped, not when FINISHED is first reached. Exiting can discard the session, including from FINISHED. Saved duration is configured duration, not measured elapsed wall time.                                                                                     |
| History schema           | `types.ts`: date and duration; optional legacy-compatible mode and rounds. `TimerMode` still includes SAQ, but current sessions save INTERVAL. Do not reuse that legacy field for new drill types.                                                                                                          |
| Statistics               | `components/Statistics.tsx`, `utils/historyUtils.ts`: workout count, calendar-day streak, total configured time, grouped history. No rep-level outcomes or performance math.                                                                                                                                |
| Design and PWA           | `theme.ts`: existing dark theme, phase colors, Outfit/Roboto Mono. `build-pwa.js` precaches listed extensions but currently omits WAV/MP3. New bundled audio needs offline-cache verification.                                                                                                              |
| Tests                    | `utils/intervalCuePlan.test.ts`: four `node:test`/strict-assert tests, using controlled `Math.random`. `package.json` has lint/build scripts but **no test script**. No existing hook test harness was found.                                                                                               |

Baseline checks run for this documentation review: Node v22.15.0; existing four tests pass; `npm run lint` and `./node_modules/.bin/tsc --noEmit` exit 0. Node emits experimental type-stripping/module-format warnings. No native runtime, browser runtime, or build success is claimed by this review.

## Working rules

1. Follow `.agent/AGENTS.md`, the local writing-plans, test-driven-development, and verification-before-completion skills where relevant. Prefer `.agent/skills/` per the local workflow; inspect `.claude/skills/` only when needed. Use the available tool equivalents, sequential execution, and `docs/plans/task.md` as a table-only live tracker. Preserve existing user edits, including `.agent/AGENTS.md`.
2. For each new behavior: write a focused failing test, run it and confirm the intended failure, implement the minimum change, rerun, then refactor. Keep new logic testable without React Native imports. Do not create tests for prose-only edits.
3. Use injected RNG, clocks, and scheduling adapters for deterministic tests. Do not base passing tests on uncontrolled randomness or real-time sleeps.
4. Bump the persisted version whenever adding persisted settings/schema; add pure migration tests. Phase 1 starts at 14 → 15 if the baseline is unchanged. Preserve older migration branches, settings, enabled cues, flags, and history. Do not invent cue sequences or outcomes for legacy records.
5. Keep all scheduled work cancellable on pause, phase exit, workout exit, and unmount. Resume remaining delays; do not redraw a cue, repeat a delivered cue, or count a paused interval as active time. Cancel queued/in-flight audio consistently as the output layer develops.
6. Keep the theme and solo usability. New in-workout primary controls should have at least 64 dp targets, clear labels and spacing, and stay accessible during visual cues. No input during WORK. Logging never delays transitions.
7. Support iOS, Android, and web/PWA. Report which platforms were actually checked. Do not promise operating-system background timing, acoustic synchronization, or 5 m readability based on unit tests.
8. Use existing dependencies. Explain any necessary new dependency and obtain approval before adding it. A package script does not require a dependency.
9. At phase completion run all unit tests, lint, and TypeScript. Run the web/PWA build for runtime/asset changes, and perform the relevant platform checks. Distinguish pre-existing failures and unavailable checks from verified results. Do not claim a phase fully validated while required device checks remain outstanding.

## Milestones and approval gates

| Milestone                       | Deliverable                                          | Exit evidence                                                          | Status                                 |
| ------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| M0 — Plan                       | Code-reviewed prompt and baseline                    | This document; implementation not started                              | Complete                               |
| M1.1 — Cue rules                | Shared timing, weights, anti-streak, validation      | Deterministic utility tests                                            | Complete                               |
| M1.2 — Persistence and settings | Migrated delay/weight controls and presets           | Migration fixtures and setting round-trip checks                       | Complete                               |
| M1.3 — Runtime integration      | Hidden pending cue, stable schedule and pause/resume | Scheduler regressions, platform smoke checks, Phase 1 approval gate    | Complete                               |
| M2.1 — Cue audio                | Clip registry, playback/fallback and cleanup         | Missing-file-safe build, routing tests, supplied-asset playback checks | Complete — awaiting WAV clips          |
| M2.2 — Cue presentation         | Distance-readable display and output mode            | No early cue reveal; output matrix; Phase 2 approval gate              | Complete — native/distance checks open |
| M3.1 — Session plans            | Reactive, Planned, Alternating                       | Deterministic plans, preview scheduling, round records                 | Complete                               |
| M3.2 — Extended drills          | Fake-out, Chain, instruction labels                  | Fit checks, multi-event scheduling, history; Phase 3 approval gate     | Complete                               |
| M4.1 — Rest logging             | Outcomes and optional numeric time entry             | Correct-round edits and transition boundary tests                      | Complete — native checks open          |
| M4.2 — Session notes            | Optional notes and compatible records                | Idempotent save/updates, old-history fixtures; Phase 4 approval gate   | Complete                               |
| M5.1 — Performance math         | Explicit populations, denominators and time units    | Small hand-calculated fixtures and threshold tests                     | Complete                               |
| M5.2 — Statistics UI            | Cue, condition, delay and fake-out comparisons       | Sample counts and insufficient-data states; Phase 5 approval gate      | Complete                               |
| M6.1 — Presets and warm-up      | Full saved configurations and editable timed warm-up | Persistence, cancellation and skip tests                               | Complete — native checks open          |
| M6.2 — Progression and replay   | Opt-in stages and exact session replay               | Eligibility and replay invariants; Phase 6 approval gate               | Complete — native checks open          |

## Progress log

### Phase 6 — completed 2026-09-25

Persisted version is now **19** (additive: `savedPresets`, `warmupEnabled`, `progression`; optional history fields `warmupSeconds`, `replayOfSessionId`, `progressionStage`). The user approved Phase 6 by asking for it to be completed. All six phases are now implemented.

**M6.1 delivered:**

- **`utils/sessionPresets.ts`** (pure, tested):
  - A preset holds a full `SessionConfigSnapshot`: timers, enabled cues, drill type and options, delay range, weights, output mode and stopping instruction.
  - `validateSessionConfig` is strict. It rejects anything that normalizing would change: non-integer or out-of-range timers, unknown cues, out-of-range delays or weights, an unknown output mode, or a drill that cannot start. Nothing is clamped.
  - Save, rename and delete work on user presets only. Names are trimmed, 1–40 characters and unique (case-insensitive, built-ins included). A failed save leaves the list unchanged.
  - Three built-ins state every value, using the default timers (10/5/55 × 8):
    - Reactive cuts: Reactive, Mixed delays, Left + Right.
    - Decel focus: Reactive, Mixed delays, all four cues, Come Back weight 3, "Stop within 2 strides".
    - Planned baseline: Planned, Mixed delays, equal weights.
  - Persisted presets are re-validated on migration and hydration. Corrupted entries and duplicate IDs are dropped.
- **Store:** `applySessionConfig` validates first, then sets all five setup fields in one `set`. An invalid preset changes nothing.
- **Setup (`components/PresetPicker.tsx`):**
  - Preset chips; the chip matching the current setup is highlighted.
  - A one-line summary of the setup (drill · delays · cues · work/rest × rounds).
  - Name + Save, with the error shown inline. Manage view for rename and delete.
- **Warm-up:**
  - `data/warmup.ts` holds the editable copy and durations: 8 min of jog, skips, lateral shuffles, easy decelerations and build-up sprints. It assumes no equipment.
  - `utils/warmupPlan.ts` is a pure state machine. Ticks carry over across steps, pause freezes time, and skipping a step or the whole warm-up never counts unused time. Actions after DONE are ignored.
  - A malformed step file disables the toggle and shows the reason.
- **Warm-up runtime (`components/WarmupTimer.tsx`):**
  - Wall-clock ticks and 64 pt Pause, Skip step and Skip warm-up controls.
  - Each step is spoken through the cue output mode, and repeated on resume after a pause. Last-3-second beeps follow the sound-effects toggle.
  - Pausing, finishing, skipping, exiting or unmounting stops speech and clips. App silences again before round 1.
- **Recording:** warm-up is a separate view before PREP, never scored. `warmupSeconds` (unpaused seconds actually run) is stored separately; `duration` stays configured training time.

**M6.2 delivered:**

- **`utils/progression.ts`:**
  - Stages: 1 Planned + Early, 2 Reactive + Early, 3 Reactive + Late, 4 Fake-outs (Late delays).
  - Applying a stage returns a new config and never mutates the input. Stage 4 raises work time to `ceil((delayMax + gap + 500) / 1000)` when needed. With one enabled cue, stage 4 is refused rather than enabling another cue.
  - A session records `progressionStage` only when you've opted in, the session isn't a replay, and the setup matches the stage's drill and delay range.
  - An advance is suggested after 3 consecutive counted sessions. Each needs ≥ 5 logged reps, ≥ 80 % of rounds logged and ≥ 80 % clean.
  - A nonqualifying stage session breaks the run. Other drills and replays are ignored, and so are sessions from before the stage was last chosen (`stageSetAt`).
  - Nothing advances on its own.
- **Setup (`components/ProgressionCard.tsx`):**
  - Opt-in switch and stage chips; choosing a stage is a user action.
  - A "setup matches / differs" notice with an Apply button.
  - The rule text, and the last three sessions with ✓/✗ and the reason for each.
  - When a suggestion is due: "Ready to try stage N" with an Apply button.
- **`utils/sessionReplay.ts`:**
  - `checkReplay` accepts only complete, consistent plans. It checks:
    - plan version, saved config and drill/instruction match;
    - round count and order, and per-round condition;
    - labels are enabled cues, and offsets are integers within `work − 500`;
    - roles per condition, plus the fake-out pair (different labels, correction later);
    - chain count and increasing offsets;
    - planned previews (phase, label, window), with no stray previews.
  - Anything else gets a stated reason; nothing is repaired.
  - `buildReplaySession` rebuilds the stored events under a new session ID with no random draw and a deep-frozen copy of the config.
  - The replay record carries `replayOfSessionId`. Outcomes, times and notes are never copied.
- **UI:**
  - History rows have a replay toggle. It shows a Start Replay panel that explains repeated exposure, or "Replay unavailable: reason".
  - Rows show Replay, Stage N and Warm-up chips.
  - The PREP helper text says "Replay: same cue sequence…".
  - Performance panels exclude replays (`splitReplays`) and state how many were excluded.

**Verification (2026-09-25):**

- `npm test`: 99/99 pass. New: 7 preset, 6 warm-up, 9 progression, 6 replay, 2 migration and 1 stats test.
  - Pure-module tests were run red before implementation for presets, warm-up, replay and migrations.
  - For progression, the tests and the implementation were written together.
- `npm run lint`: exit 0. `tsc --noEmit`: exit 0. `npm run build`: exit 0; `dist/sw.js` still precaches the beep/buzzer/whistle WAVs.
- Headless Chromium (390×844) against the built PWA, storage seeded at v18 with three qualifying stage-2 sessions and a legacy record:
  - The suggestion for stage 3 was shown. Tapping Apply set stage 3 with Reactive 1500–2500 ms, reset the run, migrated storage to v19 and kept all 4 history rows.
  - Preset save worked. A duplicate name (different case) was rejected. Applying Reactive cuts set 10/5/55/8 and BOTH; re-applying the saved preset restored the exact setup.
  - Warm-up pause froze the clock over 2.2 s. Skip step moved to Skips, and Skip warm-up went to PREP.
  - The workout saved `warmupSeconds: 2`, `duration: 41` (training only), `progressionStage: 3` and a round-1 CLEAN.
  - Replay refusals showed the right reason: a seeded record with a round-count mismatch, and a legacy summary-only record.
  - Replaying the new session showed the PREP replay label. It produced a new ID, `replayOfSessionId`, identical events (`Left @1863`, `Right @1581`, all delivered), no outcomes and no stage. Stats showed "1 replay session excluded".
  - Warm-up, presets, progression and history/replay panels fit at 390 px without horizontal overflow.

**Open limitations:**

- Not checked on iOS or Android, or in a real mobile browser: warm-up speech and beeps as heard, screen wake during the 8-minute warm-up, and preset or rename keyboard behaviour.
- Headless Chromium has no audible speech.
- There is still no hook/component test harness. Warm-up cancellation on the React side (speech stopped on pause, finish and exit) is covered by code review and the browser run, not by unit tests.
- Warm-up copy is edited in `data/warmup.ts`, not in the app.
- Replay uses the saved output mode, not today's setting.
- Earlier limitations still apply: no recorded cue WAV clips, and no native audio or distance checks.

### Phases 4 and 5 — completed 2026-09-25

Persisted version is now **18** (additive: optional round `outcome` / `selfReportedTimeMs` and session `notes`). The user approved Phases 4 and 5 together. Phase 6 has not started.

**Phase 4 delivered:**

- **`utils/repLogging.ts`** (pure, tested):
  - `applyRoundLogEdit` binds each edit to session ID + round ID. It is accepted only while that round's REST is open (`getOpenLogRoundId`). Late touches after REST ends, stale rounds and other sessions return the log unchanged.
  - Set, replace or clear an outcome (clearing returns the round to Not logged). Setting or clearing a time never chooses an outcome.
  - `parseSelfReportedTime`: decimal seconds (`.` or `,`) → integer ms, 0 < t ≤ 60 s. Blank or invalid input is `null`, never zero.
  - A zero-length rest has no logging window; the timer never waits.
  - `attachRoundLogs` copies logs onto round records at save; unlogged rounds get no fields.
  - `normalizeSessionNotes` / `applySessionNotes`: surface (fixed list), energy 1–5, pain yes/no with optional location (40 chars, kept only with pain = yes), free text (280 chars). Notes update the saved session by ID; they never add a row. Empty notes (skip), repeats and unknown IDs are no-ops.
- **REST UI (`components/RestRepLog.tsx`):** large Clean / Wrong first step / Missed-stopped buttons (72 pt), a Not logged action, and an optional 64 pt on-screen decimal pad labelled as self-entered, not app-measured. REST switches to a compact timer while the card shows. The card is keyed by round ID, so an uncommitted draft is discarded when the next WORK starts. Nothing is shown during WORK.
- **Runtime:** edits are checked against the engine's latest snapshot (`getTimerSnapshot`), not the rendered one. Logs are held in a ref and passed with the delivery log to `onComplete`, so a final-REST tap is included in the save at FINISHED.
- **Finish screen (`components/SessionNotes.tsx`):** logged-count stat, optional notes form, SAVE & DONE / SKIP. A submit guard stops double taps saving twice.
- **History:** rows show `n/N logged` for round-tracked sessions and a notes icon.

**Phase 5 delivered (`utils/performanceStats.ts`, `components/PerformanceStats.tsx`):**

- Clean % = clean / logged, shown with logged n, eligible n and coverage. The mean self-entered time uses clean reps with finite positive times only, with its own timed n. Legacy records count only toward workout totals.
- **Per cue:** delivered single-target Planned/Reactive reps, including within Alternating. Chain and Fake-out excluded. Filter: Planned + Reactive / Reactive / Planned.
- **Planned vs reactive:** grouped by cue + work/rest + stopping instruction + output mode. Source filter: all drills or within Alternating. Gaps are reactive − planned (pp and s). The weekly series is for the selected group; weeks start Monday with year-inclusive keys (`yyyy-MM-dd`), and weeks with no data are omitted, not zero.
- **Early vs late:** recorded scheduled delay of delivered Reactive targets: ≤ 900 ms Early, ≥ 1500 ms Late. Middle reps are counted and excluded. Grouped by protocol; gap = late − early.
- **Fake-out:** success = clean / logged among rounds with a delivered correction. Rounds with no correction and with an undelivered correction are counted separately.
- A group needs ≥ 5 observations per metric (logged n for %, timed n for times). Below that the UI shows counts and "Not enough data yet". A gap needs both sides sufficient.
- All panels state their population. Simple bars and text; no chart library.

**Verification (2026-09-25):**

- `npm test`: 68/68 pass (10 rep-logging, 12 performance-stats and 1 new migration test added).
- `npm run lint`: 0 problems. `tsc --noEmit`: 0 errors. `npm run build`: exit 0.
- Headless Chromium (390×844) against the built PWA, storage seeded at v17:
  - Round 1 REST: Clean + 1.52 s saved. The next WORK showed no logging controls.
  - Final REST: wrong first step → Not logged → Missed/stopped. A time draft left open was discarded at REST end.
  - The save at FINISHED stored `[{CLEAN, 1520}, {MISSED_STOPPED}]` and migrated storage to v18. The legacy record was unchanged.
  - A double-clicked SAVE & DONE stored notes once (`TURF`, energy 4, pain, trimmed location). History length stayed 2.
  - Stats with sparse data: insufficient-data states shown. With synthetic fixtures, the rendered per-cue, planned/reactive (−33 pp, +0.22 s), weekly (Monday keys), early/late and fake-out figures matched hand calculation.
  - The REST card and open pad fit a 390×844 viewport without scrolling.

**Open limitations:**

- Not checked on iOS or Android, or in a real mobile browser: one-handed reach, pad feel, the keyboard over the notes field (iOS uses `KeyboardAvoidingView`), and sweat or glove use.
- There is no automated hook/component test harness. The late-touch guard is unit-tested in `applyRoundLogEdit`, but the actual touch race at REST exit was not reproduced in a browser.
- Logging can't be switched off. The card is always offered in REST but can be ignored.
- The weekly series shows one comparison group at a time (the one with the most logged reps by default).
- Earlier limitations still apply: no spoken WAV clips, and no native audio or distance checks.

### Phases 2 and 3 — completed 2026-09-24

Persisted version is now **17** (15: cue settings, 16: output mode, 17: drill settings). The user approved Phases 2 and 3 together, so both ran in one pass. Phase 4 has not started.

**Phase 2 gaps closed.** The earlier pass had marked Phase 2 complete, but four items were missing:

- The legacy `voiceEnabled` switch still gated "Get ready" and "5 Seconds". Output mode is now the only voice gate (`utils/tts.ts`), and the switch is removed from Settings.
- Clip-to-TTS routing is now `routeSpokenCue` in `utils/cueOutput.ts`, tested with adapters: one output per cue, TTS only when no clip starts, and no audio in Visual only.
- Alert collisions:
  - The WORK whistle is suppressed when spoken "Go" will play.
  - The PREP/REST countdown beep on a preview second is suppressed.
  - WORK countdown beeps within 700 ms of a cue deadline are suppressed (`isNearCueEvent`).
  - Visual only keeps all beeps. Cue deadlines never move.
- The Unicode-arrow text became a cue-dominant layout. It has a compact WORK timer, large Ionicons arrows (left/right/up/U-turn) and a 64 pt word, and nothing (not even an accessibility label) appears before dispatch. Pausing now stops queued speech and clips.

**Phase 3 delivered:**

- **`utils/drillPlan.ts`:**
  - Drill settings normalization.
  - Full-schedule validation before Start:
    - Planned rounds need a nonzero preview window.
    - Fake-out needs two or more cues and `delayMax + gap <= work − 500`.
    - Chain needs work ≥ 8 s and `count × delayMax <= work − 500`.
  - An immutable session plan built at Start, with a fixed RNG draw order so plans are deterministic. Anti-streak runs across all movement cues in session order, including corrections and chain steps.
  - Preview timing helpers.
- **`utils/sessionHistory.ts`:**
  - Session and round records with stable IDs.
  - Delivered/skipped status per event and per preview, with the observed dispatch offset in active WORK ms.
  - Configuration snapshot.
  - `addCompletedSession`, which saves once per session ID.
- **Runtime (`hooks/useActiveTimerEngine.ts`):**
  - The hook plays the pre-generated plan and draws nothing at runtime.
  - Planned previews are driven by the countdown, so pausing freezes them. Previews queue behind "5 Seconds" and never play in the final REST.
  - Cue state carries the event ID.
  - Stale timeouts are dropped by phase and round.
  - Pause side effects moved out of the state updater.
- **Corrections:** amber CHANGE panel, a short beep (sound-effects toggle) and a warning haptic (vibration toggle).
- **Lifecycle (`App.tsx`):** the session is saved when FINISHED is first reached. DONE or exit from FINISHED cannot duplicate or discard it. Exiting before FINISHED still discards after confirmation.
- **UI:**
  - Drill card in Setup: type, fake-out chance and gap, chain count, stopping instruction (presets plus custom, 60 characters max).
  - Drill instructions in PREP; stopping instruction in PREP/REST.
  - Drill chip in history.

**Verification (2026-09-24):**

- `npm test`: 45/45 pass.
- `npm run lint`: 0 problems.
- `tsc --noEmit`: 0 errors.
- `npm run build`: exit 0. `dist/sw.js` precaches `beep`/`buzzer`/`whistle` WAVs.
- Headless Chromium (390×844) smoke runs of the built PWA:
  - **Alternating:** preview at 3 s left in PREP and before round 3; none before reactive round 2 or in the final REST. Reactive cue observed at 1827 ms (scheduled 1825).
  - **Fake-out:** a pause 0.3 s into WORK; the cue landed at 1756 ms active time (scheduled 1755) and the correction at 2557 (scheduled 2555). No duplicates.
  - **Chain ×3:** cues at spaced intervals.
  - **Save:** history saved once at FINISHED, with the legacy record kept; DONE adds nothing.
  - **Invalid Fake-out (3 s work):** Start blocked with a reason.
  - **Migration:** v16 storage with `voiceEnabled: false` migrated to v17 as `VISUAL_ONLY`.

**Open limitations:**

- No spoken WAV clips have been supplied yet, so the app uses TTS for all speech. Clip playback and offline clip caching are unverified until clips are added to `utils/cueAudioAssets.ts`.
- Not checked on iOS or Android devices, or in a real mobile browser. That includes distance readability at ~5 m, speech/beep overlap as heard on a device, haptics, and offline PWA playback.
- Headless Chromium has no audible speech; speech calls were exercised, but no sound was heard.
- There is still no React hook test harness. Runtime behavior is covered by the pure helpers plus the browser smoke runs above.

## Phase 1 — Remove cue identity timing leaks

### Product contract

- Sample cue identity and delay separately. Every eligible cue uses the same uniform inclusive integer range, default **500–2500 ms**. `Go` remains at WORK entry; the cue offset is measured from WORK entry, not from speech completion.
- Provide Early **300–900 ms**, Mixed **500–2500 ms**, Late **1500–2500 ms**, plus custom minimum/maximum controls explicitly labeled in milliseconds.
- Proposed engineering bounds: integer **100–2500 ms**, with maximum also limited to `workTime * 1000 - 500`. This 500 ms margin is a scheduling policy, not a physiological safety guarantee. Validate at Start as well as when editing; reject an impossible work duration instead of silently scheduling outside WORK. Keep user delay preferences separate from the effective range if a legacy short configuration requires a cap, and show the effective range.
- Normalize non-finite/missing persisted values to defaults, round finite values to integers, clamp, then sort reversed endpoints. Equal endpoints are valid fixed timing. Apply the same normalization in setters and migrations; do not rely only on the UI.
- Weights default to 1 per canonical cue. Proposed UI range: integer **1–10**, with enable/disable remaining the way to remove a cue. Disabled cues never participate. Missing/non-finite weights become 1; finite out-of-range weights clamp. Persist weights for disabled cues so enabling them restores the preference.
- When the previous two selected round cues match, exclude that cue for the next draw, then renormalize the remaining weights. With one enabled cue, repeats are unavoidable: preserve single-cue training and explain that anti-streak requires two or more enabled cues. Never secretly enable another cue.
- Anti-streak limits predictability rather than creating mathematical independence: with two cues, two identical cues force the other next. Requested weights are relative selection weights among eligible cues; streak prevention can change long-run frequencies.
- Carry recent-cue state for the active session only. Advance it once per new round, reset for a new workout, and never advance on render or resume.
- Fix the existing visual leak now: entering WORK shows neutral content until the cue fires. No selected-cue text or accessibility label may reveal a pending reactive cue. Phase 2 enlarges this existing presentation later.

### M1.1 — Test and implement pure selection/validation

**Files:** modify `utils/intervalCuePlan.ts`, `utils/intervalCuePlan.test.ts`, `types.ts`; create `utils/cueSettings.ts` and `utils/cueSettings.test.ts`; modify `package.json` only to add a test command if needed.

1. Write failing normalization tests for defaults, fixed/reversed ranges, invalid numbers, bounds, work-duration cap, impossible duration, canonical weight keys, and enabled-cue normalization.
2. Run the focused tests and record the expected failures; implement the normalizer and validator; rerun.
3. Extend the planner input with normalized settings, the last two cues, and an optional RNG function defaulting to `Math.random`. Preserve `IntervalCuePlan`'s existing output shape for Phase 1. Avoid importing the store into the planner.
4. Replace tests enforcing the obsolete per-cue buckets. Use controlled RNG sequences to select each cue and test identical delay quantiles/bounds for all four. For example, the same delay draw `0.5` over 500–2500 must yield 1500 ms regardless of cue identity.
5. Test weighted cumulative-boundary selection, disabled cues, extreme weights, one enabled cue, no three repeats with two or more enabled cues, and a fresh session reset.
6. Add fixed-seed many-sample checks. Check requested proportions with empty recent history, then separately test sequences with anti-streak enabled against eligible conditional probabilities. Do not assert raw configured proportions when the anti-streak constraint changes them.
7. Implement the minimal planner changes and rerun all tests. All generated offsets must fit the validated WORK duration.

### M1.2 — Persist and expose settings

**Files:** modify `store.ts`, `types.ts`, `components/Settings.tsx`; reuse `components/NumberInput.tsx` with `isTime={false}` where suitable; create `utils/storeMigrations.ts` and `utils/storeMigrations.test.ts` for testable migration logic.

1. Write fixtures for version 14 state with custom times, a single enabled cue, voice/sound/haptics flags, and both minimal and mode/rounds history. Include older mode-config shapes and partial/invalid new settings.
2. Extract only the migration logic required to test it without AsyncStorage/React Native. Preserve existing legacy transformations and verify no new migration rewrites version-14 user values.
3. Add cue settings defaults and setters; bump version 14 → 15. Keep `interval-trainer-storage` and existing history intact. Test loading normalized current-version settings too; Zustand migration is not automatically invoked for an already-current version.
4. Add delay inputs, preset selection/custom indication, and optional weight controls with equal-weight reset. Keep the Settings screen scrollable and reachable on small phones. Define restore-defaults scope explicitly: cues and new cue settings; do not unexpectedly reset audio toggles or history.
5. Run focused migration/planner tests. Verify changes survive restart/hydration and cue switches still prevent disabling the final cue.

### M1.3 — Integrate runtime without changing the phase sequence

**Files:** modify `App.tsx`, `hooks/useActiveTimerEngine.ts`, `components/ActiveTimer.tsx`; touch `utils/timerEngine.ts` only as needed; create `utils/cueScheduler.ts`, `utils/cueScheduler.test.ts`, and `utils/timerEngine.test.ts` for directly used runtime calculations/behavior.

1. Write failing tests for pending/delivered event tracking, remaining delay on repeated pauses, cancellation, and no cue before its deadline. Prefer an injected clock/timer adapter around the actual scheduler used by the hook, not a second test-only implementation.
2. Capture timer config, enabled cues and cue settings at Start, and pass those stable values to the active session. Update recent-cue state once on each accepted round transition.
3. Keep visible cue state empty at WORK entry; set it only on dispatch. Ensure timer refs and cancellation checks do not let stale callbacks emit during REST or after unmount. Keep React state updater functions free of externally visible selection/scheduling side effects.
4. Track delivered event IDs, not just `offsetMs > elapsedMs`: a deadline crossed while a callback was delayed must not silently count as delivered. On resume, dispatch an overdue undelivered cue only if its WORK round is still active; otherwise discard it. Use event identity so consecutive identical cues can still trigger presentation.
5. Test PREP/WORK/REST/final REST/optional COOL_DOWN/FINISHED, pause before and after a cue, multiple pauses, exit-confirm resume, and new workout reset. No duplicate `Go`, cue or phase transition caused by rerenders.
6. Run the phase gate checks. Manually check the 3 s minimum work setting, all enabled-pool sizes, missing early visual text, and pause/resume on native and web where available.

**Phase 1 acceptance:** shared label-independent delay logic; persisted presets/weights; anti-streak with the documented single-cue exception; no pending-cue leak; no schedule restart or duplicate on resume; old state/history loads; tests/lint/typecheck pass. Summarize and stop for approval before Phase 2.

## Phase 2 — Consistent audio and distance-readable cues

**Files:** `utils/audioCues.ts`, `utils/tts.ts`, `utils/timerAlerts.ts`, `components/ActiveTimer.tsx`, `components/Settings.tsx`, `App.tsx`, `store.ts`, `types.ts`, `build-pwa.js`; proposed new `utils/cueOutput.ts`, `utils/cueOutput.test.ts`, `utils/cueAudioAssets.ts`, and `assets/audio/cues/README.md`.

### M2.1 — Recorded cue support

- Request these exact files from me: `assets/audio/cues/go.wav`, `left.wav`, `right.wav`, `run.wav`, `come-back.wav`. Preferred delivery: PCM WAV, mono, 16-bit, 44.1 kHz, trimmed leading/trailing silence, similar perceived loudness, no clipping. Confirm playback on target devices when supplied.
- Create a typed registry with absent entries and a README first. **Do not import/require files that do not exist** or create silent dummy clips: Metro resolves bundled imports at build time, before runtime fallback can help. Add static asset imports only when real files are present.
- Use expo-audio for available spoken clips, TTS for missing/unavailable/failed clips, with one output event and cancellation token per cue. Keep other announcements on TTS. Avoid duplicate playback from races between loading and fallback.
- Initialize from the existing user-interaction/Start path. Stop the previous cue where necessary; handle async player readiness/seek errors. Cancel both audio types on pause/exit/unmount so queued words do not escape into another phase.
- Test routing/cleanup with adapters. Verify speech and clip fallback on real targets; dispatch time is not measured speaker onset. Missing supplied clips are a stated acceptance dependency, while fallback/build work can still be completed.
- Extend PWA caching to include bundled cue audio and verify offline playback after initial install/cache. Inspect exported asset names and sizes rather than assuming source paths equal deployed URLs.

### M2.2 — Presentation and output selection

- Enlarge the existing cue display into a high-contrast cue-dominant layout: left/right arrows, up arrow for Run, U-turn plus Come Back text. Use existing icons/SVG, theme colors and clear words; no new icon package. Keep pause/exit accessible.
- Add Voice only / Visual only / Both. Treat “Voice” as prerecorded speech with TTS fallback. Preserve separate sound-effects/haptics preferences. Define the output mode as controlling spoken guidance and cue visuals; phase text/countdown remains visible, and sound effects follow their independent toggle.
- Migrate `voiceEnabled=true` to Both and `false` to Visual only, preserving the existing visible cues. Make output mode the source of truth for voice gating; update `tts.ts` so the old boolean cannot silently block a chosen mode.
- Dispatch visual and audio outputs from the same cue event; do not wait for a speech-completion callback to reveal the visual. Test the output matrix and missing-asset fallback.
- Resolve collisions with `Go`, the WORK whistle, and countdown/rest announcements explicitly: cue speech has priority; suppress/defer competing alerts at that event without altering cue deadlines.

**Gate:** verify output combinations, distance readability by device check, no preview leak, fallback, cancellation and PWA build/offline assets. Report missing real clips/device checks and stop for approval.

## Phase 2b: Expanded equipment-free reaction cues

The app must work with NO equipment: no cones, markers, or mats. All cues refer to directions or movements relative to the athlete's own body.

1. Directions (current, default): Left, Right, Run, Come Back. Optionally add diagonals: "Left forward", "Right forward", "Left back", "Right back". The user can enable any subset (minimum 2).

2. Movement cues (optional set): the cue names a movement, not just a direction, e.g. "Shuffle left", "Shuffle right", "Backpedal", "Sprint", "Drop" (get down to the ground and up), "Jump". User picks which are enabled.

3. Go / No-go (toggle, works with any set): a configurable fraction of cues (default 20%, range 10–40%) is "Stay" or "Hold" (visual = large stop sign). The correct response is to not move, or to freeze if already moving. On the rest screen those rounds log as "Held" / "Moved".

4. Number of options: labeled as difficulty on the setup screen; the planner only uses enabled cues.

5. Custom cues: the user can type up to 8 of their own cue words that describe a body-relative direction or movement. Validate for empty or duplicate entries. Custom words use text-to-speech unless a clip is recorded.

Rules:

- The Phase 1 timing rules apply to all sets: one shared random delay range, anti-streak, optional weights.
- The Phase 2 audio-clip system should accept a clip per cue, falling back to text-to-speech.
- The visual display needs an icon for every cue (arrows, diagonal arrows, backpedal/shuffle icons, stop sign).
- Store with every round: cue set, enabled cues, number of options, No-go on/off. Phase 5 statistics must break results down by these and not mix them unlabeled. Add No-go accuracy stats.
- Tests: enabled-cue filtering, No-go frequency over many samples, and validation of custom cues.

## Phase 3 — Drill modes and recorded session plans

**Files:** `types.ts`, `store.ts`, `App.tsx`, `components/TimerSetup.tsx`, `components/ActiveTimer.tsx`, `components/Statistics.tsx`, `hooks/useActiveTimerEngine.ts`, `utils/timerEngine.ts`, `utils/timerAlerts.ts`; proposed new `utils/drillPlan.ts`, `utils/drillPlan.test.ts`, `utils/sessionHistory.ts`, and `utils/sessionHistory.test.ts`.

### M3.1 — Reactive, Planned, Alternating

- Add a separate `DrillType` field; preserve legacy `mode`. Generate an immutable session plan at Start, internally hidden from reactive UI. Reuse the approved Phase 1 selection rules and store the configuration snapshot and plan version.
- Reactive: `Go` at WORK entry, one delayed cue. Planned: choose the upcoming cue once, reveal/announce it in the final 3 s of preceding PREP/REST, then `Go` starts WORK; display the known cue at WORK entry without drawing again. If the preceding phase is shorter, preview at its start; reject a zero-length preview window for Planned rounds.
- Preview only an actual upcoming round, never during final REST. Coordinate preview with countdown and “5 Seconds” speech so it is not cut off. Freeze preview scheduling on pause.
- Alternating: odd rounds Planned, even rounds Reactive. Store session drill type and each round's actual condition separately. Planned work cue offset is 0, with preview phase/offset stored separately; do not treat a preview as a reactive delay.
- Add stable session and round IDs, ordered cue events (label, scheduled WORK-relative offset in ms, role), and delivered/skipped status plus observed dispatch offset when available. “Actual sequence” means dispatched app events, not verified acoustic onset or athlete movement. Keep records for undelivered planned events distinguishable.
- Save completion once on entering FINISHED with a stable ID; DONE or exit from FINISHED must not duplicate/discard it. Preserve current early-abort discard behavior with clear confirmation. Phase 4 can update this saved item with notes by ID. Test this lifecycle in a pure helper used by App.

### M3.2 — Fake-out, Chain, instructions

- Fake-out: independent probability per round, default 0.25, adjustable 0–1; this means an expected one in four, not exactly every fourth round. Second-cue gap defaults to 800 ms, configurable 600–1500 ms. The correction must differ from the first and becomes the target to follow. Require at least two enabled cues.
- Show clear instructions before the session: follow the latest cue and change direction if corrected. Mark corrections with a distinctive visual treatment and short sound accent respecting output toggles; do not assume volume can be increased above existing maximum. Store both events and whether a fake-out occurred; success later means the user's self-reported clean execution of the final target.
- Validate the complete range before Start: `maxFirstDelay + correctionGap <= workMs - 500`. Prompt for a longer work interval or smaller timing settings when invalid; do not silently truncate corrections or make cue identity determine timing. A 3 s round with 2500 ms first-delay maximum and 800 ms correction gap is invalid.
- Chain: work ≥8 s, selected count 2 or 3; first offset and each following interval sample the shared delay range. Validate `cueCount * maxDelay <= workMs - 500` before Start. Three 2500 ms intervals fit an 8 s round exactly with the chosen margin. Store absolute offsets as well as derive interval gaps without ambiguity.
- For multi-cue modes apply anti-streak across generated movement cues in session order, including correction cues. Fake-out's different-second-cue constraint also applies. Do not count `Go` or repeat previews as movement selections. Replay later bypasses new random selection.
- Add a text-only stopping instruction shown in PREP (and rest as useful), e.g. “Stop within 2 strides” or “Cut and continue.” Persist it as session context; do not infer successful braking from it.

**Gate:** deterministic plans, preview timing, fit validation, multi-event pause/resume/cancellation, record fidelity and migration fixtures. Round data must already persist in Phase 3; Phase 4 adds athlete observations. Stop for approval.

## Phase 4 — Optional logging during REST

**Files:** `components/ActiveTimer.tsx`, `App.tsx`, `types.ts`, `store.ts`; proposed new `components/RestRepLog.tsx`, `components/SessionNotes.tsx`, `utils/repLogging.ts`, and `utils/repLogging.test.ts`; extend session-history/migration tests.

### M4.1 — Outcomes and external times

- REST shows large Clean / Wrong first step / Missed-stopped buttons for the just-completed round. One tap sets a result; another choice replaces it. Provide a clear action to return to Not logged. Untouched rounds remain explicitly unlogged, never auto-clean or failed.
- Bind edits to session ID and round ID, not the displayed upcoming round. At REST exit close input and reject late touches/draft commits for that round. The timer never waits; final REST allows logging the last round. For a legacy zero-rest round, leave it unlogged rather than adding an unrequested pause.
- Offer a skippable large decimal numeric pad. Store a finite positive value with an explicit unit (prefer integer milliseconds internally; display seconds). Label it self-entered/external time. Committing a time does not choose an outcome; blank/invalid input is never zero time.
- Test replacing/clearing outcomes, round boundaries, final REST, pause/resume, number validation and input drafts when the next WORK starts.

### M4.2 — Session notes and persistence

- Add optional finish-screen surface, energy 1–5, pain yes/no plus optional location, and free text. Validate bounded text lengths and optional fields without requiring completion.
- Update the already-saved completed session by ID; cancel/skip leaves it saved without notes. Prevent double taps from creating extra history rows.
- Extend round records with outcome and optional time; missing legacy fields mean unknown/not logged. New records retain drill type, condition, delivered cue sequence and offsets, stopping instruction and configuration snapshot. Migrate without fabricating observations.

**Gate:** one-handed rest entry, no WORK input or timer blocking, idempotent history updates, skip behavior and old-history compatibility. Stop for approval.

## Phase 5 — Statistics with explicit denominators

**Files:** `components/Statistics.tsx`, `utils/historyUtils.ts`; proposed new `utils/performanceStats.ts` and `utils/performanceStats.test.ts`. Keep all aggregation/math outside the component; reuse date-fns and react-native-svg for weekly charts.

### M5.1 — Define and test the math

- Clean percentage = clean / (clean + wrong-first-step + missed-stopped) × 100. Exclude Not logged; always show logged n, eligible total and logging coverage. Legacy records contribute to existing workout totals only.
- Default average time = mean of finite positive self-entered times on clean eligible reps; show its own timed n, distinct from outcome n. Do not combine times from unsuccessful reps into a performance average without an explicitly separate label/filter.
- Per-cue breakdown defaults to delivered single-target Planned/Reactive reps, including those within Alternating. Exclude Chain and Fake-out from this primary comparison; a chain has no one-cue outcome and a fake-out has a different task. Provide separate drill-filtered views if needed, with the population stated.
- Planned vs reactive: compare compatible single-target reps with matching cue, work/rest times, stopping instruction, and output mode. Support within-Alternating comparisons and compatible session/configuration groups; avoid blending different drills or timing protocols. Time gap = reactive mean − planned mean in seconds; clean gap = reactive percentage − planned percentage in percentage points. Show both underlying values and group counts.
- Group weeks by Monday-start local calendar dates using year-inclusive keys. Do not reuse day display labels as weekly aggregation keys. Missing weeks/gaps remain missing, not zero. Report descriptive comparisons, not proof of causation or measured reaction latency.
- Early/late proposal: reactive single-cue scheduled delays ≤900 ms are Early; ≥1500 ms are Late; 901–1499 ms are Middle and excluded from the two-way comparison. Display those boundaries, compare compatible groups, and use recorded event delays rather than today's settings or planned previews. Exclude skipped events; observed dispatch offsets can be shown separately as diagnostics.
- Fake-out success = clean logged rounds with a delivered correction / all logged rounds with a delivered correction. Exclude fake-out-mode rounds where no correction was selected or delivered; expose their counts separately. It is a self-reported result for following the final cue.
- Require **at least 5 eligible observations per group per metric** before showing a comparison/trend. For times use timed n, for percentages use logged n. Below that, show counts and “Not enough data yet.” Weekly gaps need sufficient data on both sides in each plotted week. Do not connect gaps as evidence of improvement.
- Test hand-calculated percentages/means/signs, empty/legacy/unlogged data, invalid times, four-versus-five thresholds, unequal group counts, multi-cue exclusions, delay boundary values, year/week boundaries and filters. Do not invent observations to populate charts.

### M5.2 — Display the evidence

- Retain workout count, calendar streak, total time and history. Add per-cue breakdown, weekly planned/reactive gaps, early/late comparison and fake-out success with sample sizes and coverage beside every metric.
- Give clear empty and insufficient-data states. Use existing drawing dependencies or simple accessible bars/text; no chart library by default. Keep selected filters and units visible.

**Gate:** fixture-verified math, honest populations, threshold states, readable native/web charts and migration compatibility. Stop for approval.

## Phase 6 — Presets, warm-up, progression and replay

**Files:** `components/TimerSetup.tsx`, `components/ActiveTimer.tsx`, `App.tsx`, `types.ts`, `store.ts`; proposed new `utils/sessionPresets.ts`, `utils/warmupPlan.ts`, `utils/progression.ts`, `utils/sessionReplay.ts`, and matching `.test.ts` files. Put editable warm-up text/durations in `data/warmup.ts`.

### M6.1 — Full presets and guided warm-up

- Save/name/apply full configurations: timer settings, enabled cues, drill type/options, delay range, weights, output mode, and stopping instruction. Give saved presets stable IDs and migrate them with their schema. Validate on save/apply without partially changing setup.
- Built-ins: Reactive cuts (Reactive/Mixed/Left+Right), Decel focus (Reactive/Mixed with greater Come Back weight), Planned baseline (Planned/equal weights). State all timer values and enabled pools in each preset; use existing defaults unless the drill needs longer WORK. Names are editable for user-created presets.
- Guided warm-up: approximately 8 minutes of timed text/voice steps for jog, skips, lateral shuffles, easy decelerations and build-up sprints. Keep copy/durations editable in one file. Support pause, resume, skip step and skip warm-up; follow output preferences and clear all warm-up cues on entering the workout.
- Keep warm-up separate from scored drill rounds and progression. If included in recorded duration, store its duration separately so existing configured training duration remains interpretable.

### M6.2 — Opt-in progression and exact replay

- Stages: 1 Planned+Early; 2 Reactive+Early; 3 Reactive+Late; 4 introduces Fake-outs. Stage 4 must select a valid work duration for the full correction schedule. Show current opted-in stage in setup; applying a suggested stage is a user action.
- Suggest advancing after three consecutive completed sessions at the current stage each have ≥80% clean logged reps. Proposed evidence floor per session: at least 5 logged reps and ≥80% logging coverage. This prevents one clean tap from qualifying an otherwise unlogged workout. Show why a session qualifies; never auto-advance. A nonqualifying current-stage session breaks the run; unrelated drills do not contribute. Exclude warm-ups and replays from automatic suggestions and test these rules.
- Replay uses stored configuration and ordered event offsets/labels/conditions, not a new seed or redraw. Use a new session ID and `replayOfSessionId`; never reuse prior outcomes, times or notes. Freeze copied configuration so applying a preset does not mutate saved replay data.
- Only complete usable plans can replay; old summary-only records show replay unavailable. Validate incompatible/corrupted plans and explain them without silently changing cues or timing. Preserve planned previews and fake-out/chain roles.
- Label replay as familiar/repeated exposure in history and statistics so it can be excluded from new reactive comparisons. Identical cue sequences improve repeatability but do not guarantee an identical experimental condition once memorized.

**Gate:** full preset round-trip, warm-up cancellation/skip tests, stage eligibility boundaries, exact event replay, old records and platform checks. Summarize completion and remaining asset/device limitations.

## Verification commands and evidence

Current baseline commands (already run during the plan review):

```sh
node --experimental-strip-types --test utils/intervalCuePlan.test.ts
npm run lint
./node_modules/.bin/tsc --noEmit
```

During Phase 1, establish one command covering **all** utility tests and keep it current. The existing Node runtime supports TypeScript stripping, but `TimerPhase` is an enum and existing extensionless runtime imports need attention when timer tests are added. Use explicit `.ts`/type-only imports in tested modules where needed and the Node transform-types flag for enums, or an isolated TypeScript compilation test path. Verify the chosen command instead of assuming a runner or adding a framework. A candidate to validate before adding as `npm test` is:

```sh
node --experimental-transform-types --test utils/*.test.ts
```

Phase-end checks after establishing the test script:

```sh
npm test
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

The build command performs web export and PWA generation; it does not verify native behavior. Inspect service-worker output and warnings because `build-pwa.js` currently logs generation errors rather than explicitly setting a failing exit status. For media phases, verify expected audio entries are cached and test offline playback. Report unsupported/unavailable device checks explicitly.

The phase handoff should contain: completed milestone IDs; changed files and behavior; actual test/lint/typecheck/build results; platforms tested; migration version and compatibility evidence; unresolved limitations; and the request for approval to begin the next phase. Do not start Phase 2 or later merely because Phase 1 tests pass.
