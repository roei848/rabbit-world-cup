import { FONTS, type Theme } from '../../theme/tokens';
import { RabbitMark } from './RabbitMark';

interface LogoLockupProps {
  theme: Theme;
  compact?: boolean;
}

export function LogoLockup({ theme: t, compact = false }: LogoLockupProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: compact ? 28 : 34,
        height: compact ? 28 : 34,
        borderRadius: compact ? 8 : 9,
        background: t.yellow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: t.name === 'dark'
          ? '0 0 0 1px rgba(255,214,10,0.4), 0 6px 18px rgba(255,214,10,0.18)'
          : '0 1px 0 rgba(0,0,0,0.08)',
      }}>
        <RabbitMark size={compact ? 16 : 19} color="#1A1410" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
        <div style={{
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: compact ? 13 : 15,
          letterSpacing: -0.3,
          color: t.ink,
        }}>Black Rabbit</div>
        <div style={{
          fontFamily: FONTS.display,
          fontWeight: 600,
          fontSize: compact ? 8.5 : 9.5,
          letterSpacing: 1.4,
          color: t.yellow,
          textTransform: 'uppercase',
        }}>World Cup 2026</div>
      </div>
    </div>
  );
}
