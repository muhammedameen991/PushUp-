import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  RotateCcw,
  Play,
  Pause,
  Plus,
  Undo2,
  Check,
  X,
  Volume2,
  VolumeX,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  Timer
} from 'lucide-react';
import type { UserSettings, WorkoutMode, WorkoutSession } from '../types/index.ts';
import { PushUpStateMachine } from '../utils/repCounter.ts';
import {
  drawPoseOverlay,
  extractArmLandmarks,
  getAvailableCameras,
  initPoseDetector,
  startCameraStream,
  stopCameraStream,
  CameraDevice,
} from '../utils/poseEngine.ts';
import { sounds } from '../utils/audio.ts';
import { getLocalDateString } from '../utils/statistics.ts';

interface WorkoutActiveViewProps {
  initialMode?: WorkoutMode;
  settings: UserSettings;
  onSaveSession: (session: WorkoutSession) => void;
  onCancelWorkout: () => void;
}

export const WorkoutActiveView: React.FC<WorkoutActiveViewProps> = ({
  initialMode = 'ai',
  settings,
  onSaveSession,
  onCancelWorkout,
}) => {
  const [mode, setMode] = useState<WorkoutMode>(initialMode);
  const [reps, setReps] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState<boolean>(!settings.soundEnabled);

  // Rest Timer State
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(settings.restTimerSeconds || 45);

  // AI Camera & Detection State
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [aiFeedback, setAiFeedback] = useState<string>('Initializing camera & pose detection...');
  const [currentAngle, setCurrentAngle] = useState<number>(180);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | 'none'>('none');
  const [isDown, setIsDown] = useState<boolean>(false);

  // Modals & Confirmations
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const stateMachineRef = useRef<PushUpStateMachine>(
    new PushUpStateMachine(settings.aiSensitivity)
  );
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Sound sync
  useEffect(() => {
    sounds.setEnabled(!soundMuted);
  }, [soundMuted]);

  // Main session elapsed timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !showFinishModal) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, showFinishModal]);

  // Rest timer countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isResting && restSecondsLeft > 0) {
      timer = setInterval(() => {
        setRestSecondsLeft((s) => {
          if (s <= 1) {
            sounds.playWorkoutComplete();
            setIsResting(false);
            return settings.restTimerSeconds || 45;
          }
          if (s <= 4) {
            sounds.playTimerTick();
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isResting, restSecondsLeft, settings.restTimerSeconds]);

  // Keyboard Shortcuts for Manual and Workout Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user typing in notes
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleAddRep(1);
      } else if (e.key === 'u' || e.key === 'U') {
        handleUndoRep();
      } else if (e.key === 'p' || e.key === 'P') {
        setIsActive((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, reps]);

  // Clean camera shutdown helper
  const teardownCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      stopCameraStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Camera and Detection Loop
  const initCameraAndAI = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setAiFeedback('Requesting camera permission & loading pose detector...');

    try {
      // 1. Enumerate available devices
      const deviceList = await getAvailableCameras();
      setCameras(deviceList);

      // 2. Load MoveNet model singleton
      const detector = await initPoseDetector();

      // 3. Acquire MediaStream
      const stream = await startCameraStream(selectedCameraId || undefined, facingMode);
      mediaStreamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (!videoRef.current) return resolve();
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(resolve).catch(() => resolve());
        };
      });

      setCameraLoading(false);
      setAiFeedback('Camera active. Step back to place upper body in frame.');

      // 4. Start detection loop
      let lastInferenceTime = 0;
      const INFERENCE_INTERVAL_MS = 60; // ~16 FPS to be ultra-gentle on low-end PCs

      const detectLoop = async (timestamp: number) => {
        if (!videoRef.current || !canvasRef.current || !mediaStreamRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState >= 2 && ctx && timestamp - lastInferenceTime >= INFERENCE_INTERVAL_MS) {
          lastInferenceTime = timestamp;

          // Match canvas resolution to video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          try {
            const poses = await detector.estimatePoses(video, {
              maxPoses: 1,
              flipHorizontal: facingMode === 'user',
            });

            if (poses.length > 0) {
              const pose = poses[0];
              const armLandmarks = extractArmLandmarks(pose);
              const result = stateMachineRef.current.processFrame(armLandmarks);

              setAiFeedback(result.feedbackMessage);
              setCurrentAngle(result.currentAngle);
              setActiveSide(result.activeSide);
              setIsDown(result.state === 'BOTTOM');

              if (result.isRepCounted) {
                setReps(result.repCount);
                sounds.playRepSound(result.repCount);
              }

              drawPoseOverlay(
                ctx,
                pose,
                canvas.width,
                canvas.height,
                result.currentAngle,
                result.activeSide,
                result.state === 'BOTTOM'
              );
            } else {
              setAiFeedback('Looking for pose... Step into frame.');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          } catch (err) {
            console.warn('Pose estimation frame error:', err);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectLoop);
      };

      animationFrameRef.current = requestAnimationFrame(detectLoop);
    } catch (err: unknown) {
      console.error('Camera or AI initialization error:', err);
      const msg = err instanceof Error ? err.message : 'Could not initialize camera.';
      setCameraError(msg);
      setCameraLoading(false);
      setAiFeedback('Camera tracking unavailable. You can switch to Manual Mode anytime.');
    }
  };

  // Switch or mount camera when mode is 'ai'
  useEffect(() => {
    if (mode === 'ai') {
      initCameraAndAI();
    } else {
      teardownCamera();
    }

    return () => {
      teardownCamera();
    };
  }, [mode, selectedCameraId, facingMode]);

  // Recalibrate AI state machine
  const handleRecalibrate = () => {
    stateMachineRef.current.reset(reps);
    setAiFeedback('Calibrated! Get into starting plank position.');
  };

  // Add reps manually
  const handleAddRep = (count: number = 1) => {
    setReps((prev) => {
      const next = prev + count;
      stateMachineRef.current.setReps(next);
      sounds.playRepSound(next);
      return next;
    });
  };

  // Undo last rep
  const handleUndoRep = () => {
    setReps((prev) => {
      const next = Math.max(0, prev - 1);
      stateMachineRef.current.setReps(next);
      return next;
    });
  };

  // Discard workout
  const handleConfirmDiscard = () => {
    teardownCamera();
    onCancelWorkout();
  };

  // Save completed workout
  const handleSaveWorkout = () => {
    teardownCamera();
    sounds.playWorkoutComplete();

    // Trigger celebratory confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C5684D', '#F5F4EF', '#262624', '#E8E6DF'],
    });

    const now = new Date();
    const startTimeStr = new Date(startTimeRef.current).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const rpm = elapsedSeconds > 0 ? Math.round((reps / elapsedSeconds) * 60) : 0;

    const session: WorkoutSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: getLocalDateString(now),
      timestamp: startTimeRef.current,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationSeconds: elapsedSeconds,
      reps,
      mode,
      notes: sessionNotes.trim() || undefined,
      averageCadence: rpm > 0 ? rpm : undefined,
    };

    onSaveSession(session);
  };

  // Format time mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 space-y-6">
      {/* Top Session Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-pure-white border border-soft-stone shadow-card">
        {/* Mode Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-warm-ivory border border-soft-stone">
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'ai'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-charcoal-secondary hover:text-charcoal'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Tracking</span>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'manual'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-charcoal-secondary hover:text-charcoal'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Counter</span>
          </button>
        </div>

        {/* Live Timer & Pause / Audio Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-soft-stone bg-warm-ivory font-mono text-sm font-bold text-charcoal">
            <Clock className="w-4 h-4 text-terracotta" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => setIsActive(!isActive)}
            className="p-2 rounded-xl border border-soft-stone hover:bg-stone-200 dark:hover:bg-stone-800 text-charcoal transition"
            aria-label={isActive ? 'Pause Workout' : 'Resume Workout'}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-terracotta" />}
          </button>

          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-2 rounded-xl border border-soft-stone hover:bg-stone-200 dark:hover:bg-stone-800 text-charcoal transition"
            aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-charcoal-muted" /> : <Volume2 className="w-4 h-4 text-terracotta" />}
          </button>

          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="p-2 rounded-xl border border-soft-stone hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30 transition"
            aria-label="Discard Workout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Counter Display */}
      <div className="rounded-2xl bg-pure-white border border-soft-stone p-6 sm:p-8 shadow-card text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            Push-Up Repetitions
          </span>
          {reps >= settings.dailyGoal && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Goal Met!</span>
            </span>
          )}
        </div>

        {/* Big Rep Counter */}
        <div className="text-7xl sm:text-8xl font-black tracking-tight text-charcoal font-mono select-none">
          {reps}
        </div>

        <p className="text-xs text-charcoal-secondary">
          Target: {settings.dailyGoal} reps • Cadence:{' '}
          {elapsedSeconds > 5 ? Math.round((reps / elapsedSeconds) * 60) : 0} RPM
        </p>

        {/* AI Camera Video Viewport */}
        {mode === 'ai' && (
          <div className="space-y-4 pt-2">
            <div className="relative mx-auto w-full max-w-lg aspect-4/3 rounded-2xl overflow-hidden bg-[#20201E] border-2 border-soft-stone shadow-inner">
              {/* HTML5 Video element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Skeleton Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Loading State Overlay */}
              {cameraLoading && (
                <div className="absolute inset-0 bg-[#20201E]/90 flex flex-col items-center justify-center p-4 text-center space-y-3 z-10">
                  <RefreshCw className="w-8 h-8 text-terracotta animate-spin" />
                  <p className="text-sm font-semibold text-white">Loading MoveNet pose detector...</p>
                  <p className="text-xs text-stone-300 max-w-xs">
                    Downloading lightweight SinglePose model to run 100% locally on your device.
                  </p>
                </div>
              )}

              {/* Camera Error Overlay */}
              {cameraError && (
                <div className="absolute inset-0 bg-[#20201E]/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Camera Unavailable</h3>
                  <p className="text-xs text-stone-300 max-w-sm">{cameraError}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={initCameraAndAI}
                      className="px-4 py-2 rounded-xl bg-terracotta text-white text-xs font-semibold hover:opacity-90 transition"
                    >
                      Retry Camera
                    </button>
                    <button
                      onClick={() => setMode('manual')}
                      className="px-4 py-2 rounded-xl bg-stone-800 text-stone-200 border border-stone-700 text-xs font-semibold hover:bg-stone-700 transition"
                    >
                      Use Manual Counter
                    </button>
                  </div>
                </div>
              )}

              {/* Live Status HUD Overlay */}
              {!cameraLoading && !cameraError && (
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] font-mono text-white flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isDown ? 'bg-emerald-400' : 'bg-terracotta'}`} />
                    <span>Elbow: {currentAngle}°</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] uppercase font-semibold text-stone-300">
                    Side: {activeSide}
                  </div>
                </div>
              )}
            </div>

            {/* AI Form Guidance Banner */}
            <div
              className={`p-3 rounded-xl border text-xs font-medium text-center transition-colors ${
                isDown
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-warm-ivory border-soft-stone text-charcoal'
              }`}
            >
              {aiFeedback}
            </div>

            {/* Camera Controls & Recalibrate */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                onClick={handleRecalibrate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalibrate Pose</span>
              </button>

              {cameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-medium text-charcoal focus:outline-hidden"
                >
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                <span>Flip: {facingMode === 'user' ? 'Front' : 'Back'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Manual Counter Controls */}
        {mode === 'manual' && (
          <div className="space-y-6 pt-2">
            {/* Big Central Add Button */}
            <div className="flex justify-center">
              <button
                onClick={() => handleAddRep(1)}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-terracotta text-white shadow-floating hover:opacity-95 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group"
                aria-label="Add Repetition (Spacebar or Up Arrow)"
              >
                <Plus className="w-12 h-12 stroke-[2.5] group-hover:scale-110 transition" />
                <span className="text-xs font-bold uppercase tracking-wider">Tap +1</span>
              </button>
            </div>

            {/* Quick Increment & Undo Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleUndoRep}
                disabled={reps === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition"
                title="Undo last rep (U)"
              >
                <Undo2 className="w-4 h-4" />
                <span>Undo (-1)</span>
              </button>

              <button
                onClick={() => handleAddRep(5)}
                className="px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                +5 Reps
              </button>

              <button
                onClick={() => handleAddRep(10)}
                className="px-4 py-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                +10 Reps
              </button>

              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={reps === 0}
                className="p-2.5 rounded-xl border border-soft-stone bg-warm-ivory text-charcoal-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 transition"
                title="Reset session count"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-charcoal-muted">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded border border-soft-stone bg-warm-ivory">Space</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-soft-stone bg-warm-ivory">↑</kbd> to count reps,{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-soft-stone bg-warm-ivory">U</kbd> to undo.
            </p>
          </div>
        )}

        {/* Rest Timer Drawer / Box */}
        <div className="pt-2 border-t border-soft-stone flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-terracotta" />
            <span className="text-xs font-bold text-charcoal">Rest Between Sets</span>
            {isResting && (
              <span className="font-mono text-xs font-bold text-terracotta animate-pulse">
                ({restSecondsLeft}s left)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isResting ? (
              <button
                onClick={() => setIsResting(false)}
                className="px-3 py-1.5 rounded-lg border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                Skip Rest
              </button>
            ) : (
              <button
                onClick={() => {
                  setRestSecondsLeft(settings.restTimerSeconds || 45);
                  setIsResting(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-soft-stone bg-warm-ivory text-xs font-semibold text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                Start {settings.restTimerSeconds || 45}s Rest
              </button>
            )}
          </div>
        </div>

        {/* Finish Workout CTA Button */}
        <div className="pt-4">
          <button
            onClick={() => setShowFinishModal(true)}
            disabled={reps === 0}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-terracotta text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-95 disabled:opacity-40 transition"
          >
            Finish & Log Session ({reps} Reps)
          </button>
        </div>
      </div>

      {/* MODAL: Finish & Save Session */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-pure-white p-6 shadow-floating dark:bg-[#282825] border border-soft-stone animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-soft-stone">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-terracotta/10 text-terracotta flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <h3 className="text-base font-bold text-charcoal">Log Completed Workout</h3>
              </div>
              <button
                onClick={() => setShowFinishModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-charcoal-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-warm-ivory border border-soft-stone text-center">
              <div>
                <span className="text-[10px] font-semibold text-charcoal-muted uppercase">Reps</span>
                <p className="text-xl font-black text-charcoal">{reps}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-charcoal-muted uppercase">Duration</span>
                <p className="text-xl font-black text-charcoal">{formatTime(elapsedSeconds)}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-charcoal-muted uppercase">Mode</span>
                <p className="text-xl font-black text-charcoal uppercase">{mode}</p>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label htmlFor="notes-input" className="block text-xs font-semibold text-charcoal mb-1">
                Workout Notes (optional):
              </label>
              <textarea
                id="notes-input"
                rows={3}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="e.g. Diamond push-ups, felt explosive on 3rd set..."
                className="w-full rounded-xl border border-soft-stone bg-warm-ivory p-3 text-xs text-charcoal focus:outline-hidden focus:border-terracotta resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Keep Going
              </button>
              <button
                onClick={handleSaveWorkout}
                className="flex-1 py-2.5 rounded-xl bg-terracotta text-white text-xs font-bold shadow-sm hover:opacity-95 transition"
              >
                Save Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Discard confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-floating dark:bg-[#282825] border border-soft-stone space-y-3">
            <h3 className="text-sm font-bold text-charcoal">Discard Active Workout?</h3>
            <p className="text-xs text-charcoal-secondary leading-relaxed">
              Are you sure you want to exit without saving? Your current {reps} reps and workout timer will be discarded.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reset Reps Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-floating dark:bg-[#282825] border border-soft-stone space-y-3">
            <h3 className="text-sm font-bold text-charcoal">Reset Rep Counter?</h3>
            <p className="text-xs text-charcoal-secondary">
              This will reset the current session rep count back to 0. The session timer will keep running.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-soft-stone text-xs font-semibold text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Keep Reps
              </button>
              <button
                onClick={() => {
                  setReps(0);
                  stateMachineRef.current.reset(0);
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-charcoal text-white text-xs font-bold dark:bg-stone-200 dark:text-stone-900 transition"
              >
                Reset to 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
