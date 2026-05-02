// Bigger UI primitives: Podium, UserRow, StatCard, MatchCard, RabbitLoader, Toast, ScoringLegend

// ── Podium ─────────────────────────────────────────────────
// Faux-3D isometric blocks. #1 center & taller, glowing yellow.
function Podium({ top3, theme }) {
  const t = theme;
  // top3 expected as [first, second, third]
  const [first, second, third] = top3;
  const blocks = [
    { user: second, height: 78,  rank: 2, color: t.podiumSilver, glow: false },
    { user: first,  height: 110, rank: 1, color: t.podiumGold,   glow: true  },
    { user: third,  height: 58,  rank: 3, color: t.podiumBronze, glow: false },
  ];

  return (
    <div style={{
      position: 'relative',
      padding: '8px 12px 0',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 14,
      minHeight: 220,
    }}>
      {/* radial halo behind #1 */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 60,
        transform: 'translateX(-50%)',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${t.yellow}33 0%, ${t.yellow}11 40%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      {blocks.map((b, i) => (
        <PodiumBlock key={i} {...b} theme={t} isWinner={b.rank === 1} />
      ))}
    </div>
  );
}

function PodiumBlock({ user, height, rank, color, theme, isWinner }) {
  const t = theme;
  const depth = 12; // isometric depth
  const w = isWinner ? 92 : 78;
  const avatarSize = isWinner ? 56 : 44;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      position: 'relative', zIndex: 1,
    }}>
      {/* avatar with crown / medal */}
      <div style={{ position: 'relative' }}>
        {isWinner && (
          <div style={{
            position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%) rotate(-8deg)',
            fontSize: 18, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}>👑</div>
        )}
        <div style={{
          boxShadow: isWinner
            ? `0 0 0 3px ${t.yellow}, 0 0 24px ${t.yellow}66, 0 8px 20px rgba(0,0,0,0.3)`
            : `0 0 0 2.5px ${color}, 0 4px 12px rgba(0,0,0,0.25)`,
          borderRadius: '50%',
        }}>
          <Avatar name={user.name} size={avatarSize} />
        </div>
      </div>

      {/* name + points */}
      <div style={{ textAlign: 'center', marginBottom: 2 }}>
        <div style={{
          fontFamily: FONTS.display, fontSize: isWinner ? 13 : 12, fontWeight: 600,
          color: t.ink, lineHeight: 1.2, maxWidth: 90,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{user.name}</div>
        <div style={{
          fontFamily: FONTS.mono, fontSize: isWinner ? 14 : 12, fontWeight: 700,
          color: isWinner ? t.yellow : t.ink, marginTop: 2,
        }}>{user.pts} <span style={{ fontSize: 9, color: t.inkMuted, fontWeight: 500 }}>PTS</span></div>
      </div>

      {/* isometric block */}
      <div style={{
        position: 'relative',
        width: w, height,
        marginTop: 4,
      }}>
        {/* top face */}
        <div style={{
          position: 'absolute', left: depth, top: -depth/2,
          width: w, height: depth,
          background: `linear-gradient(180deg, ${color} 0%, ${shade(color, -10)} 100%)`,
          transform: `skewX(-45deg)`,
          transformOrigin: 'left bottom',
          opacity: 0.85,
        }} />
        {/* right face */}
        <div style={{
          position: 'absolute', right: -depth, top: depth/2,
          width: depth, height,
          background: shade(color, -25),
          transform: `skewY(-45deg)`,
          transformOrigin: 'left top',
        }} />
        {/* front face */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, ${color} 0%, ${shade(color, -18)} 100%)`,
          boxShadow: isWinner ? `inset 0 0 0 1px ${shade(color, 15)}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: FONTS.display, fontWeight: 800,
            fontSize: isWinner ? 36 : 28,
            color: isWinner ? '#1A1410' : 'rgba(0,0,0,0.55)',
            textShadow: isWinner ? '0 1px 0 rgba(255,255,255,0.3)' : 'none',
            lineHeight: 1,
          }}>{rank}</div>
        </div>
      </div>
    </div>
  );
}

// shade(color, percent): lighten/darken hex
function shade(hex, percent) {
  const n = hex.replace('#', '');
  const r = parseInt(n.substring(0,2), 16);
  const g = parseInt(n.substring(2,4), 16);
  const b = parseInt(n.substring(4,6), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (percent/100) * 255)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

// ── UserRow ─────────────────────────────────────────────────
function UserRow({ user, theme, density = 'comfortable' }) {
  const t = theme;
  const isCompact = density === 'compact';
  const trendDelta = user.prev - user.rank; // +ve = moved up
  const trendDir = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'flat';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: isCompact ? '8px 14px' : '12px 14px',
      borderRadius: 12,
      background: user.you ? t.rowYou : 'transparent',
      border: user.you ? `1px solid ${t.rowYouBd}` : '1px solid transparent',
    }}>
      {/* rank */}
      <div style={{
        width: 22, textAlign: 'center',
        fontFamily: FONTS.mono, fontSize: 13, fontWeight: 700,
        color: user.you ? t.yellow : t.inkMuted,
        flexShrink: 0,
      }}>{user.rank}</div>

      {/* avatar */}
      <Avatar name={user.name} size={isCompact ? 30 : 36} />

      {/* name + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONTS.display, fontWeight: 600, fontSize: 13.5,
          color: t.ink, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {user.name}
          {user.you && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
              padding: '2px 5px', borderRadius: 4,
              background: t.yellow, color: '#1A1410',
            }}>YOU</span>
          )}
        </div>
        {!isCompact && (
          <div style={{
            fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted, marginTop: 1,
          }}>
            <span style={{ color: t.inkMuted }}>{user.exact} exact{user.exact === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      {/* trend */}
      <Trend dir={trendDir} value={Math.abs(trendDelta) || null} theme={t} />

      {/* points */}
      <div style={{
        fontFamily: FONTS.mono, fontWeight: 700, fontSize: 14,
        color: t.yellow, minWidth: 38, textAlign: 'right',
      }}>{user.pts}</div>
    </div>
  );
}

// ── StatCard ────────────────────────────────────────────────
function StatCard({ label, value, icon, theme, accent = false }) {
  const t = theme;
  return (
    <div style={{
      flex: 1,
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 14,
      padding: '12px 12px 11px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        fontFamily: FONTS.body, fontSize: 9.5, fontWeight: 600,
        color: t.inkMuted, letterSpacing: 0.6, textTransform: 'uppercase',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
        color: t.yellow, lineHeight: 1, letterSpacing: -0.5,
      }}>{value}</div>
      {icon && (
        <div style={{ position: 'absolute', top: 10, right: 10, opacity: 0.5, color: t.inkMuted }}>
          {icon}
        </div>
      )}
    </div>
  );
}

// ── ScoreInput ──────────────────────────────────────────────
function ScoreInput({ value, theme, locked, side, onChange }) {
  const t = theme;
  const display = value == null ? '—' : value;
  return (
    <div style={{
      width: 34, height: 38, borderRadius: 8,
      background: locked ? 'transparent' : t.surface2,
      border: `1px solid ${locked ? t.border : (value != null ? t.borderHi : t.border)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONTS.mono, fontSize: 18, fontWeight: 700,
      color: value != null ? t.ink : t.inkDim,
    }}>{display}</div>
  );
}

// ── Match Card ──────────────────────────────────────────────
function MatchCard({ match, theme, density = 'comfortable', forceState }) {
  const t = theme;
  const m = match;
  const state = forceState || m.state;
  const isCompact = density === 'compact';

  const stage = STAGES.find(s => s.id === m.stage);

  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 14,
      padding: isCompact ? '10px 12px' : '12px 14px 13px',
    }}>
      {/* top meta row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: FONTS.body, fontSize: 10, fontWeight: 600,
          color: t.inkMuted, letterSpacing: 0.5, textTransform: 'uppercase',
        }}>{m.stageLabel} <span style={{ color: t.inkDim }}>·</span> <span style={{ color: t.yellow }}>×{stage.mult}</span></div>
        <MatchStatePill state={state} match={m} theme={t} />
      </div>

      {/* teams + scores */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* home */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Flag code={m.home} size={20} />
          <span style={{
            fontFamily: FONTS.display, fontWeight: 600, fontSize: 14,
            color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{TEAMS[m.home]}</span>
        </div>

        {/* center: score input area */}
        <MatchCenter match={m} state={state} theme={t} />

        {/* away */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexDirection: 'row-reverse' }}>
          <Flag code={m.away} size={20} />
          <span style={{
            fontFamily: FONTS.display, fontWeight: 600, fontSize: 14,
            color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textAlign: 'right',
          }}>{TEAMS[m.away]}</span>
        </div>
      </div>

      {/* finished — scoring breakdown */}
      {state === 'finished' && m.actual && m.pick && m.pick.h != null && (
        <FinishedBreakdown match={m} stage={stage} theme={t} />
      )}

      {/* live — your pick reminder */}
      {state === 'live' && m.pick && m.pick.h != null && (
        <div style={{
          marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted,
        }}>
          <span>Your pick: <span style={{ color: t.ink, fontFamily: FONTS.mono, fontWeight: 700 }}>{m.pick.h}–{m.pick.a}</span></span>
          <span style={{ color: t.live, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 3, background: t.live,
              animation: 'br-pulse 1.4s infinite',
            }} />
            Predictions locked
          </span>
        </div>
      )}

      {/* upcoming — kickoff + tip */}
      {state === 'upcoming' && (
        <div style={{
          marginTop: 8,
          fontFamily: FONTS.body, fontSize: 10.5, color: t.inkDim,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Locks at kickoff · {m.day} {m.kickoff}</span>
          {m.pick && m.pick.h != null && (
            <span style={{
              color: t.up,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-6"/></svg>
              Saved
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCenter({ match, state, theme }) {
  const t = theme;
  const live = match.live || { h: 0, a: 0, minute: 23 };
  const actual = match.actual || { h: 1, a: 1 };
  if (state === 'live') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(244,85,74,0.12)',
        border: `1px solid rgba(244,85,74,0.3)`,
      }}>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink,
        }}>{live.h}</span>
        <span style={{ fontFamily: FONTS.mono, color: t.inkDim, fontSize: 12 }}>:</span>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink,
        }}>{live.a}</span>
      </div>
    );
  }
  if (state === 'finished') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 8,
        background: t.surface2,
      }}>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink,
        }}>{actual.h}</span>
        <span style={{ fontFamily: FONTS.mono, color: t.inkDim, fontSize: 12 }}>:</span>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: t.ink,
        }}>{actual.a}</span>
      </div>
    );
  }
  // upcoming — score inputs
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <ScoreInput value={match.pick?.h} theme={t} locked={false} side="h" />
      <span style={{ fontFamily: FONTS.mono, color: t.inkDim, fontSize: 12 }}>:</span>
      <ScoreInput value={match.pick?.a} theme={t} locked={false} side="a" />
    </div>
  );
}

function MatchStatePill({ state, match, theme }) {
  const t = theme;
  const live = match.live || { minute: 23 };
  if (state === 'live') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 8px', borderRadius: 999,
        background: 'rgba(244,85,74,0.14)', color: t.live,
        fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 3, background: t.live,
          animation: 'br-pulse 1.4s infinite',
        }} />
        LIVE · {live.minute}'
      </span>
    );
  }
  if (state === 'finished') {
    return (
      <span style={{
        padding: '3px 8px', borderRadius: 999,
        background: t.surface2, color: t.inkMuted,
        fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      }}>FINAL</span>
    );
  }
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 999,
      background: 'transparent', color: t.inkMuted,
      border: `1px solid ${t.border}`,
      fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
    }}>{match.kickoff}</span>
  );
}

function FinishedBreakdown({ match, stage, theme }) {
  const t = theme;
  const m = match;
  const winnerActual = m.actual.h > m.actual.a ? 'h' : m.actual.h < m.actual.a ? 'a' : 'd';
  const winnerPick = m.pick.h > m.pick.a ? 'h' : m.pick.h < m.pick.a ? 'a' : 'd';
  const winnerOk = winnerActual === winnerPick;
  const gapActual = m.actual.h - m.actual.a;
  const gapPick = m.pick.h - m.pick.a;
  const gapOk = winnerOk && gapActual === gapPick;
  const exactOk = winnerOk && m.pick.h === m.actual.h && m.pick.a === m.actual.a;

  let base = 0;
  if (exactOk) base = 3; else if (gapOk) base = 2; else if (winnerOk) base = 1;
  const total = base * stage.mult;

  const Tick = ({ ok }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 13, height: 13, borderRadius: 7,
      background: ok ? 'rgba(61,214,140,0.18)' : 'rgba(244,85,74,0.14)',
      color: ok ? t.up : t.down,
      fontFamily: FONTS.mono, fontSize: 9, fontWeight: 800,
    }}>{ok ? '✓' : '✗'}</span>
  );

  return (
    <div style={{
      marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${t.border}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted,
      }}>
        <span>Pick <span style={{ color: t.ink, fontFamily: FONTS.mono, fontWeight: 700 }}>{m.pick.h}–{m.pick.a}</span></span>
        <span style={{
          fontFamily: FONTS.display, fontSize: 14, fontWeight: 700,
          color: total > 0 ? t.yellow : t.inkMuted,
        }}>+{total} pts</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        fontFamily: FONTS.mono, fontSize: 10.5, color: t.inkMuted,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Tick ok={winnerOk} /> Winner
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Tick ok={gapOk} /> Gap
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Tick ok={exactOk} /> Exact
        </span>
        <span style={{ marginLeft: 'auto', color: t.inkDim }}>
          {base}pt × {stage.label} ×{stage.mult}
        </span>
      </div>
    </div>
  );
}

// ── Rabbit Loader ────────────────────────────────────────────
function RabbitLoader({ theme, variant = 'hop', size = 'md' }) {
  const t = theme;
  const big = size === 'lg';
  if (variant === 'hop') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ height: big ? 48 : 32, position: 'relative', width: big ? 64 : 48 }}>
          <div style={{
            position: 'absolute', bottom: 0, left: '50%',
            transform: 'translateX(-50%)',
            animation: 'br-hop 0.85s cubic-bezier(0.4, 0, 0.4, 1) infinite',
          }}>
            <RabbitMark size={big ? 38 : 28} color={t.yellow} />
          </div>
          {/* shadow */}
          <div style={{
            position: 'absolute', bottom: -3, left: '50%',
            transform: 'translateX(-50%)',
            width: big ? 32 : 22, height: 4, borderRadius: '50%',
            background: t.inkDim, opacity: 0.3,
            animation: 'br-shadow 0.85s cubic-bezier(0.4, 0, 0.4, 1) infinite',
          }} />
        </div>
        <div style={{
          fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted,
          letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600,
        }}>Hopping over…</div>
      </div>
    );
  }
  if (variant === 'ears') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <svg width={big ? 56 : 40} height={big ? 56 : 40} viewBox="0 0 24 24">
          <ellipse cx="8.5" cy="6" rx="2.2" ry="4.5" fill={t.yellow}
            style={{ transformOrigin: '8.5px 9px', animation: 'br-ear-l 1.2s ease-in-out infinite' }} />
          <ellipse cx="15.5" cy="6" rx="2.2" ry="4.5" fill={t.yellow}
            style={{ transformOrigin: '15.5px 9px', animation: 'br-ear-r 1.2s ease-in-out infinite' }} />
          <ellipse cx="12" cy="15" rx="6.5" ry="6" fill={t.yellow} />
        </svg>
        <div style={{
          fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted,
          letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600,
        }}>Listening…</div>
      </div>
    );
  }
  // paws
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            animation: 'br-paw 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}>
            {/* paw print: 4 toes + pad */}
            <div style={{ display: 'flex', gap: 1.5 }}>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: t.yellow }} />
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: t.yellow }} />
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: t.yellow }} />
            </div>
            <span style={{ width: 9, height: 6, borderRadius: '50% 50% 40% 40%', background: t.yellow }} />
          </div>
        ))}
      </div>
      <div style={{
        fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted,
        letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600,
      }}>Tracking…</div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ message, theme, kind = 'success' }) {
  const t = theme;
  const colors = {
    success: { bg: t.yellow, ink: '#1A1410', icon: '✓' },
    info:    { bg: t.surface, ink: t.ink, icon: 'ℹ' },
    error:   { bg: t.live, ink: '#fff', icon: '!' },
  };
  const c = colors[kind];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 14,
      background: c.bg, color: c.ink,
      fontFamily: FONTS.body, fontSize: 12.5, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      border: kind === 'info' ? `1px solid ${t.border}` : 'none',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.15)',
        fontFamily: FONTS.mono, fontWeight: 800, fontSize: 11,
      }}>{c.icon}</span>
      {message}
    </div>
  );
}

// ── Scoring Legend (tooltip card) ─────────────────────────────
function ScoringLegend({ theme }) {
  const t = theme;
  const Row = ({ label, pts }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0',
    }}>
      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: t.ink }}>{label}</span>
      <span style={{
        fontFamily: FONTS.mono, fontSize: 12, fontWeight: 700, color: t.yellow,
      }}>{pts}</span>
    </div>
  );

  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 14,
      padding: '14px 14px 12px',
      width: '100%',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: 8, background: t.yellow,
          color: '#1A1410',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONTS.mono, fontSize: 11, fontWeight: 800,
        }}>?</span>
        <span style={{
          fontFamily: FONTS.display, fontSize: 12.5, fontWeight: 700, color: t.ink,
          letterSpacing: 0.4, textTransform: 'uppercase',
        }}>How scoring works</span>
      </div>
      <div style={{ borderTop: `1px solid ${t.border}` }}>
        <Row label="Winner correct" pts="1 pt" />
        <Row label="Winner + goal difference" pts="2 pts" />
        <Row label="Winner + exact score" pts="3 pts" />
      </div>
      <div style={{
        marginTop: 8, padding: '8px 10px', borderRadius: 8,
        background: t.yellowTint,
        fontFamily: FONTS.body, fontSize: 11, color: t.ink, lineHeight: 1.5,
      }}>
        Multiplied by stage: Group ×1 · R16 ×2 · QF ×3 · SF ×4 · Final ×5.
      </div>
    </div>
  );
}

Object.assign(window, {
  Podium, PodiumBlock, UserRow, StatCard, ScoreInput, MatchCard, MatchCenter,
  MatchStatePill, FinishedBreakdown, RabbitLoader, Toast, ScoringLegend, shade,
});
