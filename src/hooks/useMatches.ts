import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { matchesCol, type MatchDoc } from '../firebase/firestore';
import { db } from '../firebase/client';

export interface UseMatchesResult {
  matchesByDate: Record<string, MatchDoc[]>;
  loading: boolean;
  error: Error | null;
}

export function useMatches(): UseMatchesResult {
  const [matchesByDate, setMatchesByDate] = useState<Record<string, MatchDoc[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Handle Firebase not configured
    if (db === null) {
      setMatchesByDate({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(matchesCol(), orderBy('kickoff', 'asc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const grouped: Record<string, MatchDoc[]> = {};

          snapshot.docs.forEach((doc) => {
            const match = doc.data();
            const date = match.kickoff.toDate();
            const dateKey = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD

            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push(match);
          });

          // Sort matches within each date group by kickoff ascending (already ordered by query)
          // Sort date groups chronologically
          const sortedByDate = Object.keys(grouped)
            .sort()
            .reduce<Record<string, MatchDoc[]>>((acc, dateKey) => {
              acc[dateKey] = grouped[dateKey];
              return acc;
            }, {});

          setMatchesByDate(sortedByDate);
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
  }, []);

  return { matchesByDate, loading, error };
}
