import { FONTS, USER_COLORS, colorForName, type Theme } from '../../theme/tokens';

interface AvatarProps {
  name: string;
  size?: number;
  ring?: boolean;
  theme?: Theme;
}

export function Avatar({ name, size = 36, ring = false, theme }: AvatarProps) {
  const key = colorForName(name);
  const c = USER_COLORS[key];
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: c.bg,
      color: c.ink,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONTS.display,
      fontWeight: 700,
      fontSize: size * 0.42,
      letterSpacing: -0.3,
      flexShrink: 0,
      boxShadow: ring && theme
        ? `0 0 0 2px ${theme.bg}, 0 0 0 3.5px ${c.bg}`
        : 'none',
    }}>
      {initials}
    </div>
  );
}
