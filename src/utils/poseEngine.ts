import type { PoseLandmarkPoint } from '../types/index.ts';

// Type definitions for Pose Detection without bundler collision with @mediapipe
export interface PoseKeypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface DetectedPose {
  keypoints: PoseKeypoint[];
  score?: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

let detectorInstance: any = null;
let isInitializingModel = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists in document
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Ensures TensorFlow.js and MoveNet Pose Detection are loaded via CDN or window
 */
export async function getTfPoseLibraries(): Promise<{ tf: any; poseDetection: any }> {
  const win = typeof window !== 'undefined' ? (window as any) : {};
  if (win.tf && win.poseDetection) {
    return { tf: win.tf, poseDetection: win.poseDetection };
  }

  try {
    if (!win.tf) {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
    }
    if (!win.poseDetection) {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js');
    }
    return { tf: (window as any).tf, poseDetection: (window as any).poseDetection };
  } catch (err) {
    console.warn('CDN load failed or offline, checking local instances:', err);
    if ((window as any).tf && (window as any).poseDetection) {
      return { tf: (window as any).tf, poseDetection: (window as any).poseDetection };
    }
    throw new Error('Pose detection libraries could not be loaded. Please check your connection or use Manual Counter.');
  }
}

/**
 * Initializes TensorFlow backend and MoveNet SinglePose Lightning model.
 */
export async function initPoseDetector(): Promise<any> {
  if (detectorInstance) {
    return detectorInstance;
  }

  if (isInitializingModel) {
    while (isInitializingModel) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (detectorInstance) return detectorInstance;
  }

  isInitializingModel = true;

  try {
    const { tf, poseDetection } = await getTfPoseLibraries();

    try {
      await tf.setBackend('webgl');
      await tf.ready();
    } catch {
      console.warn('WebGL backend unavailable, falling back to CPU');
      await tf.setBackend('cpu');
      await tf.ready();
    }

    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
      minPoseScore: 0.25,
    };

    detectorInstance = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );

    return detectorInstance;
  } catch (err) {
    console.error('Failed to initialize MoveNet model:', err);
    throw new Error('Pose detector could not be loaded. You can continue using Manual Mode.');
  } finally {
    isInitializingModel = false;
  }
}

/**
 * Lists available video input devices
 */
export async function getAvailableCameras(): Promise<CameraDevice[]> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

/**
 * Starts camera stream with chosen device or facingMode
 */
export async function startCameraStream(
  deviceId?: string,
  facingMode: 'user' | 'environment' = 'user'
): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera access is not supported by your browser or environment.');
  }

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Camera permission was denied. Please allow camera access in your browser settings.');
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new Error('No webcam or camera device was found on this system.');
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      throw new Error('Camera is already in use by another application.');
    }
    throw new Error(error.message || 'Could not start camera stream.');
  }
}

/**
 * Stops all active media tracks on a stream
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Extracts and maps MoveNet landmarks to push-up arm points
 */
export function extractArmLandmarks(pose: DetectedPose): {
  leftShoulder?: PoseLandmarkPoint;
  leftElbow?: PoseLandmarkPoint;
  leftWrist?: PoseLandmarkPoint;
  rightShoulder?: PoseLandmarkPoint;
  rightElbow?: PoseLandmarkPoint;
  rightWrist?: PoseLandmarkPoint;
  leftHip?: PoseLandmarkPoint;
  rightHip?: PoseLandmarkPoint;
} {
  const map: Record<string, PoseLandmarkPoint> = {};

  if (pose && pose.keypoints) {
    for (const kp of pose.keypoints) {
      if (kp.name) {
        map[kp.name] = {
          x: kp.x,
          y: kp.y,
          score: kp.score || 0,
          name: kp.name,
        };
      }
    }
  }

  return {
    leftShoulder: map['left_shoulder'],
    leftElbow: map['left_elbow'],
    leftWrist: map['left_wrist'],
    rightShoulder: map['right_shoulder'],
    rightElbow: map['right_elbow'],
    rightWrist: map['right_wrist'],
    leftHip: map['left_hip'],
    rightHip: map['right_hip'],
  };
}

/**
 * Draws skeleton overlay, angle indicators and visual feedback onto the canvas
 */
export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  pose: DetectedPose | null,
  canvasWidth: number,
  canvasHeight: number,
  currentAngle: number,
  activeSide: 'left' | 'right' | 'none',
  isDown: boolean
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!pose || !pose.keypoints) return;

  const minConfidence = 0.3;
  const keypoints = pose.keypoints;

  // Keypoint map
  const kpMap = new Map<string, { x: number; y: number; score: number }>();
  for (const kp of keypoints) {
    if (kp.name && (kp.score || 0) >= minConfidence) {
      kpMap.set(kp.name, { x: kp.x, y: kp.y, score: kp.score || 0 });
    }
  }

  // Draw connections
  const connections: [string, string][] = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'],
    ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'],
    ['right_knee', 'right_ankle'],
  ];

  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  for (const [p1, p2] of connections) {
    const pt1 = kpMap.get(p1);
    const pt2 = kpMap.get(p2);
    if (pt1 && pt2) {
      // Highlight active arm with Terracotta color
      const isActiveArm =
        (activeSide === 'left' && (p1.startsWith('left_') && p2.startsWith('left_'))) ||
        (activeSide === 'right' && (p1.startsWith('right_') && p2.startsWith('right_')));

      if (isActiveArm) {
        ctx.strokeStyle = isDown ? '#48BB78' : '#C5684D';
        ctx.lineWidth = 6;
      } else {
        ctx.strokeStyle = 'rgba(232, 230, 223, 0.65)';
        ctx.lineWidth = 3;
      }

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.stroke();
    }
  }

  // Draw keypoint dots
  for (const kp of keypoints) {
    if ((kp.score || 0) >= minConfidence) {
      const isKeyArmPoint =
        activeSide !== 'none' &&
        (kp.name?.includes(activeSide) || false) &&
        (kp.name?.includes('shoulder') || kp.name?.includes('elbow') || kp.name?.includes('wrist'));

      ctx.beginPath();
      ctx.arc(kp.x, kp.y, isKeyArmPoint ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isKeyArmPoint ? (isDown ? '#48BB78' : '#C5684D') : '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#262624';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw angle badge near active elbow
  if (activeSide !== 'none') {
    const activeElbow = kpMap.get(`${activeSide}_elbow`);
    if (activeElbow) {
      const text = `${currentAngle}°`;
      ctx.font = 'bold 15px monospace';
      const textWidth = ctx.measureText(text).width;
      const bx = activeElbow.x + 12;
      const by = activeElbow.y - 10;

      ctx.fillStyle = isDown ? 'rgba(40, 167, 69, 0.9)' : 'rgba(197, 104, 77, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bx - 6, by - 16, textWidth + 12, 22, 6);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, bx, by);
    }
  }
}
