import { useState, useEffect } from 'react';
import { getDoc, getDocs, doc } from 'firebase/firestore';
import { db } from '../../firebase/client';
import { matchesCol } from '../../firebase/firestore';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import { useAuth } from '../../contexts/AuthContext';
import { LogoLockup, Avatar, Flag } from '../../components/primitives';
import { useBonusPicks } from '../../hooks/useBonusPicks';

interface WCPlayer {
  id: number;
  name: string;
  teamCode: string;
}

// ── Spinner ───────────────────────────────────────────────────

interface SpinnerProps {
  t: ReturnType<typeof useTheme>['theme'];
  size?: number;
}

function Spinner({ t, size = 20 }: SpinnerProps) {
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        border:         `2px solid ${t.border}`,
        borderTopColor: t.yellow,
        animation:      'br-spin 0.8s linear infinite',
        flexShrink:     0,
      }}
    />
  );
}

// ── BonusCard ─────────────────────────────────────────────────

interface BonusCardProps {
  icon: string;
  title: string;
  subtitle: string;
  reward: string;
  isLocked: boolean;
  t: ReturnType<typeof useTheme>['theme'];
  children: React.ReactNode;
}

function BonusCard({ icon, title, subtitle, reward, isLocked, t, children }: BonusCardProps) {
  return (
    <div
      style={{
        background:    t.surface,
        border:        `1px solid ${t.border}`,
        borderRadius:  14,
        padding:       14,
        marginBottom:  12,
      }}
    >
      {/* Card header */}
      <div
        style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          marginBottom:   12,
          gap:            8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily:  FONTS.display,
                fontSize:    15,
                fontWeight:  700,
                color:       t.ink,
                whiteSpace:  'nowrap',
                overflow:    'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize:   12,
                color:      t.inkMuted,
                marginTop:  2,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <span
          style={{
            fontFamily:  FONTS.mono,
            fontSize:    12,
            fontWeight:  700,
            color:       t.yellow,
            flexShrink:  0,
            paddingTop:  2,
          }}
        >
          {reward}
        </span>
      </div>

      {/* Card body */}
      <div style={{ opacity: isLocked ? 0.55 : 1 }}>
        {isLocked ? (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              padding:        '14px 0 6px',
              gap:            6,
            }}
          >
            <span
              style={{
                fontFamily:    FONTS.mono,
                fontSize:      11,
                fontWeight:    700,
                color:         t.inkMuted,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              LOCKED
            </span>
            <span style={{ fontFamily: FONTS.body, fontSize: 12, color: t.inkDim }}>
              Picks locked — tournament has started
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ── Top Scorer picker ─────────────────────────────────────────

interface TopScorerPickerProps {
  currentPick: { playerId: string; playerName: string } | null;
  submitTopScorer: (playerId: string, playerName: string) => Promise<void>;
  t: ReturnType<typeof useTheme>['theme'];
}

function TopScorerPicker({ currentPick, submitTopScorer, t }: TopScorerPickerProps) {
  const [players, setPlayers] = useState<WCPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, 'cache', 'wcPlayers'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as { players: WCPlayer[] };
          setPlayers(data.players ?? []);
        }
      })
      .finally(() => setPlayersLoading(false));
  }, []);

  async function handleSelectPlayer(player: WCPlayer) {
    setSubmitError(null);
    try {
      await submitTopScorer(String(player.id), player.name);
      setQuery('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit pick');
    }
  }

  const filtered = query.trim()
    ? players.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : [];

  return (
    <div>
      {/* Current pick (submitted) */}
      {currentPick && (
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            padding:      '8px 10px',
            background:   t.surface2,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <span style={{ color: t.up, fontSize: 16 }}>✓</span>
          <span
            style={{
              fontFamily: FONTS.body,
              fontSize:   13,
              fontWeight: 600,
              color:      t.ink,
              flex:       1,
            }}
          >
            {currentPick.playerName}
          </span>
          <span
            style={{
              fontFamily:    FONTS.mono,
              fontSize:      10,
              fontWeight:    700,
              color:         t.up,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Picked
          </span>
        </div>
      )}

      {/* Search input */}
      {playersLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
          <Spinner t={t} size={16} />
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: t.inkMuted }}>
            Loading players…
          </span>
        </div>
      ) : players.length === 0 ? (
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize:   12,
            color:      t.inkMuted,
            padding:    '8px 0',
            lineHeight: 1.5,
          }}
        >
          Player list not yet loaded. Ask an admin to run cacheWCPlayers.
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search players…"
            style={{
              width:        '100%',
              boxSizing:    'border-box',
              padding:      '8px 10px',
              fontFamily:   FONTS.body,
              fontSize:     13,
              color:        t.ink,
              background:   t.surface2,
              border:       `1px solid ${t.border}`,
              borderRadius: 8,
              outline:      'none',
            }}
          />

          {filtered.length > 0 && (
            <div
              style={{
                maxHeight:    200,
                overflowY:    'auto',
                marginTop:    6,
                border:       `1px solid ${t.border}`,
                borderRadius: 8,
                background:   t.surface2,
              }}
            >
              {filtered.map(player => (
                <button
                  key={player.id}
                  onClick={() => void handleSelectPlayer(player)}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         8,
                    width:       '100%',
                    padding:     '8px 10px',
                    background:  'transparent',
                    border:      'none',
                    borderBottom: `1px solid ${t.border}`,
                    cursor:      'pointer',
                    textAlign:   'left',
                  }}
                >
                  <Flag code={player.teamCode} size={16} />
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, color: t.ink }}>
                    {player.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {submitError && (
        <div
          style={{
            marginTop:  8,
            fontFamily: FONTS.body,
            fontSize:   12,
            color:      t.down,
          }}
        >
          {submitError}
        </div>
      )}
    </div>
  );
}

// ── WC Winner picker ──────────────────────────────────────────

interface WCWinnerPickerProps {
  currentPickCode: string | null;
  submitWorldCupWinner: (teamCode: string) => Promise<void>;
  t: ReturnType<typeof useTheme>['theme'];
}

function WCWinnerPicker({ currentPickCode, submitWorldCupWinner, t }: WCWinnerPickerProps) {
  const [teams, setTeams] = useState<Array<{ code: string; name: string }>>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(matchesCol()).then(snap => {
      const seen = new Map<string, string>();
      snap.docs.forEach(d => {
        const m = d.data();
        seen.set(m.homeTeam.code, m.homeTeam.name);
        seen.set(m.awayTeam.code, m.awayTeam.name);
      });
      const sorted = Array.from(seen.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setTeams(sorted);
    });
  }, []);

  async function handleSelectTeam(teamCode: string) {
    setSubmitError(null);
    try {
      await submitWorldCupWinner(teamCode);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit pick');
    }
  }

  if (teams.length === 0) {
    return (
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize:   12,
          color:      t.inkMuted,
          padding:    '8px 0',
        }}
      >
        Tournament not yet seeded.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          maxHeight:    300,
          overflowY:    'auto',
          border:       `1px solid ${t.border}`,
          borderRadius: 8,
          background:   t.surface2,
        }}
      >
        {teams.map(team => {
          const isSelected = team.code === currentPickCode;
          return (
            <button
              key={team.code}
              onClick={() => void handleSelectTeam(team.code)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                width:        '100%',
                padding:      '9px 10px',
                background:   isSelected ? `rgba(${t.up === '#3DD68C' ? '61,214,140' : '31,165,106'},0.10)` : 'transparent',
                border:       'none',
                borderBottom: `1px solid ${t.border}`,
                cursor:       'pointer',
                textAlign:    'left',
              }}
            >
              <Flag code={team.code} size={18} />
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize:   13,
                  fontWeight: isSelected ? 700 : 500,
                  color:      isSelected ? t.up : t.ink,
                  flex:       1,
                }}
              >
                {team.name}
              </span>
              {isSelected && (
                <span style={{ color: t.up, fontSize: 14, fontWeight: 700 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {submitError && (
        <div
          style={{
            marginTop:  8,
            fontFamily: FONTS.body,
            fontSize:   12,
            color:      t.down,
          }}
        >
          {submitError}
        </div>
      )}
    </div>
  );
}

// ── Page component ────────────────────────────────────────────

export function Bonus() {
  const { theme: t }  = useTheme();
  const { user }      = useAuth();
  const {
    bonusPick,
    isLocked,
    loading: bonusLoading,
    error,
    submitTopScorer,
    submitWorldCupWinner,
  } = useBonusPicks();

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100dvh',
        background:    t.bg,
        overflow:      'hidden',
      }}
    >
      {/* ── App header ─────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '12px 18px',
          background:     t.bg,
          borderBottom:   `1px solid ${t.border}`,
          flexShrink:     0,
        }}
      >
        <LogoLockup theme={t} compact />
        <Avatar
          name={user?.displayName ?? 'You'}
          size={32}
          theme={t}
        />
      </div>

      {/* ── Page title ─────────────────────────────────────── */}
      <div
        style={{
          padding:      '14px 18px 10px',
          flexShrink:   0,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <span
          style={{
            fontFamily:    FONTS.display,
            fontSize:      18,
            fontWeight:    700,
            color:         t.ink,
            letterSpacing: -0.3,
          }}
        >
          Bonus Picks
        </span>
      </div>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div
        style={{
          flex:      1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >

        {/* ── Loading ──────────────────────────────────────── */}
        {bonusLoading && (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '60px 24px',
              gap:            12,
              fontFamily:     FONTS.body,
            }}
          >
            <Spinner t={t} size={32} />
            <span style={{ color: t.inkMuted, fontSize: 13 }}>
              Hopping over…
            </span>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {!bonusLoading && error && (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '60px 24px',
              gap:            8,
              fontFamily:     FONTS.body,
              textAlign:      'center',
            }}
          >
            <span style={{ fontSize: 28 }}>🐇</span>
            <span
              style={{
                color:      t.down,
                fontSize:   14,
                fontWeight: 600,
                fontFamily: FONTS.display,
              }}
            >
              Couldn't load bonus picks.
            </span>
            <span style={{ color: t.inkMuted, fontSize: 12 }}>
              {error.message}
            </span>
          </div>
        )}

        {/* ── Cards ────────────────────────────────────────── */}
        {!bonusLoading && !error && (
          <div style={{ padding: '16px 16px 24px' }}>

            {/* Top Scorer card */}
            <BonusCard
              icon="⚽"
              title="Top Scorer"
              subtitle="Pick the player who will score the most goals"
              reward="+15 pts"
              isLocked={isLocked}
              t={t}
            >
              <TopScorerPicker
                currentPick={bonusPick?.topScorer ?? null}
                submitTopScorer={submitTopScorer}
                t={t}
              />
            </BonusCard>

            {/* WC Winner card */}
            <BonusCard
              icon="🏆"
              title="WC Winner"
              subtitle="Pick the team that will lift the trophy"
              reward="+10 pts"
              isLocked={isLocked}
              t={t}
            >
              <WCWinnerPicker
                currentPickCode={bonusPick?.worldCupWinner?.teamCode ?? null}
                submitWorldCupWinner={submitWorldCupWinner}
                t={t}
              />
            </BonusCard>

          </div>
        )}

      </div>
    </div>
  );
}
