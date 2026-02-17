export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const calculateTotalTime = (config: {
  prepTime: number;
  workTime: number;
  restTime: number;
  rounds: number;
  coolDownTime: number;
}): number => {
  const workoutDuration = (config.workTime + config.restTime) * config.rounds;
  // Usually the last rest is included in standard interval timers, but sometimes it's skipped.
  // We will keep it simple: Prep + (Work+Rest)*Rounds + CoolDown
  return config.prepTime + workoutDuration + config.coolDownTime;
};
