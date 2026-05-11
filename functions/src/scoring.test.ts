import { describe, it, expect } from 'vitest';
import { scorePick, DEFAULT_SCORING } from './scoring';

describe('scorePick', () => {
  // 1. Exact score — group stage → 3 × 1 = 3 pts
  it('awards exactScore points on group stage exact match', () => {
    const result = scorePick({ home: 2, away: 1 }, { home: 2, away: 1 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(3);
    expect(result.breakdown.exact).toBe(true);
    expect(result.breakdown.correctGap).toBe(false);
    expect(result.breakdown.correctWinner).toBe(false);
  });

  // 2. Exact score — final stage → 3 × 4 = 12 pts
  it('applies final stage multiplier (×4) to exact score', () => {
    const result = scorePick({ home: 1, away: 0 }, { home: 1, away: 0 }, DEFAULT_SCORING, 'final');
    expect(result.points).toBe(12);
    expect(result.breakdown.exact).toBe(true);
  });

  // 3. Correct goal difference, not exact — group stage → 2 × 1 = 2 pts
  it('awards correctGap points when goal difference matches but not exact score', () => {
    const result = scorePick({ home: 3, away: 1 }, { home: 2, away: 0 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(2);
    expect(result.breakdown.exact).toBe(false);
    expect(result.breakdown.correctGap).toBe(true);
    expect(result.breakdown.correctWinner).toBe(false);
  });

  // 4. Correct winner only — group stage → 1 × 1 = 1 pt
  // pick: 3-0 (gap 3), actual: 2-1 (gap 1) — winner same (home wins) but gap differs
  it('awards correctWinner point when winner is right but gap is wrong', () => {
    const result = scorePick({ home: 3, away: 0 }, { home: 2, away: 1 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(1);
    expect(result.breakdown.exact).toBe(false);
    expect(result.breakdown.correctGap).toBe(false);
    expect(result.breakdown.correctWinner).toBe(true);
  });

  // 5. Wrong prediction — 0 pts
  it('awards 0 points when pick is completely wrong', () => {
    const result = scorePick({ home: 0, away: 2 }, { home: 3, away: 0 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(0);
    expect(result.breakdown.exact).toBe(false);
    expect(result.breakdown.correctGap).toBe(false);
    expect(result.breakdown.correctWinner).toBe(false);
  });

  // 6. Draw predicted, draw actual — group stage → 3 pts (exact)
  it('awards exactScore points for correct draw prediction with same score', () => {
    const result = scorePick({ home: 1, away: 1 }, { home: 1, away: 1 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(3);
    expect(result.breakdown.exact).toBe(true);
  });

  // 7. Draw predicted but actual is not a draw — 0 pts
  it('awards 0 points when draw is predicted but actual is not a draw', () => {
    const result = scorePick({ home: 1, away: 1 }, { home: 2, away: 1 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(0);
    expect(result.breakdown.exact).toBe(false);
    expect(result.breakdown.correctGap).toBe(false);
    expect(result.breakdown.correctWinner).toBe(false);
  });

  // 8. Correct gap in r16 — 2 × 2 = 4 pts
  it('applies r16 multiplier (×2) to correctGap points', () => {
    const result = scorePick({ home: 3, away: 1 }, { home: 2, away: 0 }, DEFAULT_SCORING, 'r16');
    expect(result.points).toBe(4);
    expect(result.breakdown.correctGap).toBe(true);
  });

  // 9. Correct draw (gap 0), different score — group stage → 2 pts (correctGap)
  it('awards correctGap points when both predict draw but different scores', () => {
    const result = scorePick({ home: 0, away: 0 }, { home: 2, away: 2 }, DEFAULT_SCORING, 'group');
    expect(result.points).toBe(2);
    expect(result.breakdown.exact).toBe(false);
    expect(result.breakdown.correctGap).toBe(true);
  });

  // 10. Exact score in qf — 3 × 3 = 9 pts
  it('applies qf multiplier (×3) to exact score', () => {
    const result = scorePick({ home: 2, away: 2 }, { home: 2, away: 2 }, DEFAULT_SCORING, 'qf');
    expect(result.points).toBe(9);
    expect(result.breakdown.exact).toBe(true);
  });
});
