import React from 'react';
import {
  TrendingUp,
  Award,
  Flame,
  Trophy,
  Dumbbell,
  Calendar,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap
} from 'lucide-react';
import type { UserSettings, WorkoutSession } from '../types/index.ts';
import {
  calculateAverageCadence,
  calculateBestStreak,
  calculateCurrentStreak,
  calculateLast7Days,
  calculatePersonalBest,
  calculateTotalLifetimeReps,
  calculateTotalWorkouts,
  calculateWeeklyTotals,
  checkAchievements,
} from '../utils/statistics.ts';

interface ProgressViewProps {
  sessions: WorkoutSession[];
  settings: UserSettings;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ sessions, settings }) => {
  const dailyGoal = settings.dailyGoal || 50;
  const last7Days = calculateLast7Days(sessions, dailyGoal);
  const weeklyTotals = calculateWeeklyTotals(sessions);
  const currentStreak = calculateCurrentStreak(sessions);
  const bestStreak = calculateBestStreak(sessions);
  const lifetimeReps = calculateTotalLifetimeReps(sessions);
  const personalBest = calculatePersonalBest(sessions);
  const totalWorkouts = calculateTotalWorkouts(sessions);
  const avgCadence = calculateAverageCadence(sessions);
  const achievements = checkAchievements(sessions, settings);

  // Maximum value for SVG chart scaling
  const maxRepsIn7Days = Math.max(dailyGoal, ...last7Days.map((d) => d.reps), 20);

  // Consistency calculation: active days in past 30 days
  const now = new Date();
  const past30Str = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const uniqueActiveDaysPast30 = new Set(
    sessions.filter((s) => s.date >= past30Str && s.reps > 0).map((s) => s.date)
  ).size;
  const consistencyPercent = Math.round((uniqueActiveDaysPast30 / 30) * 100);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 space-y-6">
      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-terracotta">
              <TrendingUp className="w-4 h-4" />
              <span>Progress & Analytics</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-charcoal">Strength Trajectory</h1>
            <p className="mt-1 text-xs text-charcoal-secondary max-w-md">
              Real-time analytics computed strictly from your locally stored workouts.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warm-ivory border border-soft-stone text-center">
              <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Streak</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4" />
                <span>{currentStreak}d</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-warm-ivory border border-soft-stone text-center">
              <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Badges</span>
              <span className="text-xl font-black text-terracotta flex items-center justify-center gap-1">
                <Award className="w-4 h-4" />
                <span>{unlockedCount}/{achievements.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG 7-Day Repetition Bar Chart */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-charcoal">Daily Repetitions (Last 7 Days)</h2>
            <p className="text-xs text-charcoal-secondary">
              Dotted line indicates your daily target of {dailyGoal} reps
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-charcoal-muted">
            Max: {maxRepsIn7Days} reps
          </span>
        </div>

        {/* Responsive Accessible SVG Chart */}
        <div className="w-full pt-4">
          <svg
            viewBox="0 0 560 220"
            className="w-full h-48 sm:h-56 overflow-visible select-none"
            role="img"
            aria-label="Bar chart showing push-ups per day for the last 7 days"
          >
            {/* Horizontal Grid lines */}
            <line x1="40" y1="30" x2="540" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1="40" y1="90" x2="540" y2="90" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1="40" y1="150" x2="540" y2="150" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />

            {/* Target Goal Reference Line */}
            {(() => {
              const goalY = 170 - (dailyGoal / maxRepsIn7Days) * 140;
              return (
                <g>
                  <line
                    x1="40"
                    y1={goalY}
                    x2="540"
                    y2={goalY}
                    stroke="#C5684D"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeOpacity="0.8"
                  />
                  <text x="542" y={goalY + 3} fill="#C5684D" fontSize="9" fontWeight="bold">
                    Goal ({dailyGoal})
                  </text>
                </g>
              );
            })()}

            {/* Bars */}
            {last7Days.map((day, index) => {
              const barWidth = 34;
              const xPos = 65 + index * 68;
              const barHeight = maxRepsIn7Days > 0 ? (day.reps / maxRepsIn7Days) * 140 : 0;
              const yPos = 170 - barHeight;
              const isGoalMet = day.reps >= day.goal && day.reps > 0;

              return (
                <g key={day.date} className="group">
                  {/* Subtle bar background slot */}
                  <rect
                    x={xPos}
                    y={30}
                    width={barWidth}
                    height={140}
                    rx="8"
                    fill="currentColor"
                    fillOpacity="0.03"
                  />

                  {/* Active Bar */}
                  {day.reps > 0 && (
                    <rect
                      x={xPos}
                      y={yPos}
                      width={barWidth}
                      height={Math.max(6, barHeight)}
                      rx="8"
                      fill={isGoalMet ? '#C5684D' : '#9E9C96'}
                      className="transition-all duration-300 group-hover:opacity-90"
                    />
                  )}

                  {/* Reps count on top of bar */}
                  <text
                    x={xPos + barWidth / 2}
                    y={Math.max(22, yPos - 6)}
                    textAnchor="middle"
                    fill={day.reps > 0 ? 'currentColor' : '#9E9C96'}
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {day.reps}
                  </text>

                  {/* Day label on bottom */}
                  <text
                    x={xPos + barWidth / 2}
                    y="190"
                    textAnchor="middle"
                    fill={day.isToday ? '#C5684D' : 'currentColor'}
                    fontSize="11"
                    fontWeight={day.isToday ? 'bold' : 'normal'}
                  >
                    {day.dayLabel}
                  </text>

                  {/* Short date */}
                  <text
                    x={xPos + barWidth / 2}
                    y="204"
                    textAnchor="middle"
                    fill="#9E9C96"
                    fontSize="9"
                  >
                    {day.shortDate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Lifetime Stats & Consistency Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-pure-white border border-soft-stone shadow-subtle">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Lifetime Reps</span>
          <p className="mt-1 text-2xl font-black text-charcoal">{lifetimeReps}</p>
          <span className="text-[11px] text-charcoal-secondary">Across {totalWorkouts} workouts</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-pure-white border border-soft-stone shadow-subtle">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Personal Record</span>
          <p className="mt-1 text-2xl font-black text-charcoal">{personalBest}</p>
          <span className="text-[11px] text-charcoal-secondary">Most in one session</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-pure-white border border-soft-stone shadow-subtle">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Longest Streak</span>
          <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{bestStreak}d</p>
          <span className="text-[11px] text-charcoal-secondary">Consecutive days</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-pure-white border border-soft-stone shadow-subtle">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase block">30-Day Consistency</span>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{consistencyPercent}%</p>
          <span className="text-[11px] text-charcoal-secondary">{uniqueActiveDaysPast30} active days</span>
        </div>
      </div>

      {/* Weekly Totals */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-4">
        <h2 className="text-base font-bold text-charcoal">Weekly Performance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {weeklyTotals.map((w) => (
            <div key={w.weekLabel} className="p-3.5 rounded-xl bg-warm-ivory border border-soft-stone text-center">
              <span className="text-[10px] font-bold text-charcoal-muted uppercase block">{w.weekLabel}</span>
              <p className="text-xl font-black text-charcoal mt-1">{w.reps}</p>
              <span className="text-[10px] text-charcoal-secondary block mt-0.5">
                {w.startDate} - {w.endDate}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Local Achievements & Milestones */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-charcoal">Milestones & Achievements</h2>
            <p className="text-xs text-charcoal-secondary">
              Earned solely through verified workout sessions on this device
            </p>
          </div>
          <span className="text-xs font-bold text-terracotta">
            {unlockedCount} of {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {achievements.map((ach) => {
            const pct = Math.min(100, Math.round((ach.progress / ach.target) * 100));

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-all ${
                  ach.unlocked
                    ? 'bg-warm-ivory border-terracotta/40 shadow-xs'
                    : 'bg-pure-white border-soft-stone opacity-70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      ach.unlocked
                        ? 'bg-terracotta text-white shadow-xs'
                        : 'bg-soft-stone text-charcoal-muted'
                    }`}
                  >
                    {ach.unlocked ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-charcoal truncate">{ach.title}</h3>
                      {ach.unlocked && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Unlocked</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-charcoal-secondary mt-0.5 leading-snug">
                      {ach.description}
                    </p>

                    {/* Progress track */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-soft-stone overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            ach.unlocked ? 'bg-terracotta' : 'bg-charcoal-muted'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-charcoal-muted">
                        {ach.progress}/{ach.target}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
