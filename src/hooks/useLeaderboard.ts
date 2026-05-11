import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { leaderboardEntriesCol, type LeaderboardEntry } from '../firebase/firestore';

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: Error | null;
}

export function useLeaderboard(leagueId: string): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const q = query(leaderboardEntriesCol(leagueId), orderBy('rank', 'asc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setEntries(snapshot.docs.map((doc) => doc.data()));
          setLoading(false);
        },
        (err) => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [leagueId]);

  return { entries, loading, error };
}
