import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAngle, PushUpStateMachine } from './repCounter.ts';

test('calculateAngle computes accurate 90 degree elbow bend', () => {
  // Shoulder at (100, 50), Elbow at (100, 100), Wrist at (150, 100)
  const shoulder = { x: 100, y: 50 };
  const elbow = { x: 100, y: 100 };
  const wrist = { x: 150, y: 100 };
  const angle = calculateAngle(shoulder, elbow, wrist);
  assert.equal(angle, 90);
});

test('calculateAngle computes straight arm as ~180 degrees', () => {
  const shoulder = { x: 100, y: 50 };
  const elbow = { x: 100, y: 100 };
  const wrist = { x: 100, y: 150 };
  const angle = calculateAngle(shoulder, elbow, wrist);
  assert.equal(angle, 180);
});

test('PushUpStateMachine starts in CALIBRATING and transitions to TOP', () => {
  const machine = new PushUpStateMachine();
  assert.equal(machine.getState(), 'CALIBRATING');

  // Straight arms frame (angle 180)
  const result = machine.processFrame({
    leftShoulder: { x: 100, y: 50, score: 0.9 },
    leftElbow: { x: 100, y: 100, score: 0.9 },
    leftWrist: { x: 100, y: 150, score: 0.9 },
  });

  assert.equal(result.state, 'TOP');
  assert.equal(result.repCount, 0);
  assert.equal(result.isRepCounted, false);
});

test('PushUpStateMachine completes full lowered-to-raised push-up cycle', () => {
  const machine = new PushUpStateMachine({
    loweredAngleThreshold: 95,
    raisedAngleThreshold: 150,
    cooldownMs: 500,
  });

  let t = 1000;

  // 1. Calibrate at top
  machine.processFrame({
    leftShoulder: { x: 100, y: 50, score: 0.9 },
    leftElbow: { x: 100, y: 100, score: 0.9 },
    leftWrist: { x: 100, y: 150, score: 0.9 },
  }, t);
  assert.equal(machine.getState(), 'TOP');

  // 2. Going down (angle ~120 deg)
  t += 200;
  machine.processFrame({
    leftShoulder: { x: 100, y: 50, score: 0.9 },
    leftElbow: { x: 100, y: 100, score: 0.9 },
    leftWrist: { x: 143, y: 125, score: 0.9 },
  }, t);
  assert.equal(machine.getState(), 'GOING_DOWN');

  // 3. Reach bottom (angle 90 <= 95)
  t += 200;
  machine.processFrame({
    leftShoulder: { x: 100, y: 50, score: 0.9 },
    leftElbow: { x: 100, y: 100, score: 0.9 },
    leftWrist: { x: 150, y: 100, score: 0.9 },
  }, t);
  assert.equal(machine.getState(), 'BOTTOM');

  // 4. Push back up to top (angle 180 >= 150)
  t += 600; // after cooldown
  const finishResult = machine.processFrame({
    leftShoulder: { x: 100, y: 50, score: 0.9 },
    leftElbow: { x: 100, y: 100, score: 0.9 },
    leftWrist: { x: 100, y: 150, score: 0.9 },
  }, t);

  assert.equal(finishResult.isRepCounted, true);
  assert.equal(finishResult.repCount, 1);
  assert.equal(machine.getState(), 'TOP');
});

test('PushUpStateMachine rejects frames with low confidence landmarks', () => {
  const machine = new PushUpStateMachine({ minConfidence: 0.4 });
  const result = machine.processFrame({
    leftShoulder: { x: 100, y: 50, score: 0.1 }, // too low!
    leftElbow: { x: 100, y: 100, score: 0.8 },
    leftWrist: { x: 100, y: 150, score: 0.8 },
  });

  assert.equal(result.activeSide, 'none');
  assert.equal(result.confidence, 0);
  assert.match(result.feedbackMessage, /landmarks not visible/i);
});
