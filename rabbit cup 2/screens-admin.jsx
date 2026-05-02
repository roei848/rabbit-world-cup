// Admin panel + Desktop adaptations + Component sheet

// ── Admin panel (desktop-style with sidebar) ────────────────
function AdminPanel({ theme }) {
  const t = theme;
  const [tab, setTab] = React.useState('users');

  const tabs = [
    { id: 'users',     label: 'User management', icon: 'U' },
    { id: 'points',    label: 'Point adjustments', icon: 'P' },
    { id: 'stages',    label: 'Stage multipliers', icon: 'S' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: t.bg, color: t.ink, fontFamily: FONTS.body,
    }}>
      {/* Sidebar */}
      <div style={{
        width: 220, borderRight: `1px solid ${t.border}`,
        padding: 18, display: 'flex', flexDirection: 'column', gap: 16,
        background: t.surface,
      }}>
        <LogoLockup theme={t} compact />
        <div style={{
          padding: '6px 8px', borderRadius: 8,
          background: t.yellowTint,
          fontFamily: FONTS.body, fontSize: 10.5, fontWeight: 700,
          color: t.yellow, letterSpacing: 0.6, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: t.yellow }} />
          Admin
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
          {tabs.map(it => (
            <button key={it.id} onClick={() => setTab(it.id)}
              style={{
                border: 0, cursor: 'pointer', textAlign: 'left',
                padding: '9px 10px', borderRadius: 9,
                background: tab === it.id ? t.surface2 : 'transparent',
                color: tab === it.id ? t.ink : t.inkMuted,
                fontFamily: FONTS.body, fontSize: 12.5,
                fontWeight: tab === it.id ? 600 : 500,
                display: 'flex', alignItems: 'center', gap: 9,
              }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                background: tab === it.id ? t.yellow : t.surface2,
                color: tab === it.id ? '#1A1410' : t.inkMuted,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONTS.display, fontSize: 11, fontWeight: 800,
              }}>{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: t.surface2, border: `1px solid ${t.border}`,
          fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted, lineHeight: 1.4,
        }}>
          <span style={{ color: t.ink, fontWeight: 600 }}>Need a hand?</span><br/>
          Audit log retains 90 days.
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 26 }}>
        {tab === 'users'  && <AdminUsers  theme={t} />}
        {tab === 'points' && <AdminPoints theme={t} />}
        {tab === 'stages' && <AdminStages theme={t} />}
      </div>
    </div>
  );
}

function AdminPageHeader({ title, subtitle, theme, action }) {
  const t = theme;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      paddingBottom: 18, borderBottom: `1px solid ${t.border}`, marginBottom: 18,
    }}>
      <div>
        <div style={{
          fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
          color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4,
        }}>Admin</div>
        <div style={{
          fontFamily: FONTS.display, fontSize: 24, fontWeight: 700,
          color: t.ink, letterSpacing: -0.6,
        }}>{title}</div>
        {subtitle && <div style={{
          fontFamily: FONTS.body, fontSize: 12.5, color: t.inkMuted, marginTop: 4,
        }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function AdminUsers({ theme }) {
  const t = theme;
  return (
    <div>
      <AdminPageHeader title="User management" subtitle="84 members · 1 banned · 7 admins" theme={t}
        action={
          <button style={{
            border: 0, padding: '9px 14px', borderRadius: 10,
            background: t.yellow, color: '#1A1410',
            fontFamily: FONTS.display, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
          }}>+ Invite member</button>
        } />

      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden',
      }}>
        {/* table head */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.6fr 1.6fr 0.9fr 0.7fr 0.9fr 1fr',
          padding: '10px 16px', borderBottom: `1px solid ${t.border}`,
          fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
          color: t.inkMuted, letterSpacing: 0.8, textTransform: 'uppercase',
        }}>
          <span>User</span><span>Email</span><span>Role</span><span>Joined</span><span>Status</span><span style={{ textAlign: 'right' }}>Actions</span>
        </div>
        {ADMIN_USERS.map((u, i) => (
          <div key={u.email} style={{
            display: 'grid', gridTemplateColumns: '1.6fr 1.6fr 0.9fr 0.7fr 0.9fr 1fr',
            padding: '10px 16px',
            borderBottom: i === ADMIN_USERS.length - 1 ? 'none' : `1px solid ${t.border}`,
            alignItems: 'center', fontFamily: FONTS.body, fontSize: 12, color: t.ink,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Avatar name={u.name} size={26} />
              <span style={{ fontFamily: FONTS.display, fontWeight: 600 }}>{u.name}</span>
            </span>
            <span style={{ color: t.inkMuted, fontFamily: FONTS.mono, fontSize: 11 }}>{u.email}</span>
            <span>
              <span style={{
                padding: '2px 7px', borderRadius: 5,
                background: u.role === 'Admin' ? t.yellowTint : t.surface2,
                color: u.role === 'Admin' ? t.yellow : t.inkMuted,
                fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700,
              }}>{u.role}</span>
            </span>
            <span style={{ color: t.inkMuted, fontFamily: FONTS.mono, fontSize: 11 }}>{u.joined}</span>
            <span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                color: u.status === 'banned' ? t.down : t.up,
                fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: u.status === 'banned' ? t.down : t.up,
                }} />
                {u.status}
              </span>
            </span>
            <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button style={{
                border: `1px solid ${t.border}`, background: 'transparent',
                color: t.ink, padding: '4px 9px', borderRadius: 7,
                fontFamily: FONTS.body, fontSize: 11, cursor: 'pointer',
              }}>Edit</button>
              <button style={{
                border: `1px solid ${t.border}`, background: 'transparent',
                color: u.status === 'banned' ? t.up : t.down,
                padding: '4px 9px', borderRadius: 7,
                fontFamily: FONTS.body, fontSize: 11, cursor: 'pointer',
              }}>{u.status === 'banned' ? 'Unban' : 'Ban'}</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPoints({ theme }) {
  const t = theme;
  return (
    <div>
      <AdminPageHeader title="Point adjustments" subtitle="Manual corrections require a reason · all changes audit-logged" theme={t} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }}>
        {/* Form */}
        <div style={{
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 14, padding: 18,
        }}>
          <div style={{
            fontFamily: FONTS.display, fontSize: 14, fontWeight: 700,
            color: t.ink, marginBottom: 14,
          }}>New adjustment</div>
          <FieldLabel theme={t}>User</FieldLabel>
          <FakeInput theme={t}>Maya Okonkwo · maya@blackrabbit.co</FakeInput>
          <FieldLabel theme={t}>Delta</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSeg(t, false)}>−</button>
            <FakeInput theme={t} mono>+2</FakeInput>
            <button style={btnSeg(t, true)}>+</button>
          </div>
          <FieldLabel theme={t}>Reason <span style={{ color: t.down, fontWeight: 600 }}>*</span></FieldLabel>
          <div style={{
            padding: '10px 12px', borderRadius: 9,
            background: t.surface2, border: `1px solid ${t.border}`,
            color: t.ink, fontFamily: FONTS.body, fontSize: 12, minHeight: 60,
          }}>Late-submission grace (kickoff bug)</div>
          <button style={{
            marginTop: 14, width: '100%',
            border: 0, padding: '11px 14px', borderRadius: 10,
            background: t.yellow, color: '#1A1410',
            fontFamily: FONTS.display, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Apply adjustment</button>
        </div>

        {/* Audit log */}
        <div>
          <div style={{
            fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
            color: t.inkMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8,
          }}>Recent adjustments</div>
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden',
          }}>
            {ADJUSTMENT_LOG.map((a, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i === ADJUSTMENT_LOG.length - 1 ? 'none' : `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 38, textAlign: 'center',
                  fontFamily: FONTS.mono, fontWeight: 800, fontSize: 14,
                  color: a.delta > 0 ? t.up : t.down,
                }}>{a.delta > 0 ? '+' : ''}{a.delta}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: FONTS.body, fontSize: 12, color: t.ink,
                  }}><b style={{ fontWeight: 700 }}>{a.target}</b> · {a.reason}</div>
                  <div style={{
                    fontFamily: FONTS.mono, fontSize: 10.5, color: t.inkDim, marginTop: 2,
                  }}>{a.when} · by {a.who}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStages({ theme }) {
  const t = theme;
  return (
    <div>
      <AdminPageHeader title="Stage multipliers" subtitle="Tune the points multiplier applied per stage · live preview below" theme={t} />

      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18,
      }}>
        {STAGES.map((s, i) => (
          <div key={s.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 1.6fr',
            alignItems: 'center', gap: 16,
            padding: '12px 0',
            borderBottom: i === STAGES.length - 1 ? 'none' : `1px solid ${t.border}`,
          }}>
            <div>
              <div style={{
                fontFamily: FONTS.display, fontWeight: 700, fontSize: 14, color: t.ink,
              }}>{s.label}</div>
              <div style={{
                fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted, marginTop: 1,
              }}>Applied to all {s.id === 'group' ? '48' : s.id === 'r16' ? '16' : s.id === 'qf' ? '8' : s.id === 'sf' ? '4' : '2'} matches</div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: `1px solid ${t.border}`, borderRadius: 9, overflow: 'hidden',
            }}>
              <button style={{
                border: 0, background: t.surface2, color: t.ink,
                width: 30, height: 36, fontFamily: FONTS.mono, fontSize: 14, cursor: 'pointer',
              }}>−</button>
              <div style={{
                flex: 1, textAlign: 'center',
                fontFamily: FONTS.mono, fontWeight: 800, fontSize: 18, color: t.yellow,
              }}>×{s.mult}</div>
              <button style={{
                border: 0, background: t.surface2, color: t.ink,
                width: 30, height: 36, fontFamily: FONTS.mono, fontSize: 14, cursor: 'pointer',
              }}>+</button>
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 9,
              background: t.yellowTint,
              fontFamily: FONTS.mono, fontSize: 11, color: t.ink,
            }}>
              {s.label} ×{s.mult} → exact score = <b style={{ color: t.yellow }}>{3 * s.mult} pts</b>
              <span style={{ color: t.inkMuted }}> · gap = {2 * s.mult} pts · winner = {1 * s.mult} pt</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FieldLabel = ({ children, theme }) => (
  <div style={{
    fontFamily: FONTS.body, fontSize: 10, fontWeight: 700,
    color: theme.inkMuted, letterSpacing: 0.8, textTransform: 'uppercase',
    margin: '12px 0 5px',
  }}>{children}</div>
);

const FakeInput = ({ children, theme, mono }) => (
  <div style={{
    flex: 1,
    padding: '10px 12px', borderRadius: 9,
    background: theme.surface2, border: `1px solid ${theme.border}`,
    color: theme.ink, fontFamily: mono ? FONTS.mono : FONTS.body, fontSize: 12,
    fontWeight: mono ? 700 : 400,
  }}>{children}</div>
);

const btnSeg = (t, primary) => ({
  border: 0, width: 38, height: 38, borderRadius: 9,
  background: primary ? t.yellow : t.surface2,
  color: primary ? '#1A1410' : t.ink,
  fontFamily: FONTS.mono, fontWeight: 800, fontSize: 16, cursor: 'pointer',
});

Object.assign(window, {
  AdminPanel, AdminUsers, AdminPoints, AdminStages,
});
