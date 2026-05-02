import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import type { MatchDoc } from '../../firebase/firestore';

interface MatchStatePillProps {
  match: MatchDoc;
}

export function MatchStatePill({ match }: MatchStatePillProps) {
  const { theme: t } = useTheme();
  const { status } = match;

  if (status === 'live') {
    const minute = match.liveMinute ?? 0;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'rgba(244,85,74,0.14)',
          color: t.live,
          fontFamily: FONTS.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: t.live,
            animation: 'br-pulse 1.4s infinite',
          }}
        />
        LIVE · {minute}'
      </span>
    );
  }

  if (status === 'finished') {
    return (
      <span
        style={{
          padding: '3px 8px',
          borderRadius: 999,
          background: t.surface2,
          color: t.inkMuted,
          fontFamily: FONTS.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        FINAL
      </span>
    );
  }

  // upcoming — show kickoff time
  const timeStr = match.kickoff
    .toDate()
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 999,
        background: 'transparent',
        color: t.inkMuted,
        border: `1px solid ${t.border}`,
        fontFamily: FONTS.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
    >
      {timeStr}
    </span>
  );
}
