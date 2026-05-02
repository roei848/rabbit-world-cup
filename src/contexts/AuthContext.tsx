import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { type User, getIdTokenResult } from 'firebase/auth';
import { onAuth } from '../firebase/auth';
import { isConfigured } from '../firebase/client';
import { FONTS } from '../theme/tokens';

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Read isAdmin from custom claims (set manually for first admin via Firebase console)
      const tokenResult = await getIdTokenResult(firebaseUser, false);
      const admin = tokenResult.claims['isAdmin'] === true;

      setUser(firebaseUser);
      setIsAdmin(admin);
      setLoading(false);
    });

    return unsub;
  }, []);

  if (!isConfigured) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#13110F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        gap: 16,
        fontFamily: FONTS.body,
        color: '#F5F1EA',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36 }}>🐇</div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 20 }}>
          Firebase not configured
        </div>
        <div style={{ fontSize: 13, color: '#A39B8E', maxWidth: 340, lineHeight: 1.7 }}>
          Copy{' '}
          <code style={{ background: '#221E1A', padding: '2px 6px', borderRadius: 4, fontFamily: FONTS.mono }}>
            .env.example
          </code>{' '}
          to{' '}
          <code style={{ background: '#221E1A', padding: '2px 6px', borderRadius: 4, fontFamily: FONTS.mono }}>
            .env.local
          </code>{' '}
          and fill in your Firebase project credentials.
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
