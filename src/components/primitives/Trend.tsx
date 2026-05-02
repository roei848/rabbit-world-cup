import { FONTS, type Theme } from '../../theme/tokens';

type TrendDir = 'up' | 'down' | 'flat';

interface TrendProps {
  dir: TrendDir;
  theme: Theme;
  value?: number | null;
}

export function Trend({ dir, theme: t, value }: TrendProps) {
  const map: Record<TrendDir, { color: string; glyph: string }> = {
    up:   { color: t.up,   glyph: '▲' },
    down: { color: t.down, glyph: '▼' },
    flat: { color: t.flat, glyph: '–' },
  };
  const m = map[dir];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      color: m.color,
      fontFamily: FONTS.mono,
      fontSize: 11,
      fontWeight: 600,
      minWidth: value != null ? 28 : undefined,
      justifyContent: 'flex-end',
    }}>
      <span style={{ fontSize: 9 }}>{m.glyph}</span>
      {value != null && <span>{value}</span>}
    </span>
  );
}
