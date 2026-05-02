export type Stage = 'group' | 'r16' | 'qf' | 'sf' | 'final';

export interface ScoringSettings {
  stageMultipliers: Record<Stage, number>;
  basePoints: {
    exactScore: number;
    correctGap: number;
    correctWinner: number;
  };
  bonusPoints: {
    topScorer: number;
    worldCupWinner: number;
  };
}

export const DEFAULT_SCORING: ScoringSettings = {
  stageMultipliers: { group: 1, r16: 2, qf: 3, sf: 3, final: 4 },
  basePoints: { exactScore: 3, correctGap: 2, correctWinner: 1 },
  bonusPoints: { topScorer: 10, worldCupWinner: 15 },
};

export interface ScoreResult {
  points: number;
  breakdown: {
    exact: boolean;
    correctGap: boolean;
    correctWinner: boolean;
  };
}

export function scorePick(
  pick: { home: number; away: number },
  actual: { home: number; away: number },
  settings: ScoringSettings,
  stage: Stage
): ScoreResult {
  const exact = pick.home === actual.home && pick.away === actual.away;
  const gap = pick.home - pick.away === actual.home - actual.away;
  const winner = Math.sign(pick.home - pick.away) === Math.sign(actual.home - actual.away);

  const basePts = exact
    ? settings.basePoints.exactScore
    : gap
      ? settings.basePoints.correctGap
      : winner
        ? settings.basePoints.correctWinner
        : 0;

  return {
    points: basePts * settings.stageMultipliers[stage],
    breakdown: {
      exact,
      correctGap: gap && !exact,
      correctWinner: winner && !gap,
    },
  };
}

export function shadeColor(hex: string, percent: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.substring(0, 2), 16);
  const g = parseInt(n.substring(2, 4), 16);
  const b = parseInt(n.substring(4, 6), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * 255)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
