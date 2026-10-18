import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurrentStreak,
  calculateBestStreak,
  calculateTodayReps,
  calculatePersonalBest,
  calculateTotalLifetimeReps,
  calculateLast7Days,
  checkAchievements,
} from './statistics.ts';
import type { WorkoutSession } from '../types/index.ts';

const mockSessions: WorkoutSession[] = [
  {
    id: 's1',
    date: '2026-10-18',
    timestamp: 1792310400000,
    startTime: '09:00 AM',
    endTime: '09:15 AM',
    durationSeconds: 900,
    reps: 35,
    mode: 'ai',
  },
  {
    id: 's2',
    date: '2026-10-17',
    timestamp: 1792224000000,
    startTime: '10:00 AM',
    endTime: '10:10 AM',
    durationSeconds: 600,
    reps: 25,
    mode: 'manual',
  },
  {
    id: 's3',
    date: '2026-10-16',
    timestamp: 1792137600000,
    startTime: '08:00 AM',
    endTime: '08:12 AM',
    durationSeconds: 720,
    reps: 45,
    mode: 'manual',
  },
];

test('calculateTodayReps sums reps matching today local date', () => {
  const today = new Date('2026-10-18T12:00:00');
  const reps = calculateTodayReps(mockSessions, today);
  assert.equal(reps, 35);
});

test('calculateLifetimeReps sums all session reps', () => {
  const total = calculateTotalLifetimeReps(mockSessions);
  assert.equal(total, 105);
});

test('calculatePersonalBest identifies highest single session', () => {
  const pb = calculatePersonalBest(mockSessions);
  assert.equal(pb, 45);
});

test('calculateCurrentStreak counts 3 consecutive days', () => {
  const today = new Date('2026-10-18T12:00:00');
  const streak = calculateCurrentStreak(mockSessions, today);
  assert.equal(streak, 3);
});

test('calculateCurrentStreak returns 0 when gap exceeds 1 day', () => {
  const futureDate = new Date('2026-10-25T12:00:00');
  const streak = calculateCurrentStreak(mockSessions, futureDate);
  assert.equal(streak, 0);
});

test('calculateLast7Days produces 7 day items ending today', () => {
  const today = new Date('2026-10-18T12:00:00');
  const last7 = calculateLast7Days(mockSessions, 50, today);
  assert.equal(last7.length, 7);
  assert.equal(last7[6].date, '2026-10-18');
  assert.equal(last7[6].reps, 35);
  assert.equal(last7[5].date, '2026-10-17');
  assert.equal(last7[5].reps, 25);
  assert.equal(last7[0].reps, 0); // Day with no workout is 0
});

test('checkAchievements detects unlocked milestones', () => {
  const achievements = checkAchievements(mockSessions);
  const firstRep = achievements.find((a) => a.id === 'first_rep');
  assert.equal(firstRep?.unlocked, true);

  const centuryClub = achievements.find((a) => a.id === 'century_club');
  assert.equal(centuryClub?.unlocked, true); // 105 >= 100

  const ironChest = achievements.find((a) => a.id === 'iron_chest');
  assert.equal(ironChest?.unlocked, false); // 105 < 500

  const aiPioneer = achievements.find((a) => a.id === 'ai_pioneer');
  assert.equal(aiPioneer?.unlocked, true); // s1 is AI mode
});
