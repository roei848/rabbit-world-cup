import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';

interface RowProps {
  label: string;
  pts: string;
}

function Row({ label, pts }: RowProps) {
  const { theme: t } = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
      }}
    >
      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: t.ink }}>{label}</span>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 700,
          color: t.yellow,
        }}
      >
        {pts}
      </span>
    </div>
  );
}

export function ScoringLegend() {
  const { theme: t } = useTheme();

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: '14px 14px 12px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: t.yellow,
            color: '#1A1410',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONTS.mono,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          ?
        </span>
        <span
          style={{
            fontFamily: FONTS.display,
            fontSize: 12.5,
            fontWeight: 700,
            color: t.ink,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          How scoring works
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${t.border}` }}>
        <Row label="Winner correct" pts="1 pt" />
        <Row label="Winner + goal difference" pts="2 pts" />
        <Row label="Winner + exact score" pts="3 pts" />
      </div>

      <div
        style={{
          marginTop: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: t.yellowTint,
          fontFamily: FONTS.body,
          fontSize: 11,
          color: t.ink,
          lineHeight: 1.5,
        }}
      >
        Multiplied by stage: Group ×1 · R16 ×2 · QF ×3 · SF ×4 · Final ×5.
      </div>
    </div>
  );
}
