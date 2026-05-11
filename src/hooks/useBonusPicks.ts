import { useEffect, useState, useCallback } from 'react';
import { onSnapshot, getDoc, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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

/**
 * Pure helper — exported for testing.
 * Returns true when now >= tournamentStartAt (i.e. tournament has started).
 */
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

    let unsubscribe: (() => void) | undefined;

    async function setup() {
      try {
        // Fetch settings/system once to determine lock state
        if (!db) throw new Error('Firebase not configured');
        const settingsSnap = await getDoc(doc(db, 'settings', 'system'));
        const tournamentStartAt = settingsSnap.exists()
          ? (settingsSnap.data().tournamentStartAt as Timestamp | undefined) ?? null
          : null;

        setIsLocked(isPickLocked(tournamentStartAt, new Date()));

        // Subscribe to the user's bonus pick doc
        unsubscribe = onSnapshot(
          bonusPickDoc(user!.uid),
          (snap) => {
            setBonusPick(snap.exists() ? snap.data() : null);
            setLoading(false);
          },
          (err) => {
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }

    void setup();

    return () => {
      unsubscribe?.();
    };
  }, [user]);

  const submitTopScorer = useCallback(
    async (playerId: string, playerName: string): Promise<void> => {
      if (!user) return;
      if (isLocked) throw new Error('Bonus picks are locked — tournament has started');

      await setDoc(
        bonusPickDoc(user.uid),
        {
          userId: user.uid,
          topScorer: {
            playerId,
            playerName,
            submittedAt: serverTimestamp() as unknown as Timestamp,
          },
          worldCupWinner: null,
        },
        { merge: true }
      );
    },
    [user, isLocked]
  );

  const submitWorldCupWinner = useCallback(
    async (teamCode: string): Promise<void> => {
      if (!user) return;
      if (isLocked) throw new Error('Bonus picks are locked — tournament has started');

      await setDoc(
        bonusPickDoc(user.uid),
        {
          userId: user.uid,
          topScorer: null,
          worldCupWinner: {
            teamCode,
            submittedAt: serverTimestamp() as unknown as Timestamp,
          },
        },
        { merge: true }
      );
    },
    [user, isLocked]
  );

  if (!user) {
    return {
      bonusPick: null,
      isLocked: false,
      loading: false,
      error: null,
      submitTopScorer: noopAsync,
      submitWorldCupWinner: noopAsync,
    };
  }

  return {
    bonusPick,
    isLocked,
    loading,
    error,
    submitTopScorer,
    submitWorldCupWinner,
  };
}
