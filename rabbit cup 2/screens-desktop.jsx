// Desktop adaptations + Component sheet

// ── Desktop Leaderboard ──────────────────────────────────────
function LeaderboardDesktop({ theme, density, you = 'You' }) {
  const t = theme;
  const top3 = [LEADERBOARD[0], LEADERBOARD[1], LEADERBOARD[2]];
  const youUser = LEADERBOARD.find(u => u.you);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.ink, fontFamily: FONTS.body,
    }}>
      <DesktopTopNav theme={t} active="leaderboard" you={you} />

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 22,
        }}>
          <div>
            <div style={{
              fontFamily: FONTS.body, fontSize: 11, fontWeight: 700,
              color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
            }}>🏆 Leaderboard · After Matchday 12</div>
            <div style={{
              fontFamily: FONTS.display, fontSize: 34, fontWeight: 800,
              color: t.ink, letterSpacing: -1, marginTop: 6,
            }}>Black Rabbit HQ</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['HQ', 'Design', 'Eng', 'Worldwide'].map((l, i) => (
              <div key={l} style={{
                padding: '7px 13px', borderRadius: 999,
                background: i === 0 ? t.yellow : 'transparent',
                border: i === 0 ? 'none' : `1px solid ${t.border}`,
                color: i === 0 ? '#1A1410' : t.inkMuted,
                fontFamily: FONTS.body, fontSize: 12, fontWeight: 600,
              }}>{l}</div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22 }}>
          {/* Left: podium + rankings */}
          <div>
            <div style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18,
              padding: '12px 12px 18px', marginBottom: 16,
            }}>
              <Podium top3={top3} theme={t} />
            </div>

            <div style={{
              fontFamily: FONTS.body, fontSize: 11, fontWeight: 700,
              color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
              padding: '4px 4px 10px',
            }}>Full rankings · {LEADERBOARD.length} players</div>

            <div style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
              padding: 6,
            }}>
              {LEADERBOARD.map(u => <UserRow key={u.name} user={u} theme={t} density={density} />)}
            </div>
          </div>

          {/* Right: your panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18,
              padding: 18,
            }}>
              <div style={{
                fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
                color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12,
              }}>Your tournament</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <StatCard label="Rank" value={`#${youUser.rank}`} theme={t} />
                <StatCard label="Points" value={youUser.pts} theme={t} />
                <StatCard label="Exact" value={youUser.exact} theme={t} />
              </div>
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: t.yellowTint, border: `1px solid ${t.yellow}33`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>📈</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, color: t.ink,
                  }}>You climbed 3 spots this week</div>
                  <div style={{
                    fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted, marginTop: 1,
                  }}>+26 pts since matchday 11</div>
                </div>
              </div>
            </div>

            <ScoringLegend theme={t} />

            <div style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18,
              padding: 18,
            }}>
              <div style={{
                fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
                color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10,
              }}>Movers</div>
              {LEADERBOARD.filter(u => Math.abs(u.prev - u.rank) >= 2).slice(0,4).map(u => (
                <div key={u.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  <Avatar name={u.name} size={26} />
                  <span style={{
                    flex: 1, fontFamily: FONTS.body, fontSize: 12.5, color: t.ink, fontWeight: 500,
                  }}>{u.name}</span>
                  <Trend dir={u.prev > u.rank ? 'up' : 'down'} value={Math.abs(u.prev - u.rank)} theme={t} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopTopNav({ theme, active, you = 'You' }) {
  const t = theme;
  const items = [
    { id: 'matches',     label: 'Matches' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'picks',       label: 'My Picks' },
    { id: 'bonus',       label: 'Bonus' },
  ];
  return (
    <div style={{
      borderBottom: `1px solid ${t.border}`, background: t.bg,
      padding: '14px 36px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <LogoLockup theme={t} />
        <div style={{ display: 'flex', gap: 4 }}>
          {items.map(it => (
            <div key={it.id} style={{
              padding: '7px 12px', borderRadius: 8,
              background: it.id === active ? t.yellowTint : 'transparent',
              color: it.id === active ? t.yellow : t.inkMuted,
              fontFamily: FONTS.body, fontSize: 13,
              fontWeight: it.id === active ? 700 : 500,
            }}>{it.label}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          padding: '6px 12px', borderRadius: 999, border: `1px solid ${t.border}`,
          fontFamily: FONTS.body, fontSize: 11.5, color: t.inkMuted,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: t.up }} />
          MD13 picks open · 2 left
        </div>
        <Avatar name={you} size={32} />
      </div>
    </div>
  );
}

// ── Desktop Matches ──────────────────────────────────────────
function MatchesDesktop({ theme, density, you = 'You', forceState }) {
  const t = theme;
  const grouped = {};
  for (const m of MATCHES) {
    if (!grouped[m.date]) grouped[m.date] = [];
    grouped[m.date].push(m);
  }
  const dateOrder = Object.keys(grouped);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.ink, fontFamily: FONTS.body,
    }}>
      <DesktopTopNav theme={t} active="matches" you={you} />

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18,
        }}>
          <div>
            <div style={{
              fontFamily: FONTS.body, fontSize: 11, fontWeight: 700,
              color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
            }}>⚽ Matches</div>
            <div style={{
              fontFamily: FONTS.display, fontSize: 30, fontWeight: 800,
              color: t.ink, letterSpacing: -1, marginTop: 4,
            }}>Matchday 13</div>
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: 12,
            background: t.yellowTint, border: `1px solid ${t.yellow}33`,
            display: 'flex', alignItems: 'center', gap: 9,
            fontFamily: FONTS.body, fontSize: 12, color: t.ink,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: t.up }} />
            Picks auto-saved · 4 of 6 set
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22 }}>
          <div>
            {dateOrder.map(date => (
              <div key={date} style={{ marginBottom: 18 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
                }}>
                  <div style={{
                    fontFamily: FONTS.body, fontSize: 11, fontWeight: 700,
                    color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase',
                  }}>{date}</div>
                  <div style={{
                    fontFamily: FONTS.body, fontSize: 11.5, color: t.inkDim,
                  }}>{grouped[date][0].day}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped[date].map(m => (
                    <MatchCard key={m.id} match={m} theme={t} density={density}
                      forceState={forceState && date === 'Today' && m.id === 'm3' ? forceState : undefined} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ScoringLegend theme={t} />
            <div style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16,
            }}>
              <div style={{
                fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
                color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10,
              }}>Streak</div>
              <div style={{
                fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: t.ink,
              }}>🔥 3 exact in a row</div>
              <div style={{
                fontFamily: FONTS.body, fontSize: 11.5, color: t.inkMuted, marginTop: 4,
              }}>2 more for +10 bonus pts.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component sheet ──────────────────────────────────────────
function ComponentSheet({ theme }) {
  const t = theme;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: t.bg, color: t.ink, fontFamily: FONTS.body,
      padding: 28, overflow: 'auto',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        <SheetCell label="Logo lockup" theme={t}>
          <LogoLockup theme={t} />
        </SheetCell>
        <SheetCell label="Logo lockup · compact" theme={t}>
          <LogoLockup theme={t} compact />
        </SheetCell>
        <SheetCell label="Avatars" theme={t}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Maya O','Theo A','Priya S','Liam H','Sara T','Jonas B','Emma L'].map(n =>
              <Avatar key={n} name={n} size={32} />)}
          </div>
        </SheetCell>

        <SheetCell label="Tab bar · active states" theme={t}>
          <div style={{ position: 'relative', height: 70, background: t.surface, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <TabBar active="leaderboard" theme={t} />
            </div>
          </div>
        </SheetCell>

        <SheetCell label="Trend arrows" theme={t}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Trend dir="up" value={3} theme={t} />
            <Trend dir="down" value={2} theme={t} />
            <Trend dir="flat" value={null} theme={t} />
          </div>
        </SheetCell>

        <SheetCell label="Stat cards" theme={t}>
          <div style={{ display: 'flex', gap: 8 }}>
            <StatCard label="Rank" value="#5" theme={t} />
            <StatCard label="Points" value="158" theme={t} />
            <StatCard label="Exact" value="7" theme={t} />
          </div>
        </SheetCell>

        <SheetCell label="Match · upcoming" theme={t} span={2}>
          <MatchCard match={MATCHES[2]} theme={t} />
        </SheetCell>
        <SheetCell label="Match · live" theme={t}>
          <MatchCard match={MATCHES[1]} theme={t} />
        </SheetCell>
        <SheetCell label="Match · finished + breakdown" theme={t} span={3}>
          <MatchCard match={MATCHES[0]} theme={t} />
        </SheetCell>

        <SheetCell label="User row · standard" theme={t} span={2}>
          <UserRow user={LEADERBOARD[1]} theme={t} />
        </SheetCell>
        <SheetCell label="User row · you (highlighted)" theme={t}>
          <UserRow user={LEADERBOARD.find(u => u.you)} theme={t} />
        </SheetCell>

        <SheetCell label="Scoring legend" theme={t} span={2}>
          <ScoringLegend theme={t} />
        </SheetCell>
        <SheetCell label="Toasts" theme={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            <Toast message="Pick saved · BRA 2 – 1 SUI" theme={t} kind="success" />
            <Toast message="Match locked at kickoff" theme={t} kind="info" />
            <Toast message="Couldn't save — try again" theme={t} kind="error" />
          </div>
        </SheetCell>

        <SheetCell label="Loader · hop" theme={t}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
            <RabbitLoader theme={t} variant="hop" />
          </div>
        </SheetCell>
        <SheetCell label="Loader · ears" theme={t}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
            <RabbitLoader theme={t} variant="ears" />
          </div>
        </SheetCell>
        <SheetCell label="Loader · paws" theme={t}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
            <RabbitLoader theme={t} variant="paws" />
          </div>
        </SheetCell>

        <SheetCell label="Empty state" theme={t} span={3}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            padding: '24px 0',
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: 22,
              background: t.yellowTint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RabbitMark size={42} color={t.yellow} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: t.ink,
              }}>No picks yet — the rabbit is waiting</div>
              <div style={{
                fontFamily: FONTS.body, fontSize: 12, color: t.inkMuted, marginTop: 4,
              }}>Open today's matches to set your scores.</div>
            </div>
            <button style={{
              border: 0, padding: '9px 16px', borderRadius: 10,
              background: t.yellow, color: '#1A1410',
              fontFamily: FONTS.display, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            }}>Make your first pick</button>
          </div>
        </SheetCell>

        <SheetCell label="Color palette · users" theme={t} span={3}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {USER_COLOR_KEYS.map(k => (
              <div key={k} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', background: USER_COLORS[k].bg,
                }} />
                <div style={{
                  fontFamily: FONTS.mono, fontSize: 10, color: t.inkMuted,
                }}>{k}</div>
              </div>
            ))}
            <div style={{ width: 1, background: t.border, margin: '0 6px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: t.yellow }} />
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: t.inkMuted }}>yellow</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}` }} />
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: t.inkMuted }}>bg</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: t.surface, border: `1px solid ${t.border}` }} />
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: t.inkMuted }}>surface</div>
            </div>
          </div>
        </SheetCell>
      </div>
    </div>
  );
}

function SheetCell({ label, children, theme, span = 1 }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 14, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        fontFamily: FONTS.body, fontSize: 9.5, fontWeight: 700,
        color: theme.inkMuted, letterSpacing: 1, textTransform: 'uppercase',
      }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

Object.assign(window, {
  LeaderboardDesktop, MatchesDesktop, DesktopTopNav, ComponentSheet, SheetCell,
});
