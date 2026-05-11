import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { isPickLocked } from './useBonusPicks';

describe('isPickLocked', () => {
  it('returns false when tournamentStartAt is null', () => {
    expect(isPickLocked(null, new Date())).toBe(false);
  });

  it('returns false when now is before tournamentStartAt', () => {
    const future = new Date(Date.now() + 60_000); // 1 min in the future
    const ts = Timestamp.fromDate(future);
    expect(isPickLocked(ts, new Date())).toBe(false);
  });

  it('returns true when now is after tournamentStartAt', () => {
    const past = new Date(Date.now() - 60_000); // 1 min in the past
    const ts = Timestamp.fromDate(past);
    expect(isPickLocked(ts, new Date())).toBe(true);
  });

  it('returns true when now equals tournamentStartAt', () => {
    const exact = new Date(2026, 5, 11, 12, 0, 0, 0); // fixed moment
    const ts = Timestamp.fromDate(exact);
    expect(isPickLocked(ts, exact)).toBe(true);
  });
});
