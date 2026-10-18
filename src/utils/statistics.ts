import type { Achievement, UserSettings, WorkoutSession } from '../types/index.ts';

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateTodayReps(sessions: WorkoutSession[], now: Date = new Date()): number {
  const todayStr = getLocalDateString(now);
  return sessions
    .filter((s) => s.date === todayStr)
    .reduce((sum, s) => sum + s.reps, 0);
}

export function calculateTotalLifetimeReps(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, s) => sum + s.reps, 0);
}

export function calculateTotalWorkouts(sessions: WorkoutSession[]): number {
  return sessions.length;
}

export function calculatePersonalBest(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  return Math.max(...sessions.map((s) => s.reps));
}

export function calculateAverageCadence(sessions: WorkoutSession[]): number {
  const sessionsWithCadence = sessions.filter((s) => s.durationSeconds > 10 && s.reps > 0);
  if (sessionsWithCadence.length === 0) return 0;
  const totalRpm = sessionsWithCadence.reduce((sum, s) => {
    const rpm = (s.reps / s.durationSeconds) * 60;
    return sum + rpm;
  }, 0);
  return Math.round(totalRpm / sessionsWithCadence.length);
}

/**
 * Calculates current streak of consecutive days with at least 1 completed push-up.
 * Considers yesterday or today as valid starting anchor.
 */
export function calculateCurrentStreak(sessions: WorkoutSession[], now: Date = new Date()): number {
  if (sessions.length === 0) return 0;

  // Extract unique active dates
  const activeDates = new Set(sessions.filter((s) => s.reps > 0).map((s) => s.date));
  if (activeDates.size === 0) return 0;

  const todayStr = getLocalDateString(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // If neither today nor yesterday has a workout, streak is 0
  let checkDate = new Date(now);
  if (!activeDates.has(todayStr)) {
    if (!activeDates.has(yesterdayStr)) {
      return 0;
    }
    // Start counting back from yesterday
    checkDate = yesterday;
  }

  let streak = 0;
  while (true) {
    const dateStr = getLocalDateString(checkDate);
    if (activeDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateBestStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const uniqueDates = Array.from(new Set(sessions.filter((s) => s.reps > 0).map((s) => s.date))).sort();
  if (uniqueDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + 'T00:00:00');
    const curr = new Date(uniqueDates[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

export interface DayData {
  date: string;
  dayLabel: string;
  shortDate: string;
  reps: number;
  goal: number;
  isToday: boolean;
}

/**
 * Returns last 7 days of repetition data up to and including 'now'
 */
export function calculateLast7Days(
  sessions: WorkoutSession[],
  dailyGoal: number,
  now: Date = new Date()
): DayData[] {
  const result: DayData[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const repsForDay = sessions
      .filter((s) => s.date === dateStr)
      .reduce((sum, s) => sum + s.reps, 0);

    result.push({
      date: dateStr,
      dayLabel: dayNames[d.getDay()],
      shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
      reps: repsForDay,
      goal: dailyGoal,
      isToday: i === 0,
    });
  }

  return result;
}

/**
 * Weekly repetition totals for the last 4 weeks
 */
export function calculateWeeklyTotals(
  sessions: WorkoutSession[],
  now: Date = new Date()
): { weekLabel: string; reps: number; startDate: string; endDate: string }[] {
  const weeks = [];

  for (let w = 3; w >= 0; w--) {
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const startStr = getLocalDateString(start);
    const endStr = getLocalDateString(end);

    const reps = sessions
      .filter((s) => s.date >= startStr && s.date <= endStr)
      .reduce((sum, s) => sum + s.reps, 0);

    weeks.push({
      weekLabel: w === 0 ? 'This Week' : `${w}w ago`,
      reps,
      startDate: `${start.getMonth() + 1}/${start.getDate()}`,
      endDate: `${end.getMonth() + 1}/${end.getDate()}`,
    });
  }

  return weeks;
}

export const ALL_ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first_rep',
    title: 'First Rep',
    description: 'Complete your first push-up workout session.',
    icon: 'Flame',
    target: 1,
    check: (s: WorkoutSession[]) => s.length >= 1,
    progress: (s: WorkoutSession[]) => Math.min(1, s.length),
  },
  {
    id: 'high_five',
    title: 'High Five',
    description: 'Complete 5 recorded workout sessions.',
    icon: 'Hand',
    target: 5,
    check: (s: WorkoutSession[]) => s.length >= 5,
    progress: (s: WorkoutSession[]) => Math.min(5, s.length),
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Surpass 100 total lifetime push-ups.',
    icon: 'Trophy',
    target: 100,
    check: (s: WorkoutSession[]) => calculateTotalLifetimeReps(s) >= 100,
    progress: (s: WorkoutSession[]) => Math.min(100, calculateTotalLifetimeReps(s)),
  },
  {
    id: 'iron_chest',
    title: 'Iron Chest',
    description: 'Surpass 500 total lifetime push-ups.',
    icon: 'Shield',
    target: 500,
    check: (s: WorkoutSession[]) => calculateTotalLifetimeReps(s) >= 500,
    progress: (s: WorkoutSession[]) => Math.min(500, calculateTotalLifetimeReps(s)),
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Reach 1,000 lifetime repetitions.',
    icon: 'Crown',
    target: 1000,
    check: (s: WorkoutSession[]) => calculateTotalLifetimeReps(s) >= 1000,
    progress: (s: WorkoutSession[]) => Math.min(1000, calculateTotalLifetimeReps(s)),
  },
  {
    id: 'single_session_30',
    title: 'Session Surge',
    description: 'Crush 30+ push-ups in a single workout.',
    icon: 'Zap',
    target: 30,
    check: (s: WorkoutSession[]) => calculatePersonalBest(s) >= 30,
    progress: (s: WorkoutSession[]) => Math.min(30, calculatePersonalBest(s)),
  },
  {
    id: 'session_master_50',
    title: 'Power Session',
    description: 'Crush 50+ push-ups in a single workout.',
    icon: 'Medal',
    target: 50,
    check: (s: WorkoutSession[]) => calculatePersonalBest(s) >= 50,
    progress: (s: WorkoutSession[]) => Math.min(50, calculatePersonalBest(s)),
  },
  {
    id: 'streak_3',
    title: 'Consistency Spark',
    description: 'Maintain a 3-day workout streak.',
    icon: 'FlameKindling',
    target: 3,
    check: (s: WorkoutSession[], now?: Date) => calculateCurrentStreak(s, now) >= 3 || calculateBestStreak(s) >= 3,
    progress: (s: WorkoutSession[], now?: Date) => Math.min(3, Math.max(calculateCurrentStreak(s, now), calculateBestStreak(s))),
  },
  {
    id: 'streak_7',
    title: 'Relentless Habit',
    description: 'Maintain a full 7-day workout streak.',
    icon: 'Sparkles',
    target: 7,
    check: (s: WorkoutSession[], now?: Date) => calculateCurrentStreak(s, now) >= 7 || calculateBestStreak(s) >= 7,
    progress: (s: WorkoutSession[], now?: Date) => Math.min(7, Math.max(calculateCurrentStreak(s, now), calculateBestStreak(s))),
  },
  {
    id: 'ai_pioneer',
    title: 'Computer Vision Hero',
    description: 'Complete a workout using camera pose detection.',
    icon: 'Camera',
    target: 1,
    check: (s: WorkoutSession[]) => s.some((item) => item.mode === 'ai' && item.reps > 0),
    progress: (s: WorkoutSession[]) => s.some((item) => item.mode === 'ai' && item.reps > 0) ? 1 : 0,
  },
];

export function checkAchievements(
  sessions: WorkoutSession[],
  _settings?: UserSettings,
  now: Date = new Date()
): Achievement[] {
  return ALL_ACHIEVEMENT_DEFINITIONS.map((def) => {
    const isUnlocked = def.check(sessions, now);
    const prog = def.progress(sessions, now);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlocked: isUnlocked,
      progress: prog,
      target: def.target,
      unlockedAt: isUnlocked ? 'Unlocked' : undefined,
    };
  });
}
