import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS, USER_COLORS } from '../../theme/tokens';
import { useAuth } from '../../contexts/AuthContext';
import { useLeagues } from '../../hooks/useLeagues';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { getUserDoc, findLeagueByCode, joinLeague, type LeagueDoc } from '../../firebase/firestore';
import { LogoLockup, Avatar, RabbitMark } from '../../components/primitives';

// ── League card ───────────────────────────────────────────────

interface LeagueCardProps {
  league: LeagueDoc & { id: string };
  onPress: () => void;
  t: ReturnType<typeof useTheme>['theme'];
  currentUid: string;
}

function LeagueCard({ league, onPress, t, currentUid }: LeagueCardProps) {
  const { entries } = useLeaderboard(league.id);
  const myEntry = entries.find((e) => e.userId === currentUid);
  const rank = myEntry?.rank ?? null;
  const memberCount = league.memberIds.length;

  const c = USER_COLORS[league.color] ?? USER_COLORS['pink'];
  const isYellow = league.color === 'yellow';
  const iconBg = isYellow ? t.yellow : c.bg;
  const iconInk = isYellow ? '#1A1410' : c.ink;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPress(); }}
      style={{
        background:    t.surface,
        border:        `1px solid ${t.border}`,
        borderRadius:  16,
        padding:       14,
        display:       'flex',
        alignItems:    'center',
        gap:           12,
        cursor:        'pointer',
        position:      'relative',
        overflow:      'hidden',
        outline:       'none',
      }}
    >
      <div
        style={{
          width:           44,
          height:          44,
          borderRadius:    11,
          background:      iconBg,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
          boxShadow:       isYellow ? `0 0 20px ${t.yellow}33` : 'none',
        }}
      >
        <RabbitMark size={22} color={iconInk} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily:   FONTS.display,
            fontWeight:   700,
            fontSize:     14,
            color:        t.ink,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {league.name}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize:   11,
            color:      t.inkMuted,
            marginTop:  2,
          }}
        >
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily:    FONTS.body,
            fontSize:      9,
            fontWeight:    700,
            color:         t.inkDim,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          Your Rank
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize:   18,
            fontWeight: 800,
            color:      rank !== null && rank <= 3 ? t.yellow : t.ink,
            lineHeight: 1.1,
          }}
        >
          {rank !== null ? `#${rank}` : '–'}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize:   10.5,
            color:      t.inkMuted,
            marginTop:  1,
          }}
        >
          of {memberCount}
        </div>
      </div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────

export function Leagues() {
  const { theme: t }      = useTheme();
  const { user, isAdmin } = useAuth();
  const navigate          = useNavigate();

  const [leagueIds, setLeagueIds]             = useState<string[]>([]);
  const [leagueIdsLoading, setLeagueIdsLoading] = useState(!!user);

  const [showJoin, setShowJoin]   = useState(false);
  const [joinCode, setJoinCode]   = useState('');
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserDoc(user.uid)
      .then((docData) => {
        if (cancelled) return;
        setLeagueIds(docData?.leagueIds ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLeagueIdsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const { leagues, loading: leaguesLoading, error } = useLeagues(leagueIds);
  const loading = leagueIdsLoading || leaguesLoading;

  const totalMembers = leagues.reduce((sum, lg) => sum + lg.memberIds.length, 0);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    setJoinError(null);
    try {
      const league = await findLeagueByCode(joinCode.trim().toUpperCase());
      if (!league) {
        setJoinError('Code not found');
        return;
      }
      if (league.memberIds.includes(uid)) {
        setJoinError('Already a member');
        return;
      }
      await joinLeague(league.id, uid);
      setLeagueIds((prev) => [...prev, league.id]);
      setShowJoin(false);
      setJoinCode('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setJoining(false);
    }
  }

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

      {/* ── Scrollable content ──────────────────────────────── */}
      <div
        style={{
          flex:      1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: 90,
        }}
      >
        {/* ── Section header ─────────────────────────────── */}
        <div style={{ padding: '14px 18px 6px' }}>
          <div
            style={{
              fontFamily:    FONTS.body,
              fontSize:      10,
              fontWeight:    700,
              color:         t.inkMuted,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            🏟 Your Leagues
          </div>
          <div
            style={{
              fontFamily:    FONTS.display,
              fontSize:      22,
              fontWeight:    700,
              color:         t.ink,
              letterSpacing: -0.6,
              marginTop:     2,
            }}
          >
            {leagues.length} league{leagues.length !== 1 ? 's' : ''} · {totalMembers} player{totalMembers !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── CTAs ────────────────────────────────────────── */}
        <div style={{ padding: '8px 14px 14px', display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/leagues')}
              style={{
                flex:            1,
                border:          0,
                padding:         '11px 12px',
                borderRadius:    12,
                background:      t.yellow,
                color:           '#1A1410',
                fontFamily:      FONTS.display,
                fontWeight:      700,
                fontSize:        12.5,
                cursor:          'pointer',
                display:         'inline-flex',
                alignItems:      'center',
                justifyContent:  'center',
                gap:             6,
              }}
            >
              <span style={{ fontSize: 14 }}>+</span> Create league
            </button>
          )}
          <button
            onClick={() => { setShowJoin((v) => !v); setJoinError(null); }}
            style={{
              flex:         1,
              padding:      '11px 12px',
              borderRadius: 12,
              background:   'transparent',
              color:        t.ink,
              border:       `1px solid ${t.borderHi}`,
              fontFamily:   FONTS.display,
              fontWeight:   600,
              fontSize:     12.5,
              cursor:       'pointer',
            }}
          >
            Join with code
          </button>
        </div>

        {/* ── Join form ───────────────────────────────────── */}
        {showJoin && (
          <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !joining) handleJoin(); }}
                placeholder="Enter code e.g. RABBIT7"
                style={{
                  flex:         1,
                  padding:      '10px 12px',
                  borderRadius: 10,
                  border:       `1px solid ${t.borderHi}`,
                  background:   t.surface,
                  color:        t.ink,
                  fontFamily:   FONTS.body,
                  fontSize:     13,
                  outline:      'none',
                }}
              />
              <button
                onClick={handleJoin}
                disabled={joining || joinCode.trim().length === 0}
                style={{
                  padding:      '10px 16px',
                  borderRadius: 10,
                  border:       0,
                  background:   t.yellow,
                  color:        '#1A1410',
                  fontFamily:   FONTS.display,
                  fontWeight:   700,
                  fontSize:     13,
                  cursor:       joining ? 'not-allowed' : 'pointer',
                  opacity:      joining ? 0.6 : 1,
                  flexShrink:   0,
                }}
              >
                {joining ? '…' : 'Join'}
              </button>
            </div>
            {joinError && (
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize:   12,
                  color:      t.down,
                  fontWeight: 500,
                }}
              >
                {joinError}
              </span>
            )}
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────── */}
        {loading && (
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
            <div
              style={{
                width:          32,
                height:         32,
                borderRadius:   '50%',
                border:         `3px solid ${t.border}`,
                borderTopColor: t.yellow,
                animation:      'br-spin 0.8s linear infinite',
              }}
            />
            <span style={{ color: t.inkMuted, fontSize: 13 }}>
              Hopping over…
            </span>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {!loading && error && (
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
              Couldn't load leagues.
            </span>
            <span style={{ color: t.inkMuted, fontSize: 12 }}>
              {error.message}
            </span>
          </div>
        )}

        {/* ── Empty ────────────────────────────────────────── */}
        {!loading && !error && leagues.length === 0 && (
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
                color:      t.ink,
                fontSize:   14,
                fontWeight: 600,
                fontFamily: FONTS.display,
              }}
            >
              No leagues yet.
            </span>
            <span style={{ color: t.inkMuted, fontSize: 12 }}>
              Join one with a code or ask an admin to create one.
            </span>
          </div>
        )}

        {/* ── League grid ──────────────────────────────────── */}
        {!loading && !error && leagues.length > 0 && (
          <div
            style={{
              padding:       '0 14px',
              display:       'flex',
              flexDirection: 'column',
              gap:           10,
            }}
          >
            {leagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                onPress={() => navigate(`/leaderboard/${league.id}`)}
                t={t}
                currentUid={uid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
