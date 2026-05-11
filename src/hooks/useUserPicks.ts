import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { picksCol, type PickDoc } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export interface UseUserPicksResult {
  picks: Record<string, PickDoc>;
  loading: boolean;
  error: Error | null;
}

export function useUserPicks(): UseUserPicksResult {
  const { user } = useAuth();
  const [picks, setPicks] = useState<Record<string, PickDoc>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If no user, return immediately with empty state
    if (!user) {
      setPicks({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = onSnapshot(
        picksCol(user.uid),
        (snapshot) => {
          const picksMap: Record<string, PickDoc> = {};

          snapshot.docs.forEach((doc) => {
            const pick = doc.data();
            picksMap[doc.id] = pick;
          });

          setPicks(picksMap);
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
  }, [user]);

  return { picks, loading, error };
}
