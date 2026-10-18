import React from 'react';
import {
  Flame,
  Trophy,
  Dumbbell,
  Target,
  ArrowRight,
  Sparkles,
  Camera,
  Activity,
  PlusCircle,
  Calendar,
  Clock
} from 'lucide-react';
import type { UserSettings, WorkoutSession } from '../types/index.ts';
import {
  calculateCurrentStreak,
  calculatePersonalBest,
  calculateTodayReps,
  calculateTotalLifetimeReps,
  calculateTotalWorkouts,
} from '../utils/statistics.ts';

interface DashboardViewProps {
  sessions: WorkoutSession[];
  settings: UserSettings;
  onStartWorkout: (mode: 'ai' | 'manual') => void;
  onNavigateTab: (tab: 'workout' | 'biomechanics' | 'history' | 'progress' | 'settings') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  settings,
  onStartWorkout,
  onNavigateTab,
}) => {
  const todayReps = calculateTodayReps(sessions);
  const dailyGoal = settings.dailyGoal || 50;
  const progressPercent = Math.min(100, Math.round((todayReps / dailyGoal) * 100));
  const currentStreak = calculateCurrentStreak(sessions);
  const personalBest = calculatePersonalBest(sessions);
  const totalReps = calculateTotalLifetimeReps(sessions);
  const totalWorkouts = calculateTotalWorkouts(sessions);
  const recentSessions = sessions.slice(0, 4);

  // Formatted date
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Hero Welcome & Quick Action Card */}
      <div className="relative overflow-hidden rounded-2xl bg-pure-white border border-soft-stone p-6 sm:p-8 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-terracotta">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">
              {todayReps >= dailyGoal
                ? 'Daily Goal Crushed! 🎉'
                : todayReps > 0
                ? 'Great progress today. Keep pushing!'
                : 'Ready for your reps?'}
            </h1>
            <p className="mt-1 text-sm text-charcoal-secondary max-w-lg">
              Consistency is everything. Whether you do 5 or 50, every rep builds strength and habits.
            </p>
          </div>

          {/* Quick Start Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onStartWorkout('ai')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-terracotta text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-95 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Camera Workout</span>
            </button>
            <button
              onClick={() => onStartWorkout('manual')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-soft-stone bg-warm-ivory text-charcoal font-semibold text-sm hover:bg-stone-200 dark:hover:bg-stone-800 active:scale-95 transition"
            >
              <PlusCircle className="w-4 h-4 text-terracotta" />
              <span>Manual Counter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Goal Card & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Goal & Progress */}
        <div className="md:col-span-2 rounded-2xl bg-pure-white border border-soft-stone p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-terracotta/10 text-terracotta flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-charcoal">Daily Repetition Goal</h2>
                <p className="text-xs text-charcoal-secondary">
                  Target: <strong>{dailyGoal}</strong> reps
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('settings')}
              className="text-xs font-semibold text-terracotta hover:underline"
            >
              Adjust Goal
            </button>
          </div>

          {/* Large Counter Display */}
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-4xl sm:text-5xl font-black text-charcoal tracking-tight">
              {todayReps}
            </span>
            <span className="text-base font-semibold text-charcoal-muted">
              / {dailyGoal} reps
            </span>
            <span className="ml-auto text-sm font-bold text-terracotta">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-soft-stone overflow-hidden">
            <div
              className="h-full rounded-full bg-terracotta transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-charcoal-secondary pt-1">
            <span>{todayReps >= dailyGoal ? 'Goal completed! You can still do bonus reps.' : `${dailyGoal - todayReps} reps remaining`}</span>
            {currentStreak > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span>{currentStreak} Day Streak!</span>
              </span>
            )}
          </div>
        </div>

        {/* 3D Biomechanics Teaser */}
        <div className="rounded-2xl bg-pure-white border border-soft-stone p-6 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-terracotta text-xs font-bold uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>Three.js Biomechanics</span>
            </div>
            <h2 className="mt-1 text-base font-bold text-charcoal">3D Form & Angle Lab</h2>
            <p className="mt-1 text-xs text-charcoal-secondary leading-relaxed">
              Inspect optimal 45° elbow flare, spine plank posture, and joint angles on our interactive 3D mannequin.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('biomechanics')}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:border-terracotta transition group"
          >
            <span>Open 3D Visualizer</span>
            <ArrowRight className="w-4 h-4 text-terracotta group-hover:translate-x-1 transition" />
          </button>
        </div>
      </div>

      {/* 4 Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="rounded-2xl bg-pure-white border border-soft-stone p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-secondary">Current Streak</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-charcoal">
            {currentStreak} <span className="text-xs font-normal text-charcoal-muted">days</span>
          </p>
        </div>

        {/* Personal Best */}
        <div className="rounded-2xl bg-pure-white border border-soft-stone p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-secondary">Personal Best</span>
            <div className="p-2 rounded-lg bg-terracotta/10 text-terracotta">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-charcoal">
            {personalBest} <span className="text-xs font-normal text-charcoal-muted">reps</span>
          </p>
        </div>

        {/* Total Lifetime Reps */}
        <div className="rounded-2xl bg-pure-white border border-soft-stone p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-secondary">Lifetime Reps</span>
            <div className="p-2 rounded-lg bg-stone-200 dark:bg-stone-800 text-charcoal">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-charcoal">
            {totalReps} <span className="text-xs font-normal text-charcoal-muted">reps</span>
          </p>
        </div>

        {/* Total Workouts */}
        <div className="rounded-2xl bg-pure-white border border-soft-stone p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-secondary">Total Workouts</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-charcoal">
            {totalWorkouts} <span className="text-xs font-normal text-charcoal-muted">sessions</span>
          </p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="rounded-2xl bg-pure-white border border-soft-stone p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-charcoal">Recent Workouts</h2>
          {sessions.length > 0 && (
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-terracotta hover:underline flex items-center gap-1"
            >
              <span>View All ({sessions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-warm-ivory text-charcoal-muted flex items-center justify-center mx-auto border border-soft-stone">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-charcoal">No workouts recorded yet</h3>
            <p className="text-xs text-charcoal-secondary max-w-sm mx-auto">
              Ready to log your first session? Start with the Camera Tracker or quick Manual Counter.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onStartWorkout('manual')}
                className="px-4 py-2 rounded-xl bg-terracotta text-white text-xs font-semibold hover:opacity-90 transition"
              >
                Log First Push-Up Session
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-soft-stone">
            {recentSessions.map((s) => (
              <div key={s.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      s.mode === 'ai'
                        ? 'bg-terracotta/10 text-terracotta'
                        : 'bg-stone-200 dark:bg-stone-800 text-charcoal'
                    }`}
                  >
                    {s.mode === 'ai' ? <Camera className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-charcoal">{s.reps} Push-Ups</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-soft-stone text-charcoal-secondary uppercase">
                        {s.mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-charcoal-muted mt-0.5">
                      <span>{s.date}</span>
                      {s.startTime && <span>{s.startTime}</span>}
                      {s.durationSeconds > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {s.notes && (
                  <span className="hidden sm:block text-xs text-charcoal-secondary italic truncate max-w-xs">
                    "{s.notes}"
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
