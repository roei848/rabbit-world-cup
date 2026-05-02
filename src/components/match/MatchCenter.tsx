import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import type { MatchDoc } from '../../firebase/firestore';

interface ScoreBoxProps {
  value: number | null;
  locked: boolean;
}

function ScoreBox({ value, locked }: ScoreBoxProps) {
  const { theme: t } = useTheme();
  const display = value == null ? '—' : String(value);
  return (
    <div
      style={{
        width: 34,
        height: 38,
        borderRadius: 8,
        background: locked ? 'transparent' : t.surface2,
        border: `1px solid ${locked ? t.border : value != null ? t.borderHi : t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.mono,
        fontSize: 18,
        fontWeight: 700,
        color: value != null ? t.ink : t.inkDim,
      }}
    >
      {display}
    </div>
  );
}

interface MatchCenterProps {
  match: MatchDoc;
}

export function MatchCenter({ match }: MatchCenterProps) {
  const { theme: t } = useTheme();
  const { status } = match;

  if (status === 'live') {
    const home = match.score?.home ?? '—';
    const away = match.score?.away ?? '—';
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 8,
          background: 'rgba(244,85,74,0.12)',
          border: '1px solid rgba(244,85,74,0.3)',
        }}
      >
        <span style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink }}>
          {home}
        </span>
        <span style={{ fontFamily: FONTS.mono, color: t.inkDim, fontSize: 12 }}>:</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink }}>
          {away}
        </span>
      </div>
    );
  }

  if (status === 'finished') {
    const home = match.score?.home ?? '—';
    const away = match.score?.away ?? '—';
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 8,
          background: t.surface2,
        }}
      >
        <span style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink }}>
          {home}
        </span>
        <span style={{ fontFamily: FONTS.mono, color: t.inkDim, fontSize: 12 }}>:</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink }}>
          {away}
        </span>
      </div>
    );
  }

  // upcoming — empty score input boxes
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <ScoreBox value={null} locked={match.locked} />
      <span style={{ fontFamily: FONTS.mono, color: t.inkDim, fontSize: 12 }}>:</span>
      <ScoreBox value={null} locked={match.locked} />
    </div>
  );
}
