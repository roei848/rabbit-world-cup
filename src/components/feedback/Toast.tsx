import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

export function Toast({ message, type, visible }: ToastProps) {
  const { theme: t } = useTheme();

  const bg = type === 'success' ? t.up : t.down;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 96,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        zIndex: 200,
        background: bg,
        color: '#fff',
        fontFamily: FONTS.body,
        fontWeight: 600,
        fontSize: 13,
        padding: '9px 18px',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  );
}
