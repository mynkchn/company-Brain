import { useState, useEffect, useCallback } from 'react';
import { playgroundService } from '@/services/api';
import type { Playground } from '@/types';

export function usePlaygrounds() {
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playgroundService.list();
      setPlaygrounds(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load playgrounds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const remove = useCallback(async (id: number) => {
    await playgroundService.delete(id);
    setPlaygrounds((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { playgrounds, loading, error, refetch: fetch, remove };
}
