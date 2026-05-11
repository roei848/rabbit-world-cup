import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import { useAuth } from '../../contexts/AuthContext';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useLeagues } from '../../hooks/useLeagues';
import { getUserDoc } from '../../firebase/firestore';
import { LogoLockup, Avatar, Trend } from '../../components/primitives';
import type { LeaderboardEntry } from '../../firebase/firestore';

const globalLeague = { id: 'global', name: 'Global' };

// ── User row (rank 4+) ────────────────────────────────────────

interface UserRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  t: ReturnType<typeof useTheme>['theme'];
}

function UserRow({ entry, isCurrentUser, t }: UserRowProps) {
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        padding:        '10px 18px',
        gap:            12,
        background:     isCurrentUser ? t.rowYou : 'transparent',
        borderBottom:   `1px solid ${t.border}`,
        borderLeft:     isCurrentUser ? `2px solid ${t.rowYouBd}` : '2px solid transparent',
        transition:     'background 0.15s',
      }}
    >
      {/* Rank */}
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize:   13,
          fontWeight: 700,
          color:      t.inkMuted,
          minWidth:   28,
          textAlign:  'right',
        }}
      >
        {entry.rank > 0 ? entry.rank : '–'}
      </span>

      {/* Trend */}
      <Trend
        dir={entry.prevRank === 0 || entry.rank === entry.prevRank ? 'flat' : entry.rank < entry.prevRank ? 'up' : 'down'}
        theme={t}
      />

      {/* Name */}
      <span
        style={{
          flex:         1,
          fontFamily:   FONTS.body,
          fontSize:     14,
          fontWeight:   isCurrentUser ? 700 : 500,
          color:        t.ink,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}
      >
        {entry.displayName}
        {isCurrentUser && (
          <span
            style={{
              marginLeft:  6,
              fontSize:    10,
              fontWeight:  700,
              color:       t.yellow,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            You
          </span>
        )}
      </span>

      {/* Exact scores */}
      <span
        style={{
          fontFamily:  FONTS.mono,
          fontSize:    11,
          color:       t.inkMuted,
          minWidth:    36,
          textAlign:   'right',
        }}
      >
        {entry.exactScores}x🎯
      </span>

      {/* Points */}
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize:   14,
          fontWeight: 700,
          color:      t.yellow,
          minWidth:   42,
          textAlign:  'right',
        }}
      >
        {entry.totalPoints}
      </span>
    </div>
  );
}

// ── Podium card ───────────────────────────────────────────────

interface PodiumCardProps {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
  t: ReturnType<typeof useTheme>['theme'];
  isCurrentUser: boolean;
}

function PodiumCard({ entry, position, t, isCurrentUser }: PodiumCardProps) {
  const medals: Record<1 | 2 | 3, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const colors: Record<1 | 2 | 3, string> = {
    1: t.podiumGold,
    2: t.podiumSilver,
    3: t.podiumBronze,
  };
  const heights: Record<1 | 2 | 3, number> = { 1: 90, 2: 72, 3: 60 };
  const nameSizes: Record<1 | 2 | 3, number> = { 1: 13, 2: 12, 3: 11 };

  const color  = colors[position];
  const height = heights[position];

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        flex:           position === 1 ? 1.2 : 1,
        gap:            6,
      }}
    >
      {/* Medal */}
      <span style={{ fontSize: position === 1 ? 28 : 22 }}>{medals[position]}</span>

      {/* Name */}
      <span
        style={{
          fontFamily:   FONTS.body,
          fontSize:     nameSizes[position],
          fontWeight:   700,
          color:        isCurrentUser ? t.yellow : t.ink,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          maxWidth:     88,
          textAlign:    'center',
        }}
        title={entry.displayName}
      >
        {entry.displayName}
      </span>

      {/* Points + exact */}
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize:   position === 1 ? 18 : 15,
          fontWeight: 700,
          color:      color,
        }}
      >
        {entry.totalPoints}
      </span>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize:   10,
          color:      t.inkMuted,
        }}
      >
        {entry.exactScores}x🎯
      </span>

      {/* Podium block */}
      <div
        style={{
          width:        position === 1 ? 72 : 56,
          height:       height,
          background:   color,
          opacity:      0.18,
          borderRadius: '6px 6px 0 0',
        }}
      />
    </div>
  );
}

// ── Sticky current-user row ───────────────────────────────────

interface StickyYouRowProps {
  entry: LeaderboardEntry | null;
  displayName: string;
  t: ReturnType<typeof useTheme>['theme'];
}

function StickyYouRow({ entry, displayName, t }: StickyYouRowProps) {
  const e: LeaderboardEntry = entry ?? {
    userId:      '',
    displayName: displayName,
    totalPoints: 0,
    exactScores: 0,
    rank:        0,
    prevRank:    0,
  };

  return (
    <div
      style={{
        position:     'sticky',
        bottom:       0,
        background:   t.surface,
        borderTop:    `1px solid ${t.borderHi}`,
        boxShadow:    '0 -4px 16px rgba(0,0,0,0.25)',
        padding:      '0',
        zIndex:       20,
      }}
    >
      <UserRow entry={e} isCurrentUser t={t} />
    </div>
  );
}

// ── Page component ────────────────────────────────────────────

export function Leaderboard() {
  const { theme: t }    = useTheme();
  const { user }        = useAuth();
  const { leagueId = 'global' } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  // Load user's league memberships
  const [leagueIds, setLeagueIds] = useState<string[]>([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserDoc(user.uid).then(docData => {
      if (cancelled) return;
      setLeagueIds(docData?.leagueIds ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid]);

  const { leagues } = useLeagues(leagueIds);

  // League picker state
  const [pickerOpen, setPickerOpen] = useState(false);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = () => setPickerOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [pickerOpen]);

  const allLeagues = [globalLeague, ...leagues];
  const currentLeague = allLeagues.find(lg => lg.id === leagueId);

  const { entries, loading, error } = useLeaderboard(leagueId);

  const currentUid = user?.uid ?? null;

  const top3   = entries.slice(0, 3);
  const rest   = entries.slice(3);
  const hasPodium = entries.length >= 3;

  const currentUserEntry = currentUid
    ? entries.find((e) => e.userId === currentUid) ?? null
    : null;

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
          padding:     '14px 18px 10px',
          flexShrink:  0,
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
          Leaderboard
        </span>
        <span
          style={{
            marginLeft:  8,
            fontFamily:  FONTS.body,
            fontSize:    11,
            color:       t.inkMuted,
            fontWeight:  500,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {currentLeague?.name ?? leagueId}
        </span>
      </div>

      {/* ── League selector pill ────────────────────────────── */}
      <div style={{ padding: '4px 18px 10px', flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px 5px 8px', borderRadius: 999,
              background: t.surface, border: `1px solid ${t.border}`,
              fontFamily: FONTS.body, fontSize: 11.5, fontWeight: 600,
              color: t.ink, cursor: 'pointer',
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 5, background: t.yellow, display: 'inline-block' }} />
            {currentLeague?.name ?? leagueId}
            <span style={{ color: t.inkMuted, fontWeight: 500 }}>▾</span>
          </button>

          {pickerOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
              background: t.surface, border: `1px solid ${t.borderHi}`,
              borderRadius: 12, overflow: 'hidden', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {allLeagues.map(lg => (
                <button key={lg.id}
                  onClick={() => { navigate(`/leaderboard/${lg.id}`); setPickerOpen(false); }}
                  style={{
                    width: '100%', border: 0, textAlign: 'left',
                    padding: '9px 14px',
                    background: lg.id === leagueId ? t.surface2 : 'transparent',
                    color: t.ink,
                    fontFamily: FONTS.body, fontSize: 12.5, fontWeight: lg.id === leagueId ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {lg.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div
        style={{
          flex:      1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position:  'relative',
        }}
      >

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
              Couldn't load leaderboard.
            </span>
            <span style={{ color: t.inkMuted, fontSize: 12 }}>
              {error.message}
            </span>
          </div>
        )}

        {/* ── Empty ────────────────────────────────────────── */}
        {!loading && !error && entries.length === 0 && (
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
              No predictions yet.
            </span>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────── */}
        {!loading && !error && entries.length > 0 && (
          <>
            {/* ── Podium (top 3) ──────────────────────────── */}
            {hasPodium ? (
              <div
                style={{
                  display:     'flex',
                  alignItems:  'flex-end',
                  justifyContent: 'center',
                  padding:     '24px 18px 0',
                  gap:         8,
                }}
              >
                {/* 2nd – left */}
                <PodiumCard
                  entry={top3[1]}
                  position={2}
                  t={t}
                  isCurrentUser={top3[1].userId === currentUid}
                />
                {/* 1st – center */}
                <PodiumCard
                  entry={top3[0]}
                  position={1}
                  t={t}
                  isCurrentUser={top3[0].userId === currentUid}
                />
                {/* 3rd – right */}
                <PodiumCard
                  entry={top3[2]}
                  position={3}
                  t={t}
                  isCurrentUser={top3[2].userId === currentUid}
                />
              </div>
            ) : (
              /* Fewer than 3 entries — simple ranked list for top entries */
              <div style={{ padding: '8px 0' }}>
                {top3.map((entry) => (
                  <UserRow
                    key={entry.userId}
                    entry={entry}
                    isCurrentUser={entry.userId === currentUid}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Divider below podium */}
            {hasPodium && rest.length > 0 && (
              <div
                style={{
                  margin:        '16px 18px 0',
                  borderTop:     `1px solid ${t.border}`,
                }}
              />
            )}

            {/* ── Rank 4+ list ─────────────────────────────── */}
            {rest.length > 0 && (
              <div style={{ paddingTop: hasPodium ? 8 : 0 }}>
                {rest.map((entry) => (
                  <UserRow
                    key={entry.userId}
                    entry={entry}
                    isCurrentUser={entry.userId === currentUid}
                    t={t}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Sticky current-user row ─────────────────────────── */}
      {!loading && !error && user && (
        <StickyYouRow
          entry={currentUserEntry}
          displayName={user.displayName ?? 'You'}
          t={t}
        />
      )}
    </div>
  );
}
