import { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import { useAuth } from '../../contexts/AuthContext';
import { useMatches } from '../../hooks/useMatches';
import { useUserPicks } from '../../hooks/useUserPicks';
import { MatchCard } from '../../components/match';
import { LogoLockup, Avatar } from '../../components/primitives';
import type { MatchDoc } from '../../firebase/firestore';

// ── Types ──────────────────────────────────────────────────────

type StageFilter = 'all' | 'group' | 'r16' | 'qf' | 'sf' | 'final';

const STAGE_PILLS: { label: string; value: StageFilter }[] = [
  { label: 'All',    value: 'all'   },
  { label: 'Group',  value: 'group' },
  { label: 'R16',    value: 'r16'   },
  { label: 'QF',     value: 'qf'    },
  { label: 'SF',     value: 'sf'    },
  { label: 'Final',  value: 'final' },
];

// ── Date formatting ────────────────────────────────────────────

function formatDateHeader(dateKey: string): string {
  const todayKey    = new Date().toLocaleDateString('en-CA');
  const tomorrowD   = new Date();
  tomorrowD.setDate(tomorrowD.getDate() + 1);
  const tomorrowKey = tomorrowD.toLocaleDateString('en-CA');

  if (dateKey === todayKey)    return 'Today';
  if (dateKey === tomorrowKey) return 'Tomorrow';

  // Parse as local date (avoid UTC offset shifting the day)
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTodayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

// ── Resize-aware width hook ───────────────────────────────────

function useIsWide(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 900 : false
  );
  useEffect(() => {
    const handler = () => setWide(window.innerWidth >= 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return wide;
}

// ── Page component ─────────────────────────────────────────────

export function Matches() {
  const { theme: t }  = useTheme();
  const { user }      = useAuth();
  const { matchesByDate, loading, error } = useMatches();
  const { picks } = useUserPicks();

  const [stageFilter, setStageFilter] = useState<StageFilter>('all');

  // Ref map: dateKey → DOM element for "Jump to today"
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const todayKey = getTodayKey();

  const jumpToToday = useCallback(() => {
    const el = dateRefs.current[todayKey];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [todayKey]);

  // Filter matchesByDate by stage
  const filteredByDate: Record<string, MatchDoc[]> = {};
  for (const [dateKey, matches] of Object.entries(matchesByDate)) {
    const filtered =
      stageFilter === 'all'
        ? matches
        : matches.filter((m) => m.stage === stageFilter);
    if (filtered.length > 0) filteredByDate[dateKey] = filtered;
  }

  const hasTodayDates = todayKey in filteredByDate;
  const dateKeys = Object.keys(filteredByDate);
  const isWide = useIsWide();

  // ── Render ───────────────────────────────────────────────────

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        height:         '100dvh',
        background:     t.bg,
        overflow:       'hidden',
      }}
    >
      {/* ── App header ──────────────────────────────────────── */}
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

      {/* ── Stage filter pills ───────────────────────────────── */}
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          gap:             8,
          padding:         '10px 18px',
          overflowX:       'auto',
          flexShrink:      0,
          background:      t.bg,
          borderBottom:    `1px solid ${t.border}`,
          scrollbarWidth:  'none',
        } as React.CSSProperties}
      >
        {STAGE_PILLS.map(({ label, value }) => {
          const active = stageFilter === value;
          return (
            <button
              key={value}
              onClick={() => setStageFilter(value)}
              style={{
                flexShrink:    0,
                padding:       '5px 13px',
                borderRadius:  20,
                border:        active ? 'none' : `1px solid ${t.border}`,
                background:    active ? t.yellow : 'transparent',
                color:         active ? '#1A1410' : t.inkMuted,
                fontFamily:    FONTS.body,
                fontWeight:    active ? 700 : 500,
                fontSize:      12,
                cursor:        'pointer',
                transition:    'background 0.15s, color 0.15s',
                outline:       'none',
                letterSpacing: 0.2,
                whiteSpace:    'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Scrollable content area ──────────────────────────── */}
      <div
        style={{
          flex:          1,
          overflowY:     'auto',
          overflowX:     'hidden',
          paddingBottom: 90,
          position:      'relative',
        }}
      >
        {/* Desktop width constraint */}
        <div
          style={{
            maxWidth: isWide ? 640 : undefined,
            margin:   isWide ? '0 auto' : undefined,
          }}
        >

          {/* ── Loading state ──────────────────────────────── */}
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

          {/* ── Error state ────────────────────────────────── */}
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
                Couldn't load matches.
              </span>
              <span style={{ color: t.inkMuted, fontSize: 12 }}>
                Tap to retry.
              </span>
            </div>
          )}

          {/* ── Empty state ────────────────────────────────── */}
          {!loading && !error && dateKeys.length === 0 && (
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
                No matches found.
              </span>
              <span
                style={{
                  color:      t.inkMuted,
                  fontSize:   12,
                  maxWidth:   260,
                  lineHeight: 1.6,
                }}
              >
                Tap 'Seed tournament' in admin to load fixtures.
              </span>
            </div>
          )}

          {/* ── Match groups ───────────────────────────────── */}
          {!loading && !error && dateKeys.map((dateKey) => (
            <div
              key={dateKey}
              style={{ marginBottom: 14 }}
              ref={(el) => { dateRefs.current[dateKey] = el; }}
            >
              {/* Sticky date header */}
              <div
                style={{
                  position:       'sticky',
                  top:            0,
                  zIndex:         10,
                  background:     t.bg,
                  padding:        '8px 18px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  borderBottom:   `1px solid ${t.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily:    FONTS.body,
                    fontSize:      10,
                    fontWeight:    700,
                    color:         dateKey === todayKey ? t.yellow : t.inkMuted,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {formatDateHeader(dateKey)}
                </span>
                {dateKey === todayKey && (
                  <span
                    style={{
                      display:    'inline-flex',
                      alignItems: 'center',
                      gap:        5,
                      fontFamily: FONTS.body,
                      fontSize:   10,
                      color:      t.yellow,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width:        6,
                        height:       6,
                        borderRadius: 3,
                        background:   t.yellow,
                      }}
                    />
                    Live today
                  </span>
                )}
              </div>

              {/* Match cards */}
              <div
                style={{
                  padding:       '10px 12px 0',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           8,
                }}
              >
                {filteredByDate[dateKey].map((m, i) => (
                  <MatchCard
                    key={`${m.apiId}-${i}`}
                    match={m}
                    pick={picks[String(m.apiId)] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* ── Jump to today (floating button) ──────────────────── */}
      {!loading && !error && hasTodayDates && (
        <button
          onClick={jumpToToday}
          style={{
            position:      'fixed',
            bottom:        96,
            right:         18,
            zIndex:        50,
            display:       'flex',
            alignItems:    'center',
            gap:           6,
            padding:       '8px 14px',
            borderRadius:  20,
            border:        'none',
            background:    t.yellow,
            color:         '#1A1410',
            fontFamily:    FONTS.body,
            fontWeight:    700,
            fontSize:      12,
            cursor:        'pointer',
            boxShadow:     '0 4px 16px rgba(0,0,0,0.35)',
            letterSpacing: 0.2,
            outline:       'none',
            whiteSpace:    'nowrap',
          }}
        >
          <span>↓</span>
          Jump to today
        </button>
      )}
    </div>
  );
}
