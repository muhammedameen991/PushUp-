import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Dumbbell,
  Camera,
  Trash2,
  Download,
  Search,
  Filter,
  AlertTriangle,
  X,
  FileSpreadsheet
} from 'lucide-react';
import type { WorkoutSession } from '../types/index.ts';
import { exportHistoryToCSV } from '../utils/storage.ts';

interface HistoryViewProps {
  sessions: WorkoutSession[];
  onDeleteSession: (sessionId: string) => void;
  onClearAllHistory: () => void;
  onStartWorkout: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onDeleteSession,
  onClearAllHistory,
  onStartWorkout,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'ai' | 'manual'>('all');
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutSession | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);

  // Filter and search
  const filteredSessions = sessions.filter((s) => {
    const matchesMode = filterMode === 'all' || s.mode === filterMode;
    const matchesSearch =
      searchQuery.trim() === '' ||
      s.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMode && matchesSearch;
  });

  // Calculate daily totals map
  const dailyTotals = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.date] = (acc[s.date] || 0) + s.reps;
    return acc;
  }, {});

  const handleDownloadCSV = () => {
    const csvContent = exportHistoryToCSV(sessions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pushup_workout_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 space-y-6">
      {/* Header & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-charcoal">Workout History</h1>
          <p className="text-xs text-charcoal-secondary mt-0.5">
            {sessions.length} total completed {sessions.length === 1 ? 'session' : 'sessions'} recorded
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
                title="Download CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-terracotta" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setShowClearAllModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      {sessions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Search by date or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-soft-stone bg-pure-white text-xs text-charcoal focus:outline-hidden focus:border-terracotta"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-pure-white border border-soft-stone">
            {(['all', 'ai', 'manual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  filterMode === m
                    ? 'bg-terracotta text-white shadow-xs'
                    : 'text-charcoal-secondary hover:text-charcoal'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-warm-ivory text-charcoal-muted flex items-center justify-center mx-auto border border-soft-stone">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-charcoal">No workout history yet</h3>
          <p className="text-xs text-charcoal-secondary max-w-sm mx-auto">
            Your completed workouts will appear here automatically with duration, rep count, and daily totals.
          </p>
          <div className="pt-2">
            <button
              onClick={onStartWorkout}
              className="px-5 py-2.5 rounded-xl bg-terracotta text-white text-xs font-semibold hover:opacity-90 transition"
            >
              Start First Workout
            </button>
          </div>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-pure-white border border-soft-stone text-xs text-charcoal-secondary">
          No workouts match your current filter criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 rounded-2xl bg-pure-white border border-soft-stone shadow-card hover:border-terracotta/40 transition group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Left: Reps & Method */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      s.mode === 'ai'
                        ? 'bg-terracotta/10 text-terracotta'
                        : 'bg-stone-200 dark:bg-stone-800 text-charcoal'
                    }`}
                  >
                    {s.mode === 'ai' ? <Camera className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-charcoal">{s.reps} Reps</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-warm-ivory border border-soft-stone text-charcoal-secondary uppercase">
                        {s.mode}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-muted mt-0.5">
                      <span className="font-medium text-charcoal-secondary">{s.date}</span>
                      {s.startTime && <span>{s.startTime}</span>}
                      {s.durationSeconds > 0 && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-terracotta" />
                          <span>
                            {Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Daily total badge & Delete Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-soft-stone">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-semibold text-charcoal-muted uppercase block">
                      Day Total
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      {dailyTotals[s.date] || s.reps} reps
                    </span>
                  </div>

                  <button
                    onClick={() => setSessionToDelete(s)}
                    className="p-2 rounded-xl text-charcoal-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                    aria-label={`Delete workout from ${s.date}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notes if present */}
              {s.notes && (
                <div className="mt-3 pt-3 border-t border-soft-stone text-xs text-charcoal-secondary italic">
                  "{s.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Delete Single Session Confirmation */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-floating dark:bg-[#282825] border border-soft-stone space-y-3">
            <h3 className="text-sm font-bold text-charcoal">Delete Workout Session?</h3>
            <p className="text-xs text-charcoal-secondary leading-relaxed">
              Are you sure you want to delete this {sessionToDelete.reps}-rep workout from{' '}
              {sessionToDelete.date}? This cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Clear All History Confirmation */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-floating dark:bg-[#282825] border border-soft-stone space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-charcoal">Clear All Workout History?</h3>
            <p className="text-xs text-charcoal-secondary leading-relaxed">
              This will permanently delete all {sessions.length} recorded workout sessions from your browser storage.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2 rounded-xl border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Keep History
              </button>
              <button
                onClick={() => {
                  onClearAllHistory();
                  setShowClearAllModal(false);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
