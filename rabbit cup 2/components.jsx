// Rabbit-themed primitives and shared UI

// ── RabbitMark ─────────────────────────────────────────────
// Tiny geometric silhouette: two ear ovals + rounded body.
function RabbitMark({ size = 14, color = '#fff' }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* ears */}
      <ellipse cx="8.5" cy="6" rx="2.2" ry="4.5" fill={color} />
      <ellipse cx="15.5" cy="6" rx="2.2" ry="4.5" fill={color} />
      {/* head/body */}
      <ellipse cx="12" cy="15" rx="6.5" ry="6" fill={color} />
      {/* eye notch (negative space — punched with bg color) */}
    </svg>
  );
}

// ── LogoLockup ─────────────────────────────────────────────
function LogoLockup({ theme, compact = false }) {
  const t = theme;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: compact ? 28 : 34, height: compact ? 28 : 34,
        borderRadius: compact ? 8 : 9,
        background: t.yellow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: t.name === 'dark' ? '0 0 0 1px rgba(255,214,10,0.4), 0 6px 18px rgba(255,214,10,0.18)' : '0 1px 0 rgba(0,0,0,0.08)',
      }}>
        <RabbitMark size={compact ? 16 : 19} color="#1A1410" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
        <div style={{
          fontFamily: FONTS.display, fontWeight: 700,
          fontSize: compact ? 13 : 15, letterSpacing: -0.3, color: t.ink,
        }}>Black Rabbit</div>
        <div style={{
          fontFamily: FONTS.display, fontWeight: 600,
          fontSize: compact ? 8.5 : 9.5, letterSpacing: 1.4, color: t.yellow,
          textTransform: 'uppercase',
        }}>World Cup 2026</div>
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────
function Avatar({ name, size = 36, ring = false, theme }) {
  const k = colorForName(name);
  const c = USER_COLORS[k];
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONTS.display, fontWeight: 700,
      fontSize: size * 0.42, letterSpacing: -0.3,
      flexShrink: 0,
      boxShadow: ring && theme ? `0 0 0 2px ${theme.bg}, 0 0 0 3.5px ${c.bg}` : 'none',
    }}>{initials}</div>
  );
}

// ── Trend arrow ─────────────────────────────────────────────
function Trend({ dir, theme, value }) {
  const t = theme;
  const map = {
    up:   { color: t.up,   glyph: '▲' },
    down: { color: t.down, glyph: '▼' },
    flat: { color: t.flat, glyph: '–' },
  };
  const m = map[dir] || map.flat;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      color: m.color, fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600,
      minWidth: value != null ? 28 : undefined, justifyContent: 'flex-end',
    }}>
      <span style={{ fontSize: 9 }}>{m.glyph}</span>
      {value != null && <span>{value}</span>}
    </span>
  );
}

// ── Flag (ISO code → flag emoji, with fallback) ────────────
const FLAG = {
  BRA: '🇧🇷', ARG: '🇦🇷', FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', GER: '🇩🇪',
  ESP: '🇪🇸', POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', CRO: '🇭🇷',
  USA: '🇺🇸', MEX: '🇲🇽', CAN: '🇨🇦', JPN: '🇯🇵', KOR: '🇰🇷',
  MAR: '🇲🇦', SEN: '🇸🇳', URU: '🇺🇾', COL: '🇨🇴', ITA: '🇮🇹',
  AUS: '🇦🇺', DEN: '🇩🇰', SUI: '🇨🇭', POL: '🇵🇱', GHA: '🇬🇭',
};
function Flag({ code, size = 22 }) {
  return (
    <span style={{
      fontSize: size, lineHeight: 1, width: size * 1.3,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }} aria-hidden="true">{FLAG[code] || '🏳️'}</span>
  );
}

// ── Tab bar (mobile bottom nav) ─────────────────────────────
function TabIcon({ name, active, theme }) {
  const c = active ? '#1A1410' : theme.inkMuted;
  const sw = active ? 2.2 : 1.8;
  switch (name) {
    case 'matches':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3l3 4-1.5 4.5h-3L9 7l3-4z" />
          <path d="M3 12l4.5 2 1.5 4.5M21 12l-4.5 2-1.5 4.5M9 7L5 9.5M15 7l4 2.5M9 16.5l-2 3M15 16.5l2 3" />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
          <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" />
          <path d="M9 14h6v3l1 3H8l1-3v-3z" />
        </svg>
      );
    case 'picks':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="14" height="16" rx="2" />
          <path d="M9 4h6v3H9z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'bonus':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.4l-5.25 2.75 1-5.85L3.5 9.15l5.9-.85L12 3z" />
        </svg>
      );
    default: return null;
  }
}

function TabBar({ active, onChange, theme }) {
  const t = theme;
  const items = [
    { id: 'matches',     label: 'Matches' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'picks',       label: 'My Picks' },
    { id: 'bonus',       label: 'Bonus' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTop: `1px solid ${t.border}`,
      background: t.surface,
      paddingBottom: 18, paddingTop: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {items.map(it => {
        const isActive = it.id === active;
        return (
          <button key={it.id}
            onClick={() => onChange && onChange(it.id)}
            style={{
              border: 0, background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '6px 10px', borderRadius: 12,
              color: isActive ? '#1A1410' : t.inkMuted,
              fontFamily: FONTS.body, fontSize: 10.5, fontWeight: isActive ? 700 : 500,
              position: 'relative',
            }}>
            <div style={{
              width: 44, height: 28, borderRadius: 14,
              background: isActive ? t.yellow : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s',
            }}>
              <TabIcon name={it.id} active={isActive} theme={t} />
            </div>
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── App header (mobile) ─────────────────────────────────────
function AppHeader({ theme, you, leagueName }) {
  const t = theme;
  return (
    <div style={{
      padding: '14px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${t.border}`,
      background: t.bg,
    }}>
      <LogoLockup theme={t} compact />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{
          border: 0, background: t.surface, color: t.inkMuted,
          width: 32, height: 32, borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }} aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 8a6 6 0 0112 0v5l1.5 3h-15L6 13V8z" />
            <path d="M10 19a2 2 0 004 0" />
          </svg>
        </button>
        <Avatar name={you} size={32} />
      </div>
    </div>
  );
}

// ── Phone artboard (no specific OS chrome) ──────────────────
function Phone({ theme, children, statusTime = '14:32' }) {
  const t = theme;
  return (
    <div style={{
      width: 380, height: 760,
      background: t.bg, color: t.ink,
      fontFamily: FONTS.body,
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* status bar */}
      <div style={{
        height: 30, padding: '8px 22px 0', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'space-between',
        fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600,
        color: t.ink, letterSpacing: 0.2,
      }}>
        <span>{statusTime}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.85 }}>
          {/* signal */}
          <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor"><rect x="0" y="6" width="2" height="3" rx="0.5"/><rect x="3" y="4" width="2" height="5" rx="0.5"/><rect x="6" y="2" width="2" height="7" rx="0.5"/><rect x="9" y="0" width="2" height="9" rx="0.5"/></svg>
          {/* battery */}
          <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" strokeWidth="0.8"><rect x="0.5" y="0.5" width="16" height="9" rx="2"/><rect x="2" y="2" width="11" height="6" rx="1" fill="currentColor"/><rect x="17.5" y="3.5" width="1.5" height="3" rx="0.6" fill="currentColor"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  RabbitMark, LogoLockup, Avatar, Trend, Flag, FLAG,
  TabBar, TabIcon, AppHeader, Phone,
});
