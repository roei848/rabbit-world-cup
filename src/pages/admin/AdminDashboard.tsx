import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { FONTS } from '../../theme/tokens';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../firebase/client';

type SeedState = 'idle' | 'loading' | 'success' | 'error';

export function AdminDashboard() {
  const { theme: t } = useTheme();
  const { isAdmin, loading } = useAuth();
  console.log('isAdmin', isAdmin);
  const [seedState, setSeedState] = useState<SeedState>('idle');
  const [seedCount, setSeedCount] = useState<number>(0);
  const [seedError, setSeedError] = useState<string>('');

  // Redirect if not admin
  if (!loading && !isAdmin) {
    return <Navigate to="/matches" replace />;
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: t.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: t.yellow, fontSize: 14, fontFamily: FONTS.body }}>
          Loading...
        </div>
      </div>
    );
  }

  const handleSeedTournament = async () => {
    setSeedState('loading');
    setSeedError('');
    setSeedCount(0);

    try {
      if (!app) {
        throw new Error('Firebase app not initialized');
      }

      const functions = getFunctions(app);
      const seedFn = httpsCallable<void, { seeded: number }>(functions, 'seedTournament');
      const result = await seedFn();

      setSeedCount(result.data.seeded);
      setSeedState('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSeedError(message);
      setSeedState('error');
    }
  };

  const adminToolLinks = [
    { label: 'Users', href: '/admin/users' },
    { label: 'Scoring', href: '/admin/scoring' },
    { label: 'Leagues', href: '/admin/leagues' },
    { label: 'Points', href: '/admin/points' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      fontFamily: FONTS.body,
    }}>
      {/* Header */}
      <div style={{
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{
            fontSize: 24,
          }}>⚙️</span>
          <h1 style={{
            fontSize: 18,
            fontWeight: 700,
            color: t.ink,
            margin: 0,
          }}>
            Admin
          </h1>
        </div>
        <Link
          to="/matches"
          style={{
            color: t.yellow,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${t.border}`,
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = t.surface2;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'transparent';
          }}
        >
          ← Back to Matches
        </Link>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '32px 24px',
      }}>
        {/* Tournament Data Section */}
        <section style={{
          marginBottom: 48,
        }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 700,
            color: t.inkMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 16,
            margin: '0 0 16px 0',
          }}>
            Tournament Data
          </h2>

          {/* Seed Tournament Card */}
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: '24px',
            marginBottom: 16,
          }}>
            <div style={{
              marginBottom: 12,
            }}>
              <h3 style={{
                fontSize: 15,
                fontWeight: 700,
                color: t.ink,
                margin: '0 0 8px 0',
              }}>
                Seed Tournament Fixtures
              </h3>
              <p style={{
                fontSize: 13,
                color: t.inkMuted,
                margin: 0,
                lineHeight: 1.5,
              }}>
                Fetch all WC 2026 fixtures from api-football.com and write them to Firestore. Safe to re-run.
              </p>
            </div>

            {/* Button and status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <button
                onClick={handleSeedTournament}
                disabled={seedState === 'loading'}
                style={{
                  background: seedState === 'error' ? t.down : t.yellow,
                  color: seedState === 'error' ? '#F5F1EA' : '#1A1410',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: FONTS.body,
                  cursor: seedState === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: seedState === 'loading' ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {seedState === 'loading' ? 'Seeding…' : 'Seed Tournament'}
              </button>

              {/* Success message */}
              {seedState === 'success' && (
                <span style={{
                  color: t.up,
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  ✓ Seeded {seedCount} fixture{seedCount !== 1 ? 's' : ''}
                </span>
              )}

              {/* Error message */}
              {seedState === 'error' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                  <span style={{
                    color: t.down,
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    Error:
                  </span>
                  <span style={{
                    color: t.down,
                    fontSize: 12,
                    fontFamily: FONTS.mono,
                    maxWidth: 400,
                  }}>
                    {seedError}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Admin Tools Section */}
        <section>
          <h2 style={{
            fontSize: 14,
            fontWeight: 700,
            color: t.inkMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 16,
            margin: '0 0 16px 0',
          }}>
            Admin Tools
          </h2>

          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {adminToolLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                style={{
                  display: 'inline-block',
                  color: t.ink,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.surface,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.yellow;
                  (e.target as HTMLElement).style.color = t.yellow;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.border;
                  (e.target as HTMLElement).style.color = t.ink;
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
