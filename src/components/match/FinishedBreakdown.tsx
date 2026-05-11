import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import type { MatchDoc, PickDoc } from '../../firebase/firestore';

interface FinishedBreakdownProps {
  match: MatchDoc;
  pick: PickDoc | null;
}

export function FinishedBreakdown({ pick }: FinishedBreakdownProps) {
  const { theme: t } = useTheme();

  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 9,
        borderTop: `1px dashed ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontFamily: FONTS.body,
        fontSize: 11,
      }}
    >
      {pick === null ? (
        // Case 1: No pick submitted
        <span style={{ color: t.inkDim, fontSize: 11 }}>No pick submitted</span>
      ) : pick.points === null ? (
        // Case 2: Pick submitted, awaiting result
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: t.inkMuted }}>
            Your pick:{' '}
            <span style={{ color: t.ink, fontWeight: 600 }}>
              {pick.homeGoals} – {pick.awayGoals}
            </span>
          </span>
          <span style={{ color: t.inkMuted, fontSize: 10 }}>Awaiting result</span>
        </div>
      ) : (
        // Case 3: Pick submitted with points (scored)
        <>
          {/* Pick + points */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: t.inkMuted }}>
              Your pick:{' '}
              <span style={{ color: t.ink, fontWeight: 600 }}>
                {pick.homeGoals} – {pick.awayGoals}
              </span>
            </span>

            {/* Result badge */}
            {pick.pointsBreakdown?.exact && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 5,
                  background: 'rgba(61,214,140,0.18)',
                  color: t.up,
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: 0.2,
                }}
              >
                Exact
              </span>
            )}
            {!pick.pointsBreakdown?.exact && pick.pointsBreakdown?.correctGap && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 5,
                  background: t.yellowTint,
                  color: t.yellow,
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: 0.2,
                }}
              >
                Correct margin
              </span>
            )}
            {!pick.pointsBreakdown?.exact &&
              !pick.pointsBreakdown?.correctGap &&
              pick.pointsBreakdown?.correctWinner && (
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: 5,
                    background: `${t.border}`,
                    color: t.inkMuted,
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: 0.2,
                  }}
                >
                  Correct winner
                </span>
              )}
          </div>

          {/* Points earned */}
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 13,
              color: t.yellow,
              flexShrink: 0,
            }}
          >
            +{pick.points} pts
          </span>
        </>
      )}
    </div>
  );
}
