import test from 'node:test';
import assert from 'node:assert/strict';
import { exportHistoryToCSV, importDataFromJSON, DEFAULT_USER_SETTINGS } from './storage.ts';
import type { WorkoutSession } from '../types/index.ts';

const testSessions: WorkoutSession[] = [
  {
    id: 'test-1',
    date: '2026-10-18',
    timestamp: 1792310400000,
    startTime: '08:00 AM',
    endTime: '08:15 AM',
    durationSeconds: 900,
    reps: 20,
    mode: 'manual',
    notes: 'Morning warm-up',
  },
];

test('exportHistoryToCSV formats rows and headers correctly', () => {
  const csv = exportHistoryToCSV(testSessions);
  assert.match(csv, /ID,Date,Start Time/);
  assert.match(csv, /"test-1","2026-10-18"/);
  assert.match(csv, /"Morning warm-up"/);
});

test('importDataFromJSON imports valid sessions and skips duplicates', () => {
  const json = JSON.stringify({
    version: '1.0',
    settings: DEFAULT_USER_SETTINGS,
    sessions: [
      {
        id: 'test-1', // existing duplicate
        date: '2026-10-18',
        reps: 20,
        mode: 'manual',
      },
      {
        id: 'test-2', // new
        date: '2026-10-17',
        reps: 30,
        mode: 'ai',
      },
    ],
  });

  const result = importDataFromJSON(json, testSessions);
  assert.equal(result.success, true);
  assert.equal(result.importedCount, 1);
  assert.equal(result.newSessions?.length, 2);
});

test('importDataFromJSON safely handles malformed JSON without crashing', () => {
  const result = importDataFromJSON('NOT_A_JSON', testSessions);
  assert.equal(result.success, false);
  assert.match(result.message, /Could not parse JSON/);
});
