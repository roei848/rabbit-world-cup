// Mobile screens: Leaderboard, Matches, Picks/Leagues/Bonus

// ── Leaderboard (showcase) ─────────────────────────────────
function LeaderboardScreen({ theme, density, you = 'You' }) {
  const t = theme;
  const top3 = [LEADERBOARD[0], LEADERBOARD[1], LEADERBOARD[2]];
  const youUser = LEADERBOARD.find(u => u.you);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader theme={t} you={you} />

      <div style={{
        flex: 1, overflow: 'auto', paddingBottom: 90,
      }}>
        {/* Title */}
        <div style={{ padding: '14px 18px 6px' }}>
          <div style={{
            fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
            color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
          }}>🏆 Leaderboard · After Matchday 12</div>
          <div style={{
            fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
            color: t.ink, letterSpacing: -0.6, marginTop: 2,
          }}>Black Rabbit HQ</div>
        </div>

        {/* League selector pill */}
        <div style={{ padding: '4px 18px 10px' }}>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px 5px 8px', borderRadius: 999,
            background: t.surface, border: `1px solid ${t.border}`,
            fontFamily: FONTS.body, fontSize: 11.5, fontWeight: 600,
            color: t.ink, cursor: 'pointer',
          }}>
            <span style={{
              width: 16, height: 16, borderRadius: 5, background: t.yellow,
            }} />
            Black Rabbit HQ <span style={{ color: t.inkMuted, fontWeight: 500 }}>· 84</span>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3"/></svg>
          </button>
        </div>

        {/* Podium */}
        <Podium top3={top3} theme={t} />

        {/* User stat bar */}
        <div style={{ padding: '4px 14px 14px', display: 'flex', gap: 8 }}>
          <StatCard label="Your Rank" value={`#${youUser.rank}`} theme={t} />
          <StatCard label="Your Points" value={youUser.pts} theme={t} />
          <StatCard label="Exact Scores" value={youUser.exact} theme={t} />
        </div>

        {/* Section header */}
        <div style={{
          padding: '4px 18px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
            color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
          }}>Full Rankings</div>
          <div style={{
            fontFamily: FONTS.body, fontSize: 11, color: t.inkDim,
          }}>{LEADERBOARD.length} players</div>
        </div>

        {/* Rows */}
        <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LEADERBOARD.map(u => <UserRow key={u.name} user={u} theme={t} density={density} />)}
        </div>
      </div>

      <TabBar active="leaderboard" theme={t} />
    </div>
  );
}

// ── Matches screen ─────────────────────────────────────────
function MatchesScreen({ theme, density, you = 'You', forceState }) {
  const t = theme;

  // Group matches by date
  const grouped = {};
  for (const m of MATCHES) {
    if (!grouped[m.date]) grouped[m.date] = [];
    grouped[m.date].push(m);
  }
  const dateOrder = Object.keys(grouped);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader theme={t} you={you} />

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 90 }}>
        {/* Title + scoring info */}
        <div style={{ padding: '14px 18px 6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
              color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
            }}>⚽ Matches · Make your picks</div>
            <div style={{
              fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
              color: t.ink, letterSpacing: -0.6, marginTop: 2,
            }}>Matchday 13</div>
          </div>
          <button style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 8px', borderRadius: 8,
            color: t.yellow, fontFamily: FONTS.body, fontSize: 11, fontWeight: 600,
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: 7,
              background: t.yellow, color: '#1A1410',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONTS.mono, fontWeight: 800, fontSize: 9,
            }}>?</span>
            Scoring
          </button>
        </div>

        {/* Auto-save status */}
        <div style={{
          margin: '8px 18px 14px',
          padding: '8px 12px', borderRadius: 10,
          background: t.yellowTint,
          border: `1px solid ${t.yellow}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: FONTS.body, fontSize: 11, color: t.ink,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 3, background: t.up,
            }} />
            Picks auto-saved · 4 of 6 set
          </span>
          <span style={{ color: t.inkMuted, fontFamily: FONTS.mono }}>2 left</span>
        </div>

        {/* Match groups */}
        {dateOrder.map(date => (
          <div key={date} style={{ marginBottom: 14 }}>
            <div style={{
              padding: '0 18px 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
                color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
              }}>{date}</div>
              <div style={{
                fontFamily: FONTS.body, fontSize: 11, color: t.inkDim,
              }}>{grouped[date][0].day}</div>
            </div>
            <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[date].map(m => (
                <MatchCard key={m.id} match={m} theme={t} density={density}
                  forceState={forceState && date === 'Today' && m.id === 'm3' ? forceState : undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <TabBar active="matches" theme={t} />
    </div>
  );
}

// ── My Picks screen ─────────────────────────────────────────
function PicksScreen({ theme, density, you = 'You' }) {
  const t = theme;

  const stats = [
    { label: 'Total Picks', value: '47' },
    { label: 'Correct', value: '32' },
    { label: 'Exact', value: '7' },
  ];

  // Filter to user's picks only
  const userPicks = MATCHES.filter(m => m.pick && m.pick.h != null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader theme={t} you={you} />

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 90 }}>
        <div style={{ padding: '14px 18px 6px' }}>
          <div style={{
            fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
            color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
          }}>📋 My Picks</div>
          <div style={{
            fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
            color: t.ink, letterSpacing: -0.6, marginTop: 2,
          }}>Your tournament</div>
        </div>

        {/* Stat bar */}
        <div style={{ padding: '8px 14px 12px', display: 'flex', gap: 8 }}>
          {stats.map(s => <StatCard key={s.label} label={s.label} value={s.value} theme={t} />)}
        </div>

        {/* Filter tabs */}
        <div style={{
          padding: '0 14px 12px',
          display: 'flex', gap: 6,
        }}>
          {['All', 'Pending', 'Won', 'Lost'].map((f, i) => (
            <div key={f} style={{
              padding: '6px 11px', borderRadius: 999,
              background: i === 0 ? t.yellow : 'transparent',
              border: i === 0 ? 'none' : `1px solid ${t.border}`,
              color: i === 0 ? '#1A1410' : t.inkMuted,
              fontFamily: FONTS.body, fontSize: 11, fontWeight: 600,
            }}>{f}</div>
          ))}
        </div>

        {/* Picks list */}
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {userPicks.map(m => <MatchCard key={m.id} match={m} theme={t} density={density} />)}
        </div>

        {/* Scoring legend */}
        <div style={{ padding: '14px 14px 0' }}>
          <ScoringLegend theme={t} />
        </div>
      </div>

      <TabBar active="picks" theme={t} />
    </div>
  );
}

// ── Leagues screen ─────────────────────────────────────────
function LeaguesScreen({ theme, you = 'You' }) {
  const t = theme;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader theme={t} you={you} />

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 90 }}>
        <div style={{ padding: '14px 18px 6px' }}>
          <div style={{
            fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
            color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
          }}>🏟 Your Leagues</div>
          <div style={{
            fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
            color: t.ink, letterSpacing: -0.6, marginTop: 2,
          }}>5 leagues · 446 players</div>
        </div>

        {/* CTAs */}
        <div style={{ padding: '8px 14px 14px', display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, border: 0, padding: '11px 12px', borderRadius: 12,
            background: t.yellow, color: '#1A1410',
            fontFamily: FONTS.display, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>+</span> Create league
          </button>
          <button style={{
            flex: 1, padding: '11px 12px', borderRadius: 12,
            background: 'transparent', color: t.ink,
            border: `1px solid ${t.borderHi}`,
            fontFamily: FONTS.display, fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
          }}>Join with code</button>
        </div>

        {/* League grid */}
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LEAGUES.map(lg => <LeagueCard key={lg.id} league={lg} theme={t} />)}
        </div>
      </div>

      <TabBar active="leaderboard" theme={t} />
    </div>
  );
}

function LeagueCard({ league, theme }) {
  const t = theme;
  const c = USER_COLORS[league.color] || USER_COLORS.pink;
  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: league.color === 'yellow' ? t.yellow : c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: league.color === 'yellow' ? `0 0 20px ${t.yellow}33` : 'none',
      }}>
        <RabbitMark size={22} color={league.color === 'yellow' ? '#1A1410' : c.ink} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONTS.display, fontWeight: 700, fontSize: 14, color: t.ink,
        }}>{league.name}</div>
        <div style={{
          fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted, marginTop: 2,
        }}>{league.members} members</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: FONTS.body, fontSize: 9, fontWeight: 700,
          color: t.inkDim, letterSpacing: 0.6, textTransform: 'uppercase',
        }}>Your Rank</div>
        <div style={{
          fontFamily: FONTS.display, fontSize: 18, fontWeight: 800,
          color: league.rank <= 3 ? t.yellow : t.ink, lineHeight: 1.1,
        }}>#{league.rank}</div>
        <div style={{
          fontFamily: FONTS.mono, fontSize: 10.5, color: t.inkMuted, marginTop: 1,
        }}>of {league.members}</div>
      </div>
    </div>
  );
}

// ── Bonus screen ─────────────────────────────────────────────
function BonusScreen({ theme, you = 'You' }) {
  const t = theme;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader theme={t} you={you} />

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 90 }}>
        <div style={{ padding: '14px 18px 6px' }}>
          <div style={{
            fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
            color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
          }}>⭐ Bonus Points</div>
          <div style={{
            fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
            color: t.ink, letterSpacing: -0.6, marginTop: 2,
          }}>Streaks & badges</div>
        </div>

        {/* Streak banner */}
        <div style={{
          margin: '6px 14px 14px',
          padding: 14, borderRadius: 14,
          background: `linear-gradient(135deg, ${t.yellow} 0%, ${shade(t.yellow, -15)} 100%)`,
          color: '#1A1410',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -10, top: -10,
            opacity: 0.18,
          }}>
            <RabbitMark size={86} color="#1A1410" />
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(26,20,16,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>🔥</div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{
              fontFamily: FONTS.body, fontSize: 9.5, fontWeight: 700,
              letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.7,
            }}>Current streak</div>
            <div style={{
              fontFamily: FONTS.display, fontSize: 22, fontWeight: 800,
              letterSpacing: -0.5, lineHeight: 1.1,
            }}>3 exact scores</div>
            <div style={{
              fontFamily: FONTS.body, fontSize: 11, marginTop: 2, opacity: 0.75,
            }}>2 more for +10 bonus pts</div>
          </div>
        </div>

        {/* Bonus list */}
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BONUS.map(b => <BonusCard key={b.id} bonus={b} theme={t} />)}
        </div>
      </div>

      <TabBar active="bonus" theme={t} />
    </div>
  );
}

function BonusCard({ bonus, theme }) {
  const t = theme;
  const stateChrome = {
    completed: { bg: 'rgba(61,214,140,0.10)', border: 'rgba(61,214,140,0.3)', label: 'COMPLETED', labelColor: t.up },
    progress:  { bg: t.surface, border: t.border, label: 'IN PROGRESS', labelColor: t.yellow },
    available: { bg: t.surface, border: t.border, label: 'AVAILABLE', labelColor: t.inkMuted },
    locked:    { bg: t.surface, border: t.border, label: 'LOCKED', labelColor: t.inkDim },
  };
  const c = stateChrome[bonus.state];
  const isLocked = bonus.state === 'locked';

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 14,
      padding: '12px 14px',
      opacity: isLocked ? 0.55 : 1,
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: FONTS.mono, fontSize: 9, fontWeight: 800,
              color: c.labelColor, letterSpacing: 0.6,
            }}>{c.label}</span>
            <span style={{
              fontFamily: FONTS.display, fontSize: 11, fontWeight: 800, color: t.yellow,
            }}>{bonus.reward}</span>
          </div>
          <div style={{
            fontFamily: FONTS.display, fontWeight: 700, fontSize: 14, color: t.ink,
          }}>{bonus.title}</div>
          <div style={{
            fontFamily: FONTS.body, fontSize: 11.5, color: t.inkMuted, marginTop: 1,
          }}>{bonus.subtitle}</div>
          {bonus.state === 'progress' && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                height: 5, borderRadius: 3, background: t.surface2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${(bonus.progress/bonus.total)*100}%`,
                  background: t.yellow,
                }} />
              </div>
              <div style={{
                marginTop: 4, fontFamily: FONTS.mono, fontSize: 10, color: t.inkMuted,
              }}>{bonus.progress} / {bonus.total}</div>
            </div>
          )}
          {bonus.state === 'locked' && (
            <div style={{
              marginTop: 4, fontFamily: FONTS.body, fontSize: 10.5, color: t.inkDim,
            }}>{bonus.unlocks}</div>
          )}
        </div>
        {bonus.state === 'completed' && (
          <span style={{
            width: 24, height: 24, borderRadius: 12,
            background: t.up, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONTS.mono, fontWeight: 800, fontSize: 12,
            flexShrink: 0,
          }}>✓</span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  LeaderboardScreen, MatchesScreen, PicksScreen, LeaguesScreen, LeagueCard, BonusScreen, BonusCard,
});
