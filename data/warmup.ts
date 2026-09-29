import type { WarmupStep } from '../utils/warmupPlan.ts';

/**
 * Guided warm-up, about 8 minutes. Edit copy and durations here; each step
 * needs a unique id, a title and a whole-second duration of 5–600 s.
 * No equipment: distances are approximate and paced by feel.
 */
export const WARMUP_STEPS: WarmupStep[] = [
  {
    id: 'jog',
    title: 'Easy jog',
    instruction: 'Jog easily in a small loop or on the spot. Relaxed shoulders, easy breathing.',
    durationSeconds: 120,
  },
  {
    id: 'skips',
    title: 'Skips',
    instruction: 'Skip about 10 m and back. Drive the knee up and land softly.',
    durationSeconds: 90,
  },
  {
    id: 'shuffles',
    title: 'Lateral shuffles',
    instruction: 'Shuffle 5 m left, then 5 m right. Stay low; feet never cross.',
    durationSeconds: 90,
  },
  {
    id: 'decels',
    title: 'Easy decelerations',
    instruction: 'Jog 5 to 10 m, then stop in 2 or 3 short steps. Hips low, chest up.',
    durationSeconds: 90,
  },
  {
    id: 'build-ups',
    title: 'Build-up sprints',
    instruction: 'Run about 20 m, building to 80% speed. Walk back to recover.',
    durationSeconds: 90,
  },
];
