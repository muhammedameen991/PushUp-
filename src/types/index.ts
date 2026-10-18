export type WorkoutMode = 'ai' | 'manual';

export interface WorkoutSession {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  timestamp: number; // Start timestamp
  startTime: string; // Formatted time
  endTime: string; // Formatted time
  durationSeconds: number;
  reps: number;
  mode: WorkoutMode;
  notes?: string;
  averageCadence?: number; // reps per minute
  accuracyRating?: 'good' | 'optimal' | 'calibrated';
}

export interface AISensitivitySettings {
  loweredAngleThreshold: number; // Angle below which rep is considered "down" (e.g. 90-95 deg)
  raisedAngleThreshold: number;  // Angle above which rep is considered "up" (e.g. 150-160 deg)
  minConfidence: number;         // Minimum landmark confidence score (e.g. 0.35)
  cooldownMs: number;            // Min time between reps to prevent double counting (e.g. 600ms)
}

export interface UserSettings {
  dailyGoal: number;
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  restTimerSeconds: number;
  aiSensitivity: AISensitivitySettings;
}

export type PushUpState = 'CALIBRATING' | 'TOP' | 'GOING_DOWN' | 'BOTTOM' | 'GOING_UP';

export interface PoseLandmarkPoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

export interface RepCycleAnalysis {
  isRepCounted: boolean;
  repCount: number;
  currentAngle: number;
  state: PushUpState;
  feedbackMessage: string;
  confidence: number;
  activeSide: 'left' | 'right' | 'none';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  target: number;
}
