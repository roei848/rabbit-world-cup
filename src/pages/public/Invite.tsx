import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { LogoLockup, RabbitMark } from '../../components/primitives';
import { getInviteDoc } from '../../firebase/firestore';
import { signInWithGoogle } from '../../firebase/auth';
import { FONTS } from '../../theme/tokens';

type Status = 'loading' | 'valid' | 'invalid' | 'used' | 'expired';

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

export function Invite() {
  const { token }       = useParams<{ token: string }>();
  const { user }        = useAuth();
  const { theme: t }    = useTheme();
  const navigate        = useNavigate();

  const [status, setStatus]       = useState<Status>('loading');
  const [inviteeEmail, setEmail]  = useState('');
  const [error, setError]         = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/matches', { replace: true });
      return;
    }
    if (!token) { setStatus('invalid'); return; }

    getInviteDoc(token).then((invite) => {
      if (!invite) { setStatus('invalid'); return; }
      if (invite.used) { setStatus('used'); return; }
      const now = Date.now();
      const expiresAt = invite.expiresAt instanceof Date
        ? invite.expiresAt.getTime()
        : Number(invite.expiresAt);
      if (expiresAt < now) { setStatus('expired'); return; }
      setEmail(invite.email);
      setStatus('valid');
    }).catch(() => setStatus('invalid'));
  }, [token, user, navigate]);

  async function handleGoogle() {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/matches', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  function handleEmailSignup() {
    navigate('/login', { state: { email: inviteeEmail } });
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
        alignItems: 'center',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <RabbitMark size={36} color={t.yellow} />
        )}

        {status === 'invalid' && <InviteError theme={t} title="Invalid invite" body="This link doesn't exist or has been revoked." />}
        {status === 'used'    && <InviteError theme={t} title="Already used" body="This invite has already been claimed. Ask an admin for a new one." />}
        {status === 'expired' && <InviteError theme={t} title="Invite expired" body="This invite link expired after 7 days. Ask an admin to send a new one." />}

        {status === 'valid' && (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: t.yellowTint, border: `1.5px solid ${t.yellow}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RabbitMark size={28} color={t.yellow} />
            </div>

            <div>
              <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 20, color: t.ink, marginBottom: 6 }}>
                You're invited!
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: t.inkMuted, lineHeight: 1.5 }}>
                Join Black Rabbit World Cup 2026 as{' '}
                <span style={{ color: t.ink, fontWeight: 600 }}>{inviteeEmail}</span>
              </div>
            </div>

            {error && (
              <div style={{
                width: '100%',
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

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleGoogle}
                disabled={busy}
                style={inviteBtnStyle(t, 'secondary')}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: t.border }} />
                <span style={{ fontFamily: FONTS.body, fontSize: 11, color: t.inkDim }}>or</span>
                <div style={{ flex: 1, height: 1, background: t.border }} />
              </div>

              <button onClick={handleEmailSignup} style={inviteBtnStyle(t, 'ghost')}>
                Sign up with email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InviteError({ theme: t, title, body }: {
  theme: ReturnType<typeof useTheme>['theme'];
  title: string;
  body: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${t.down}1A`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONTS.mono, fontSize: 20, color: t.down,
      }}>✕</div>
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 18, color: t.ink }}>{title}</div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: t.inkMuted, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

function inviteBtnStyle(t: ReturnType<typeof useTheme>['theme'], variant: 'secondary' | 'ghost'): React.CSSProperties {
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
    width: '100%',
    border: 'none',
  };
  if (variant === 'secondary') return { ...base, background: t.surface2, color: t.ink, border: `1px solid ${t.border}` };
  return { ...base, background: 'transparent', color: t.inkMuted, border: `1px solid ${t.border}` };
}
