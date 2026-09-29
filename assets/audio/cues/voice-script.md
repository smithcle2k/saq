# Spoken cue recording script

The app says nine distinct phrases in total. Only **five** of them (the reaction cues) are wired up to play as recorded clips — those are listed in Part 1. The other **four** are structural/phase announcements that always use on-device text-to-speech (Part 2); recording them is optional future work, not required for the app to function, since `utils/cueAudioAssets.ts` currently only has slots for the five cue words.

"Stop" is not spoken by the app at all. A stopping instruction like "Stop within 2 strides" is text shown on screen only (`components/ActiveTimer.tsx`) — it's never sent to TTS or a recorded clip.

## Part 1 — Recorded clips (record these now)

These are the only five words `utils/cueAudioAssets.ts` currently has slots for. Record each as its own file, matching perceived loudness across all five so none jumps out during a session.

| #   | File name       | Say exactly | Pace                                                    | Notes                                                                                                                                                                                                                                 |
| --- | --------------- | ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `go.wav`        | "Go"        | Fast, clipped, energetic — like a starter's gun         | WORK-entry signal; every round starts with it. Urgent, not conversational.                                                                                                                                                            |
| 2   | `left.wav`      | "Left"      | Fast, sharp, one syllable, urgent                       | Reaction cue, spoken mid-sprint at random delays of 100 ms–2.5 s into WORK. Must be instantly intelligible, not drawn out.                                                                                                            |
| 3   | `right.wav`     | "Right"     | Fast, sharp, one syllable, urgent                       | Same treatment as "Left" — match length/intensity closely so neither cue has a timing advantage.                                                                                                                                      |
| 4   | `run.wav`       | "Run"       | Fast, sharp, one syllable, urgent                       | Same treatment as "Left"/"Right".                                                                                                                                                                                                     |
| 5   | `come-back.wav` | "Come Back" | Fast but clearly two words — don't slur into "comeback" | Slightly longer than the single-word cues; keep it as tight as possible while still distinguishing the two words at speed. Also used as the fake-out **correction** cue — same recording, no separate "change direction" clip exists. |

## Part 2 — Structural announcements (still live TTS; not required, but here if you want them recorded later)

These currently always play through the phone's TTS engine (`speakCue(...)` in `components/ActiveTimer.tsx` / `utils/timerEngine.ts`), regardless of output mode, whenever voice is enabled. There is no code path today that would play a recorded clip for any of these — adding that would mean extending `cueAudioAssets.ts` with new slots, which hasn't been done.

| #   | File name (if recorded later) | Say exactly        | Pace                                       | When it's said                                                             |
| --- | ----------------------------- | ------------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| 6   | `get-ready.wav`               | "Get ready"        | Calm, normal conversational pace           | Once, right when PREP starts                                               |
| 7   | `rest.wav`                    | "Rest"             | Calm, normal pace                          | Every time REST starts                                                     |
| 8   | `five-seconds.wav`            | "5 Seconds"        | Normal pace, slightly crisp/countdown-like | Once per REST, when 5 s remain                                             |
| 9   | `cool-down.wav`               | "Cool down"        | Calm, normal pace                          | Once, when an optional cool-down phase starts (only if cool-down time > 0) |
| —   | `workout-complete.wav`        | "Workout complete" | Calm, upbeat, normal pace                  | Once, when the workout finishes                                            |

These don't need the same urgency as the five reaction cues — they're not time-critical mid-sprint signals, just status announcements. If you don't record these, leave them alone; TTS already handles them and nothing breaks.

## General recording requirements (Part 1, required now)

- PCM WAV, mono, 16-bit, 44.1 kHz.
- Trim leading/trailing silence tightly — these play back-to-back with "Go" and need minimal latency.
- No clipping.
- Match perceived loudness across all five clips (use a loudness meter, not just peak level, so "Come Back" doesn't sound quieter for being longer).
- Tone: an urgent, coach-style shout a solo athlete can react to a few meters away — not a calm assistant voice. Same voice/character across all five so cues feel like one consistent system.
- No numeric TTS speech rate applies here — these are pre-recorded, not machine-spoken at a set rate. Match the "fast, urgent" pacing described per word instead.

## Where to put the files

Drop the finished Part 1 files directly in this folder (`assets/audio/cues/`) using the exact file names above. They are not wired into the build yet — static imports need to be added to `utils/cueAudioAssets.ts` once the files exist, since Metro requires bundled assets to exist at build time.
