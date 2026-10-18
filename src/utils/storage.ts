import { DEFAULT_AI_SETTINGS } from './repCounter.ts';
import type { UserSettings, WorkoutSession } from '../types/index.ts';

const STORAGE_KEYS = {
  SESSIONS: 'pushup_sessions_v1',
  SETTINGS: 'pushup_settings_v1',
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dailyGoal: 50,
  theme: 'light',
  soundEnabled: true,
  restTimerSeconds: 45,
  aiSensitivity: DEFAULT_AI_SETTINGS,
};

export function loadSessions(): WorkoutSession[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sort newest first
    return parsed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error('Failed to load sessions from localStorage:', err);
    return [];
  }
}

export function saveSessions(sessions: WorkoutSession[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save sessions to localStorage:', err);
  }
}

export function addSession(newSession: WorkoutSession): WorkoutSession[] {
  const current = loadSessions();
  // Prevent duplicate ID saves
  if (current.some((s) => s.id === newSession.id)) {
    return current;
  }
  const updated = [newSession, ...current];
  saveSessions(updated);
  return updated;
}

export function deleteSession(id: string): WorkoutSession[] {
  const current = loadSessions();
  const updated = current.filter((s) => s.id !== id);
  saveSessions(updated);
  return updated;
}

export function clearAllSessions(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  } catch (err) {
    console.error('Failed to clear sessions:', err);
  }
}

export function loadSettings(): UserSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      aiSensitivity: {
        ...DEFAULT_USER_SETTINGS.aiSensitivity,
        ...(parsed.aiSensitivity || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function exportDataToJSON(sessions: WorkoutSession[], settings: UserSettings): string {
  const payload = {
    version: '1.0',
    app: 'PushUp',
    exportedAt: new Date().toISOString(),
    settings,
    sessions,
  };
  return JSON.stringify(payload, null, 2);
}

export function exportHistoryToCSV(sessions: WorkoutSession[]): string {
  const headers = ['ID', 'Date', 'Start Time', 'End Time', 'Duration (seconds)', 'Reps', 'Mode', 'Cadence (RPM)', 'Notes'];
  const rows = sessions.map((s) => [
    `"${s.id}"`,
    `"${s.date}"`,
    `"${s.startTime || ''}"`,
    `"${s.endTime || ''}"`,
    s.durationSeconds,
    s.reps,
    `"${s.mode}"`,
    s.averageCadence || '',
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function importDataFromJSON(
  jsonString: string,
  currentSessions: WorkoutSession[]
): { success: boolean; importedCount: number; message: string; newSessions?: WorkoutSession[]; newSettings?: UserSettings } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, importedCount: 0, message: 'Invalid backup file format.' };
    }

    const importedSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    const validSessions: WorkoutSession[] = [];

    for (const item of importedSessions) {
      if (
        item &&
        typeof item.id === 'string' &&
        typeof item.reps === 'number' &&
        item.reps >= 0 &&
        typeof item.date === 'string'
      ) {
        validSessions.push({
          id: item.id,
          date: item.date,
          timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          durationSeconds: typeof item.durationSeconds === 'number' ? item.durationSeconds : 0,
          reps: item.reps,
          mode: item.mode === 'ai' ? 'ai' : 'manual',
          notes: typeof item.notes === 'string' ? item.notes : '',
          averageCadence: typeof item.averageCadence === 'number' ? item.averageCadence : undefined,
        });
      }
    }

    // Merge sessions avoiding duplicate IDs
    const existingIds = new Set(currentSessions.map((s) => s.id));
    const newItems = validSessions.filter((s) => !existingIds.has(s.id));
    const merged = [...newItems, ...currentSessions].sort((a, b) => b.timestamp - a.timestamp);

    saveSessions(merged);

    let updatedSettings: UserSettings | undefined;
    if (parsed.settings && typeof parsed.settings === 'object') {
      const mergedSettings: UserSettings = {
        ...DEFAULT_USER_SETTINGS,
        ...parsed.settings,
      };
      saveSettings(mergedSettings);
      updatedSettings = mergedSettings;
    }

    return {
      success: true,
      importedCount: newItems.length,
      message: `Successfully imported ${newItems.length} new workouts. (${validSessions.length - newItems.length} duplicates skipped)`,
      newSessions: merged,
      newSettings: updatedSettings,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown JSON syntax error';
    return { success: false, importedCount: 0, message: `Could not parse JSON backup: ${errorMsg}` };
  }
}

export function clearAllData(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  } catch (err) {
    console.error('Failed to clear data:', err);
  }
}
