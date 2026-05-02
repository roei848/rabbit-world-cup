import { describe, it, expect } from 'vitest';
import { scorePick, DEFAULT_SCORING } from './scoring';

describe('scorePick', () => {
  const s = DEFAULT_SCORING;

  it('awards exact score points × multiplier', () => {
    const r = scorePick({ home: 2, away: 1 }, { home: 2, away: 1 }, s, 'group');
    expect(r.points).toBe(3);
    expect(r.breakdown.exact).toBe(true);
  });

  it('awards correct gap points when goal diff matches', () => {
    const r = scorePick({ home: 2, away: 0 }, { home: 3, away: 1 }, s, 'r16');
    expect(r.points).toBe(4); // 2 × 2
    expect(r.breakdown.correctGap).toBe(true);
    expect(r.breakdown.exact).toBe(false);
  });

  it('awards winner points when only winner is correct', () => {
    const r = scorePick({ home: 1, away: 0 }, { home: 3, away: 1 }, s, 'qf');
    expect(r.points).toBe(3); // 1 × 3
    expect(r.breakdown.correctWinner).toBe(true);
  });

  it('awards 0 when winner is wrong', () => {
    const r = scorePick({ home: 0, away: 1 }, { home: 2, away: 0 }, s, 'final');
    expect(r.points).toBe(0);
  });

  it('applies final stage multiplier', () => {
    const r = scorePick({ home: 1, away: 0 }, { home: 1, away: 0 }, s, 'final');
    expect(r.points).toBe(12); // 3 × 4
  });
});
