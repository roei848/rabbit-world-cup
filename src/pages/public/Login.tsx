import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { LogoLockup } from '../../components/primitives';
import { signInWithGoogle, signInWithEmail } from '../../firebase/auth';
import { FONTS } from '../../theme/tokens';

type Mode = 'choose' | 'email';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function Login() {
  const { user } = useAuth();
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/matches';

  const [mode, setMode]       = useState<Mode>('choose');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  async function handleGoogle() {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInWithEmail(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{ marginBottom: 36 }}>
        <LogoLockup theme={t} />
      </div>

      <div style={{
        width: '100%',
        maxWidth: 360,
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 18,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 20, color: t.ink, marginBottom: 4 }}>
            Welcome back
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: t.inkMuted }}>
            Black Rabbit World Cup 2026 is invite-only.
          </div>
        </div>

        {error && (
          <div style={{
            background: `${t.down}22`,
            border: `1px solid ${t.down}55`,
            borderRadius: 10,
            padding: '10px 14px',
            fontFamily: FONTS.body,
            fontSize: 12.5,
            color: t.down,
          }}>
            {error}
          </div>
        )}

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleGoogle}
              disabled={busy}
              style={btnStyle(t, 'secondary')}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <Divider theme={t} />

            <button
              onClick={() => setMode('email')}
              style={btnStyle(t, 'ghost')}
            >
              Sign in with email
            </button>
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} theme={t} />
            <Field label="Password" type="password" value={password} onChange={setPassword} theme={t} />
            <button type="submit" disabled={busy} style={{ ...btnStyle(t, 'primary'), marginTop: 4 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setMode('choose'); setError(''); }} style={btnStyle(t, 'ghost')}>
              ← Back
            </button>
          </form>
        )}
      </div>

      <div style={{
        marginTop: 20,
        fontFamily: FONTS.body,
        fontSize: 11,
        color: t.inkDim,
        textAlign: 'center',
        maxWidth: 300,
        lineHeight: 1.6,
      }}>
        Don't have an account? Ask an admin to send you an invite link.
      </div>
    </div>
  );
}

function Field({
  label, type, value, onChange, theme: t,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: t.inkMuted }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{
          background: t.surface2,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: '10px 12px',
          fontFamily: FONTS.body,
          fontSize: 14,
          color: t.ink,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function Divider({ theme: t }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: t.border }} />
      <span style={{ fontFamily: FONTS.body, fontSize: 11, color: t.inkDim }}>or</span>
      <div style={{ flex: 1, height: 1, background: t.border }} />
    </div>
  );
}

function btnStyle(t: ReturnType<typeof useTheme>['theme'], variant: 'primary' | 'secondary' | 'ghost') {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '11px 16px',
    borderRadius: 12,
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    transition: 'opacity 0.15s',
  };
  if (variant === 'primary') return { ...base, background: t.yellow, color: '#1A1410' };
  if (variant === 'secondary') return { ...base, background: t.surface2, color: t.ink, border: `1px solid ${t.border}` };
  return { ...base, background: 'transparent', color: t.inkMuted, border: `1px solid ${t.border}` };
}
