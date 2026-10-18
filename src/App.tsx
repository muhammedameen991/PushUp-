import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { WorkoutActiveView } from './components/WorkoutActiveView.tsx';
import { BiomechanicsScene } from './components/BiomechanicsScene.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import type { UserSettings, WorkoutMode, WorkoutSession } from './types/index.ts';
import {
  addSession,
  clearAllData,
  clearAllSessions,
  deleteSession,
  loadSessions,
  loadSettings,
  saveSettings,
} from './utils/storage.ts';

export default function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => loadSessions());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('ai');
  const [hasActiveWorkout, setHasActiveWorkout] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = loadSettings().theme;
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Check URL query parameters for test automation (autostart)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');
    const tab = params.get('tab') as NavTab;

    if (autostart === '1') {
      setWorkoutMode('manual');
      setHasActiveWorkout(true);
      setActiveTab('workout');
    } else if (tab && ['dashboard', 'workout', 'biomechanics', 'history', 'progress', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Sync theme with HTML class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    const updated: UserSettings = {
      ...settings,
      theme: nextDark ? 'dark' : 'light',
    };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleStartWorkout = (mode: WorkoutMode = 'ai') => {
    setWorkoutMode(mode);
    setHasActiveWorkout(true);
    setActiveTab('workout');
  };

  const handleSaveSession = (newSession: WorkoutSession) => {
    const updated = addSession(newSession);
    setSessions(updated);
    setHasActiveWorkout(false);
    setActiveTab('dashboard');
  };

  const handleCancelWorkout = () => {
    setHasActiveWorkout(false);
    setActiveTab('dashboard');
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteSession(sessionId);
    setSessions(updated);
  };

  const handleClearAllHistory = () => {
    clearAllSessions();
    setSessions([]);
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleImportBackup = (
    importedSessions: WorkoutSession[],
    importedSettings?: UserSettings
  ) => {
    setSessions(importedSessions);
    if (importedSettings) {
      setSettings(importedSettings);
      if (importedSettings.theme) {
        setIsDarkMode(importedSettings.theme === 'dark');
      }
    }
  };

  const handleClearAllData = () => {
    clearAllData();
    setSessions([]);
    const defaultSet = loadSettings();
    setSettings(defaultSet);
    setIsDarkMode(defaultSet.theme === 'dark');
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-warm-ivory text-charcoal transition-colors selection:bg-terracotta/20 selection:text-terracotta">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'workout' && !hasActiveWorkout) {
            handleStartWorkout('manual');
          } else {
            setActiveTab(tab);
          }
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        hasActiveWorkout={hasActiveWorkout}
      />

      {/* Main Content Area */}
      <main className="transition-opacity duration-200">
        {activeTab === 'dashboard' && (
          <DashboardView
            sessions={sessions}
            settings={settings}
            onStartWorkout={handleStartWorkout}
            onNavigateTab={(tab) => {
              if (tab === 'workout') {
                handleStartWorkout('ai');
              } else {
                setActiveTab(tab);
              }
            }}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutActiveView
            initialMode={workoutMode}
            settings={settings}
            onSaveSession={handleSaveSession}
            onCancelWorkout={handleCancelWorkout}
          />
        )}

        {activeTab === 'biomechanics' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 space-y-4">
            <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card">
              <h1 className="text-xl sm:text-2xl font-extrabold text-charcoal">
                3D Biomechanics & Push-Up Posture Lab
              </h1>
              <p className="text-xs text-charcoal-secondary mt-1 max-w-2xl leading-relaxed">
                Study the anatomy of the perfect push-up. Drag the phase slider or click play to scrub
                through repetitions. Inspect joint angles, test 45° vs 90° elbow flare, and rotate
                the camera in full 3D space.
              </p>
            </div>

            <BiomechanicsScene darkMode={isDarkMode} />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView
            sessions={sessions}
            onDeleteSession={handleDeleteSession}
            onClearAllHistory={handleClearAllHistory}
            onStartWorkout={() => handleStartWorkout('manual')}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressView sessions={sessions} settings={settings} />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            sessions={sessions}
            onUpdateSettings={handleUpdateSettings}
            onImportBackup={handleImportBackup}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Footer with Developer Credits */}
      <footer className="mt-12 py-6 border-t border-soft-stone bg-pure-white/50 dark:bg-[#282825]/50 pb-20 md:pb-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-secondary">
          <div className="flex items-center gap-2">
            <span className="font-bold text-charcoal">PushUp</span>
            <span>•</span>
            <span>Small reps. Big progress.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Developed by</span>
            <a
              href="https://iamameen.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-terracotta hover:underline inline-flex items-center gap-1 group"
            >
              <span>Ameen</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </a>
          </div>
        </div>
      </footer>

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
