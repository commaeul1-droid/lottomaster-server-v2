import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessStoredRound,
  expectedLatestRoundAt,
} from '../src/lib/draw-freshness.js';

test('Saturday before 21 KST keeps the previous published round', () => {
  const beforeDraw = new Date('2026-07-25T11:59:00.000Z');
  assert.equal(expectedLatestRoundAt(beforeDraw), 1233);
  assert.equal(assessStoredRound(1233, beforeDraw).state, 'current');
});

test('Saturday from 21 KST requires the newly drawn round', () => {
  const afterDraw = new Date('2026-07-25T12:00:00.000Z');
  assert.equal(expectedLatestRoundAt(afterDraw), 1234);
  assert.equal(assessStoredRound(1233, afterDraw).state, 'stale');
  assert.equal(assessStoredRound(1234, afterDraw).state, 'current');
});

test('Sunday treats the stored latest round as a safe no-op', () => {
  const sunday = new Date('2026-07-25T21:00:00.000Z');
  const assessment = assessStoredRound(1234, sunday);
  assert.equal(assessment.state, 'current');
  assert.equal(assessment.expectedRound, 1234);
  assert.equal(assessment.lag, 0);
});

test('future and missing rounds fail closed', () => {
  const sunday = new Date('2026-07-25T21:00:00.000Z');
  assert.equal(assessStoredRound(null, sunday).state, 'missing');
  assert.equal(assessStoredRound(1235, sunday).state, 'future');
});
