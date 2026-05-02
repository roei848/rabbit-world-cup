import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import { Flag } from '../primitives/Flag';
import type { MatchDoc } from '../../firebase/firestore';
import { MatchCenter } from './MatchCenter';
import { MatchStatePill } from './MatchStatePill';
import { FinishedBreakdown } from './FinishedBreakdown';

const STAGE_MULT: Record<MatchDoc['stage'], number> = {
  group: 1,
  r16:   2,
  qf:    3,
  sf:    4,
  final: 5,
};

interface MatchCardProps {
  match: MatchDoc;
}

export function MatchCard({ match }: MatchCardProps) {
  const { theme: t } = useTheme();
  const m = match;
  const mult = STAGE_MULT[m.stage];

  const kickoffTime = m.kickoff
    .toDate()
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: '12px 14px 13px',
      }}
    >
      {/* top meta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 10,
            fontWeight: 600,
            color: t.inkMuted,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {m.stageLabel}{' '}
          <span style={{ color: t.inkDim }}>·</span>{' '}
          <span style={{ color: t.yellow }}>×{mult}</span>
        </div>
        <MatchStatePill match={m} />
      </div>

      {/* teams + score center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* home */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          <Flag code={m.homeTeam.code} size={20} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 14,
              color: t.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {m.homeTeam.name}
          </span>
        </div>

        {/* center */}
        <MatchCenter match={m} />

        {/* away */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            flexDirection: 'row-reverse',
          }}
        >
          <Flag code={m.awayTeam.code} size={20} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 14,
              color: t.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            {m.awayTeam.name}
          </span>
        </div>
      </div>

      {/* finished — scoring breakdown (Phase 4: pass pick when available) */}
      {m.status === 'finished' && <FinishedBreakdown />}

      {/* live — locked indicator */}
      {m.status === 'live' && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 9,
            borderTop: `1px dashed ${t.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontFamily: FONTS.body,
            fontSize: 11,
            color: t.live,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: t.live,
                animation: 'br-pulse 1.4s infinite',
              }}
            />
            Predictions locked
          </span>
        </div>
      )}

      {/* upcoming — kickoff info */}
      {m.status === 'upcoming' && (
        <div
          style={{
            marginTop: 8,
            fontFamily: FONTS.body,
            fontSize: 10.5,
            color: t.inkDim,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Locks at kickoff · {kickoffTime}</span>
        </div>
      )}
    </div>
  );
}
