import React, { useRef, useState } from 'react';
import {
  Settings as SettingsIcon,
  Target,
  Sliders,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import type { UserSettings, WorkoutSession } from '../types/index.ts';
import { DEFAULT_AI_SETTINGS } from '../utils/repCounter.ts';
import {
  exportDataToJSON,
  exportHistoryToCSV,
  importDataFromJSON,
} from '../utils/storage.ts';
import { sounds } from '../utils/audio.ts';

interface SettingsViewProps {
  settings: UserSettings;
  sessions: WorkoutSession[];
  onUpdateSettings: (newSettings: UserSettings) => void;
  onImportBackup: (importedSessions: WorkoutSession[], importedSettings?: UserSettings) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  sessions,
  onUpdateSettings,
  onImportBackup,
  onClearAllData,
}) => {
  const [dailyGoal, setDailyGoal] = useState<number>(settings.dailyGoal || 50);
  const [restTimer, setRestTimer] = useState<number>(settings.restTimerSeconds || 45);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundEnabled);
  const [aiSettings, setAiSettings] = useState(settings.aiSensitivity || DEFAULT_AI_SETTINGS);

  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showSaveSuccess = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleSavePreferences = () => {
    const updated: UserSettings = {
      ...settings,
      dailyGoal: Math.max(5, dailyGoal),
      restTimerSeconds: Math.max(10, restTimer),
      soundEnabled,
      aiSensitivity: aiSettings,
    };
    onUpdateSettings(updated);
    sounds.setEnabled(soundEnabled);
    showSaveSuccess();
  };

  const handleExportJSON = () => {
    const jsonStr = exportDataToJSON(sessions, settings);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pushup_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const csvStr = exportHistoryToCSV(sessions);
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pushup_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importDataFromJSON(content, sessions);

      if (result.success && result.newSessions) {
        setImportStatus({ type: 'success', message: result.message });
        onImportBackup(result.newSessions, result.newSettings);
        if (result.newSettings) {
          setDailyGoal(result.newSettings.dailyGoal);
          setRestTimer(result.newSettings.restTimerSeconds);
          setSoundEnabled(result.newSettings.soundEnabled);
          setAiSettings(result.newSettings.aiSensitivity);
        }
      } else {
        setImportStatus({ type: 'error', message: result.message });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 space-y-6">
      {/* Title Header */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-terracotta">
          <SettingsIcon className="w-4 h-4" />
          <span>Preferences & Data</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-charcoal">Settings</h1>
        <p className="mt-1 text-xs text-charcoal-secondary">
          Configure daily targets, audio cues, angle sensitivity, and manage offline data backups.
        </p>
      </div>

      {/* Goal & Workout Habits */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-soft-stone">
          <Target className="w-4 h-4 text-terracotta" />
          <h2 className="text-sm font-bold text-charcoal">Workout Targets & Audio</h2>
        </div>

        {/* Daily Goal Input */}
        <div>
          <label htmlFor="goal-input" className="block text-xs font-semibold text-charcoal mb-1">
            Daily Push-Up Goal (reps):
          </label>
          <div className="flex items-center gap-3">
            <input
              id="goal-input"
              type="number"
              min="5"
              max="500"
              step="5"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(parseInt(e.target.value) || 50)}
              className="w-32 px-3 py-2 rounded-xl border border-soft-stone bg-warm-ivory text-sm font-bold text-charcoal focus:outline-hidden focus:border-terracotta"
            />
            <div className="flex gap-1.5">
              {[25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDailyGoal(preset)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    dailyGoal === preset
                      ? 'bg-terracotta text-white'
                      : 'border border-soft-stone bg-warm-ivory text-charcoal-secondary hover:text-charcoal'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rest Timer Selector */}
        <div>
          <label htmlFor="rest-select" className="block text-xs font-semibold text-charcoal mb-1">
            Default Rest Interval Between Sets:
          </label>
          <div className="flex flex-wrap gap-2">
            {[30, 45, 60, 90, 120].map((sec) => (
              <button
                key={sec}
                onClick={() => setRestTimer(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  restTimer === sec
                    ? 'bg-terracotta text-white'
                    : 'border border-soft-stone bg-warm-ivory text-charcoal-secondary hover:text-charcoal'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Sound toggle & test button */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xs font-semibold text-charcoal block">Sound Effects</span>
            <span className="text-[11px] text-charcoal-secondary">
              Play pleasant synthesized chimes on reps and countdown ticks
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playRepSound(5);
              }}
              className="px-2.5 py-1 rounded-lg border border-soft-stone text-xs font-medium text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              title="Test sound chime"
            >
              Test Beep
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'border-terracotta/40 bg-terracotta/10 text-terracotta'
                  : 'border-soft-stone bg-warm-ivory text-charcoal-muted'
              }`}
              aria-label={soundEnabled ? 'Disable audio' : 'Enable audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-terracotta text-white text-xs font-bold hover:opacity-95 transition"
        >
          {savedToast ? 'Preferences Saved! ✓' : 'Save Preferences'}
        </button>
      </div>

      {/* AI MoveNet Sensitivity Tuning */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-soft-stone">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-terracotta" />
            <h2 className="text-sm font-bold text-charcoal">Pose Detection Calibration</h2>
          </div>
          <button
            onClick={() => setAiSettings(DEFAULT_AI_SETTINGS)}
            className="flex items-center gap-1 text-[11px] font-semibold text-terracotta hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Lowered angle */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-charcoal">
              <span>Chest Down Angle Threshold:</span>
              <span className="font-mono text-terracotta">{aiSettings.loweredAngleThreshold}°</span>
            </div>
            <input
              type="range"
              min="75"
              max="110"
              value={aiSettings.loweredAngleThreshold}
              onChange={(e) =>
                setAiSettings((prev) => ({
                  ...prev,
                  loweredAngleThreshold: parseInt(e.target.value),
                }))
              }
              className="w-full accent-[#C5684D]"
            />
            <span className="text-[10px] text-charcoal-muted block">
              Lower angle requires deeper chest-to-mat push-up before counting.
            </span>
          </div>

          {/* Raised angle */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-charcoal">
              <span>Top Plank Angle Threshold:</span>
              <span className="font-mono text-terracotta">{aiSettings.raisedAngleThreshold}°</span>
            </div>
            <input
              type="range"
              min="135"
              max="175"
              value={aiSettings.raisedAngleThreshold}
              onChange={(e) =>
                setAiSettings((prev) => ({
                  ...prev,
                  raisedAngleThreshold: parseInt(e.target.value),
                }))
              }
              className="w-full accent-[#C5684D]"
            />
            <span className="text-[10px] text-charcoal-muted block">
              Higher angle requires arms to be nearly fully locked out at the top.
            </span>
          </div>

          {/* Confidence */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-charcoal">
              <span>Min Landmark Confidence:</span>
              <span className="font-mono text-terracotta">
                {Math.round(aiSettings.minConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.6"
              step="0.05"
              value={aiSettings.minConfidence}
              onChange={(e) =>
                setAiSettings((prev) => ({
                  ...prev,
                  minConfidence: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-[#C5684D]"
            />
            <span className="text-[10px] text-charcoal-muted block">
              Filters out noisy, low-light, or obstructed body landmark coordinates.
            </span>
          </div>

          {/* Cooldown */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-charcoal">
              <span>Rep Cooldown Protection:</span>
              <span className="font-mono text-terracotta">{aiSettings.cooldownMs}ms</span>
            </div>
            <input
              type="range"
              min="300"
              max="1200"
              step="50"
              value={aiSettings.cooldownMs}
              onChange={(e) =>
                setAiSettings((prev) => ({
                  ...prev,
                  cooldownMs: parseInt(e.target.value),
                }))
              }
              className="w-full accent-[#C5684D]"
            />
            <span className="text-[10px] text-charcoal-muted block">
              Prevents duplicate rep triggers if body bounces quickly at lockout.
            </span>
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          className="px-4 py-2 rounded-xl bg-warm-ivory border border-soft-stone text-xs font-semibold text-charcoal hover:border-terracotta transition"
        >
          Save Pose Calibration
        </button>
      </div>

      {/* Data Backup & Privacy Section */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-soft-stone">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-charcoal">Data Sovereignty & Backups</h2>
        </div>

        <p className="text-xs text-charcoal-secondary leading-relaxed">
          <strong>100% Client-Side Privacy:</strong> Your webcam video stream is processed in real time by
          TensorFlow.js and is never recorded, saved, or transmitted to any server. All workout logs remain
          securely inside your browser's local storage.
        </p>

        {/* Import status banner */}
        {importStatus && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {importStatus.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* Backup / Export Buttons */}
        <div className="flex flex-wrap gap-2.5 pt-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          >
            <Download className="w-4 h-4 text-terracotta" />
            <span>Export Backup (JSON)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-terracotta" />
            <span>Export History (CSV)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          >
            <Upload className="w-4 h-4 text-terracotta" />
            <span>Restore Backup (JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20 transition ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear App Data</span>
          </button>
        </div>
      </div>

      {/* Developer & Project Credits */}
      <div className="p-6 rounded-2xl bg-pure-white border border-soft-stone shadow-card space-y-3">
        <h2 className="text-sm font-bold text-charcoal">About the Creator</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-warm-ivory border border-soft-stone">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-charcoal">Ameen</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta">
                Lead Developer & Designer
              </span>
            </div>
            <p className="text-xs text-charcoal-secondary mt-1 max-w-md">
              Full-stack developer specializing in modern web experiences, computer vision interfaces, and Progressive Web Apps.
            </p>
          </div>

          <a
            href="https://iamameen.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition shrink-0 group"
          >
            <span>Visit Portfolio</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-floating dark:bg-[#282825] border border-soft-stone space-y-3">
            <h3 className="text-sm font-bold text-charcoal">Erase All Local Data?</h3>
            <p className="text-xs text-charcoal-secondary leading-relaxed">
              This will permanently delete your workout history, achievements progress, and custom preferences. Make sure you have exported a JSON backup first.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
