import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { leagueDoc, type LeagueDoc } from '../firebase/firestore';

export interface UseLeaguesResult {
  leagues: Array<LeagueDoc & { id: string }>;
  loading: boolean;
  error: Error | null;
}

export function useLeagues(leagueIds: string[]): UseLeaguesResult {
  const [leagues, setLeagues] = useState<Array<LeagueDoc & { id: string }>>([]);
  const [loading, setLoading] = useState(leagueIds.length > 0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (leagueIds.length === 0) {
      setLeagues([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const resolved = new Array<LeagueDoc & { id: string } | null>(leagueIds.length).fill(null);
    const settled = new Array<boolean>(leagueIds.length).fill(false);

    const unsubscribers = leagueIds.map((id, i) =>
      onSnapshot(
        leagueDoc(id),
        (snap) => {
          if (!active) return;
          resolved[i] = snap.exists() ? { ...snap.data(), id: snap.id } : null;
          settled[i] = true;
          if (settled.every(Boolean)) {
            setLeagues(resolved.filter((l): l is LeagueDoc & { id: string } => l !== null));
            setLoading(false);
          }
        },
        (err) => {
          if (!active) return;
          settled[i] = true;
          setLeagues(resolved.filter(Boolean) as Array<LeagueDoc & { id: string }>);
          setError(err instanceof Error ? err : new Error(String(err)));
          if (settled.every(Boolean)) {
            setLoading(false);
          }
        }
      )
    );

    return () => {
      active = false;
      unsubscribers.forEach((unsub) => unsub());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueIds.join(',')]);

  return { leagues, loading, error };
}
