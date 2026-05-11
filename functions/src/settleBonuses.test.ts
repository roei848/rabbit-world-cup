import { describe, it, expect } from 'vitest';
import { deriveWinner } from './index';

describe('deriveWinner', () => {
  it('returns home team code when home score is higher', () => {
    expect(deriveWinner({ home: 2, away: 1 }, 'ARG', 'FRA')).toBe('ARG');
  });
  it('returns away team code when away score is higher', () => {
    expect(deriveWinner({ home: 0, away: 1 }, 'BRA', 'GER')).toBe('GER');
  });
  it('returns home team code on draw (tie-break goes home)', () => {
    expect(deriveWinner({ home: 1, away: 1 }, 'ESP', 'POR')).toBe('ESP');
  });
});
