import { useEffect, useState, useCallback, useRef } from 'react';
import { onSnapshot, getDoc, doc, setDoc, serverTimestamp, Timestamp, type FieldValue } from 'firebase/firestore';
import { db } from '../firebase/client';
import { bonusPickDoc, type BonusPickDoc } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export interface UseBonusPicksResult {
  bonusPick: BonusPickDoc | null;
  isLocked: boolean;
  loading: boolean;
  error: Error | null;
  submitTopScorer: (playerId: string, playerName: string) => Promise<void>;
  submitWorldCupWinner: (teamCode: string) => Promise<void>;
}

// Write-side payload types (FieldValue for submittedAt, not Timestamp)
type BonusTopScorerWrite = { playerId: string; playerName: string; submittedAt: FieldValue };
type BonusWorldCupWinnerWrite = { teamCode: string; submittedAt: FieldValue };

// exported for unit tests
export function isPickLocked(tournamentStartAt: Timestamp | null, now: Date): boolean {
  if (!tournamentStartAt) return false;
  return now >= tournamentStartAt.toDate();
}

const noopAsync = async () => {};

export function useBonusPicks(): UseBonusPicksResult {
  const { user } = useAuth();
  const [bonusPick, setBonusPick] = useState<BonusPickDoc | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const tournamentStartAtRef = useRef<Timestamp | null>(null);

  useEffect(() => {
    if (!user) {
      setBonusPick(null);
      setIsLocked(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let cancelled = false;
    let unsubscribeBonus: (() => void) | undefined;

    async function setup() {
      try {
        if (!db) throw new Error('Firebase not configured');
        const systemSnap = await getDoc(doc(db, 'settings', 'system'));
        if (cancelled) return;

        const systemData = systemSnap.data() as Record<string, unknown> | undefined;
        const tournamentStartAt = (systemData?.['tournamentStartAt'] as Timestamp | undefined) ?? null;
        setIsLocked(isPickLocked(tournamentStartAt, new Date()));
        tournamentStartAtRef.current = tournamentStartAt;

        unsubscribeBonus = onSnapshot(
          bonusPickDoc(user.uid),
          (snap) => { setBonusPick(snap.exists() ? snap.data() : null); setLoading(false); },
          (err) => { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); }
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    }

    void setup();
    return () => {
      cancelled = true;
      unsubscribeBonus?.();
    };
  }, [user]);

  const submitTopScorer = useCallback(
    async (playerId: string, playerName: string): Promise<void> => {
      if (!user) return;
      if (isPickLocked(tournamentStartAtRef.current, new Date())) {
        throw new Error('Bonus picks are locked — tournament has started');
      }

      await setDoc(
        bonusPickDoc(user.uid),
        {
          userId: user.uid,
          topScorer: {
            playerId,
            playerName,
            submittedAt: serverTimestamp(),
          } as BonusTopScorerWrite,
        },
        { merge: true }
      );
    },
    [user]
  );

  const submitWorldCupWinner = useCallback(
    async (teamCode: string): Promise<void> => {
      if (!user) return;
      if (isPickLocked(tournamentStartAtRef.current, new Date())) {
        throw new Error('Bonus picks are locked — tournament has started');
      }

      await setDoc(
        bonusPickDoc(user.uid),
        {
          userId: user.uid,
          worldCupWinner: {
            teamCode,
            submittedAt: serverTimestamp(),
          } as BonusWorldCupWinnerWrite,
        },
        { merge: true }
      );
    },
    [user]
  );

  return {
    bonusPick,
    isLocked,
    loading,
    error,
    submitTopScorer,
    submitWorldCupWinner,
  };
}
