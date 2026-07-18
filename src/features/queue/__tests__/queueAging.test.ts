import { describe, expect, it } from '@jest/globals';
import { computeQueueAge, formatQueueAgeLabel } from '../queueAging.js';

describe('computeQueueAge (G-AGE-THRESH)', () => {
  const nowMs = Date.parse('2026-07-18T12:00:00.000Z');

  it('hides when promisedPickupAt missing', () => {
    expect(computeQueueAge(null, nowMs)).toMatchObject({
      tone: 'neutral',
      labelKind: 'hidden',
    });
  });

  it('future → neutral + in', () => {
    const promised = new Date(nowMs + 3 * 60_000).toISOString();
    const info = computeQueueAge(promised, nowMs);
    expect(info.tone).toBe('neutral');
    expect(info.labelKind).toBe('in');
    expect(info.urgency).toBeUndefined();
    expect(formatQueueAgeLabel(info)).toBe('in 3m');
  });

  it('overdue ≤5m → neutral + ago (not warn)', () => {
    const promised = new Date(nowMs - 4 * 60_000).toISOString();
    const info = computeQueueAge(promised, nowMs);
    expect(info.tone).toBe('neutral');
    expect(info.labelKind).toBe('ago');
    expect(info.urgency).toBeUndefined();
    expect(formatQueueAgeLabel(info)).toBe('4m ago');
  });

  it('overdue exactly 5m → still ago/neutral (boundary ≤5m)', () => {
    const promised = new Date(nowMs - 5 * 60_000).toISOString();
    const info = computeQueueAge(promised, nowMs);
    expect(info.tone).toBe('neutral');
    expect(info.labelKind).toBe('ago');
  });

  it('overdue >5m and ≤15m → warn + overdue', () => {
    const promised = new Date(nowMs - 6 * 60_000).toISOString();
    const info = computeQueueAge(promised, nowMs);
    expect(info.tone).toBe('warn');
    expect(info.labelKind).toBe('overdue');
    expect(info.urgency).toBeUndefined();
    expect(formatQueueAgeLabel(info)).toBe('6m overdue');
  });

  it('overdue exactly 15m → still warn (boundary ≤15m)', () => {
    const promised = new Date(nowMs - 15 * 60_000).toISOString();
    const info = computeQueueAge(promised, nowMs);
    expect(info.tone).toBe('warn');
    expect(info.labelKind).toBe('overdue');
  });

  it('overdue >15m → danger + urgency high + overdue', () => {
    const promised = new Date(nowMs - 16 * 60_000).toISOString();
    const info = computeQueueAge(promised, nowMs);
    expect(info.tone).toBe('danger');
    expect(info.urgency).toBe('high');
    expect(info.labelKind).toBe('overdue');
    expect(formatQueueAgeLabel(info)).toBe('16m overdue');
  });
});
