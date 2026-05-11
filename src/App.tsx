import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { LogoLockup } from './components/primitives';
import { Login } from './pages/public/Login';
import { Invite } from './pages/public/Invite';
import { Matches } from './pages/app/Matches';
import { Leaderboard } from './pages/app/Leaderboard';
import { Picks } from './pages/app/Picks';
import { Bonus } from './pages/app/Bonus';
import { Leagues } from './pages/app/Leagues';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminScoring } from './pages/admin/AdminScoring';
import { AdminLeagues } from './pages/admin/AdminLeagues';
import { AdminPoints } from './pages/admin/AdminPoints';
import { FONTS } from './theme/tokens';

function Home() {
  const { theme: t, themeKey, toggleTheme } = useTheme();
  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      fontFamily: FONTS.body,
    }}>
      <LogoLockup theme={t} />

      <div style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 260,
      }}>
        <div style={{ color: t.inkMuted, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600, fontFamily: FONTS.body }}>
          Theme tokens — {themeKey}
        </div>
        {([
          ['bg', t.bg],
          ['surface', t.surface],
          ['yellow', t.yellow],
          ['ink', t.ink],
          ['up', t.up],
          ['down', t.down],
        ] as [string, string][]).map(([name, value]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: value, border: `1px solid ${t.border}` }} />
            <span style={{ color: t.inkMuted, fontSize: 12, fontFamily: FONTS.mono, minWidth: 80 }}>{name}</span>
            <span style={{ color: t.inkDim, fontSize: 11, fontFamily: FONTS.mono }}>{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={toggleTheme}
        style={{
          background: t.yellow,
          color: '#1A1410',
          border: 'none',
          borderRadius: 10,
          padding: '10px 20px',
          fontWeight: 700,
          fontSize: 13,
          fontFamily: FONTS.body,
          cursor: 'pointer',
        }}
      >
        Toggle {themeKey === 'dark' ? 'Light' : 'Dark'} Mode
      </button>

      <div style={{ color: t.inkDim, fontSize: 11, textAlign: 'center', maxWidth: 280, lineHeight: 1.6, fontFamily: FONTS.body }}>
        Phase 2 complete. Auth, invite flow, and Cloud Functions scaffolded.
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/invite/:token" element={<Invite />} />

      {/* Protected (auth required) */}
      <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<Navigate to="/leaderboard/global" replace />} />
      <Route path="/leaderboard/:leagueId" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/picks" element={<ProtectedRoute><Picks /></ProtectedRoute>} />
      <Route path="/bonus" element={<ProtectedRoute><Bonus /></ProtectedRoute>} />
      <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users"   element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/scoring" element={<AdminRoute><AdminScoring /></AdminRoute>} />
      <Route path="/admin/leagues" element={<AdminRoute><AdminLeagues /></AdminRoute>} />
      <Route path="/admin/points"  element={<AdminRoute><AdminPoints /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
