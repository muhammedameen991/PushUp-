import type {
  AISensitivitySettings,
  PoseLandmarkPoint,
  PushUpState,
  RepCycleAnalysis
} from '../types/index.ts';

export const DEFAULT_AI_SETTINGS: AISensitivitySettings = {
  loweredAngleThreshold: 95, // <= 95 deg is down
  raisedAngleThreshold: 150, // >= 150 deg is up
  minConfidence: 0.35,
  cooldownMs: 600,
};

/**
 * Calculates the interior angle in degrees at vertex B formed by line segments BA and BC.
 * Point A: Shoulder
 * Point B: Elbow (vertex)
 * Point C: Wrist
 */
export function calculateAngle(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
): number {
  const vBAx = pointA.x - pointB.x;
  const vBAy = pointA.y - pointB.y;
  const vBCx = pointC.x - pointB.x;
  const vBCy = pointC.y - pointB.y;

  const dot = vBAx * vBCx + vBAy * vBCy;
  const magBA = Math.hypot(vBAx, vBAy);
  const magBC = Math.hypot(vBCx, vBCy);

  if (magBA === 0 || magBC === 0) return 180;

  const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  const angleRad = Math.acos(cosTheta);
  return Math.round((angleRad * 180) / Math.PI);
}

/**
 * PushUpStateMachine manages the push-up rep counting cycle:
 * TOP -> GOING_DOWN -> BOTTOM -> GOING_UP -> TOP (Rep counted +1)
 */
export class PushUpStateMachine {
  private state: PushUpState = 'CALIBRATING';
  private repCount: number = 0;
  private lastRepTimestamp: number = 0;
  private consecutiveLowConfidenceFrames: number = 0;
  private settings: AISensitivitySettings;

  constructor(customSettings?: Partial<AISensitivitySettings>) {
    this.settings = { ...DEFAULT_AI_SETTINGS, ...customSettings };
  }

  public updateSettings(newSettings: Partial<AISensitivitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public reset(initialReps: number = 0): void {
    this.state = 'CALIBRATING';
    this.repCount = initialReps;
    this.lastRepTimestamp = 0;
    this.consecutiveLowConfidenceFrames = 0;
  }

  public setReps(count: number): void {
    this.repCount = Math.max(0, count);
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getState(): PushUpState {
    return this.state;
  }

  /**
   * Process a single video frame with detected key landmarks
   */
  public processFrame(
    landmarks: {
      leftShoulder?: PoseLandmarkPoint;
      leftElbow?: PoseLandmarkPoint;
      leftWrist?: PoseLandmarkPoint;
      rightShoulder?: PoseLandmarkPoint;
      rightElbow?: PoseLandmarkPoint;
      rightWrist?: PoseLandmarkPoint;
    },
    now: number = Date.now()
  ): RepCycleAnalysis {
    const leftValid =
      landmarks.leftShoulder &&
      landmarks.leftElbow &&
      landmarks.leftWrist &&
      landmarks.leftShoulder.score >= this.settings.minConfidence &&
      landmarks.leftElbow.score >= this.settings.minConfidence &&
      landmarks.leftWrist.score >= this.settings.minConfidence;

    const rightValid =
      landmarks.rightShoulder &&
      landmarks.rightElbow &&
      landmarks.rightWrist &&
      landmarks.rightShoulder.score >= this.settings.minConfidence &&
      landmarks.rightElbow.score >= this.settings.minConfidence &&
      landmarks.rightWrist.score >= this.settings.minConfidence;

    // Pick side with highest confidence or valid side
    let activeSide: 'left' | 'right' | 'none' = 'none';
    let angle = 180;
    let confidence = 0;

    if (leftValid && rightValid) {
      const leftAvg = (landmarks.leftShoulder!.score + landmarks.leftElbow!.score + landmarks.leftWrist!.score) / 3;
      const rightAvg = (landmarks.rightShoulder!.score + landmarks.rightElbow!.score + landmarks.rightWrist!.score) / 3;
      if (leftAvg >= rightAvg) {
        activeSide = 'left';
        angle = calculateAngle(landmarks.leftShoulder!, landmarks.leftElbow!, landmarks.leftWrist!);
        confidence = leftAvg;
      } else {
        activeSide = 'right';
        angle = calculateAngle(landmarks.rightShoulder!, landmarks.rightElbow!, landmarks.rightWrist!);
        confidence = rightAvg;
      }
    } else if (leftValid) {
      activeSide = 'left';
      angle = calculateAngle(landmarks.leftShoulder!, landmarks.leftElbow!, landmarks.leftWrist!);
      confidence = (landmarks.leftShoulder!.score + landmarks.leftElbow!.score + landmarks.leftWrist!.score) / 3;
    } else if (rightValid) {
      activeSide = 'right';
      angle = calculateAngle(landmarks.rightShoulder!, landmarks.rightElbow!, landmarks.rightWrist!);
      confidence = (landmarks.rightShoulder!.score + landmarks.rightElbow!.score + landmarks.rightWrist!.score) / 3;
    }

    if (activeSide === 'none') {
      this.consecutiveLowConfidenceFrames++;
      let message = 'Body landmarks not visible. Step back so camera sees your arms and torso.';
      if (this.consecutiveLowConfidenceFrames > 30) {
        message = 'Looking for pose... Position camera diagonally for best view.';
      }
      return {
        isRepCounted: false,
        repCount: this.repCount,
        currentAngle: 180,
        state: this.state,
        feedbackMessage: message,
        confidence: 0,
        activeSide: 'none',
      };
    }

    this.consecutiveLowConfidenceFrames = 0;
    let isRepCounted = false;
    let feedback = 'Good form. Keep spine straight.';

    // State machine transitions
    switch (this.state) {
      case 'CALIBRATING':
        if (angle >= this.settings.raisedAngleThreshold - 10) {
          this.state = 'TOP';
          feedback = 'Ready! Lower chest toward floor.';
        } else {
          feedback = 'Extend arms into starting plank position.';
        }
        break;

      case 'TOP':
        if (angle <= this.settings.loweredAngleThreshold) {
          this.state = 'BOTTOM';
          feedback = 'Depth reached! Push back up.';
        } else if (angle < this.settings.raisedAngleThreshold - 15) {
          this.state = 'GOING_DOWN';
          feedback = 'Lowering... lower chest deeper.';
        } else {
          feedback = 'Ready. Lower down.';
        }
        break;

      case 'GOING_DOWN':
        if (angle <= this.settings.loweredAngleThreshold) {
          this.state = 'BOTTOM';
          feedback = 'Target depth reached! Push up!';
        } else if (angle >= this.settings.raisedAngleThreshold) {
          this.state = 'TOP';
          feedback = 'Lower down further to count rep.';
        } else {
          feedback = 'Keep going down...';
        }
        break;

      case 'BOTTOM':
        if (angle >= this.settings.raisedAngleThreshold) {
          // Check cooldown
          if (now - this.lastRepTimestamp >= this.settings.cooldownMs) {
            this.repCount++;
            isRepCounted = true;
            this.lastRepTimestamp = now;
            this.state = 'TOP';
            feedback = `Rep ${this.repCount} counted! Excellent!`;
          } else {
            this.state = 'TOP';
            feedback = 'Good rep pace.';
          }
        } else if (angle > this.settings.loweredAngleThreshold + 15) {
          this.state = 'GOING_UP';
          feedback = 'Pushing up... extend fully.';
        } else {
          feedback = 'Chest down. Now push up.';
        }
        break;

      case 'GOING_UP':
        if (angle >= this.settings.raisedAngleThreshold) {
          if (now - this.lastRepTimestamp >= this.settings.cooldownMs) {
            this.repCount++;
            isRepCounted = true;
            this.lastRepTimestamp = now;
            this.state = 'TOP';
            feedback = `Rep ${this.repCount} counted!`;
          } else {
            this.state = 'TOP';
          }
        } else if (angle <= this.settings.loweredAngleThreshold) {
          this.state = 'BOTTOM';
          feedback = 'Chest back down.';
        } else {
          feedback = 'Extend arms all the way up.';
        }
        break;
    }

    return {
      isRepCounted,
      repCount: this.repCount,
      currentAngle: angle,
      state: this.state,
      feedbackMessage: feedback,
      confidence,
      activeSide,
    };
  }
}
