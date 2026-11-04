import { useCallback, useEffect, useState } from 'react';
import type { Page } from '@vyro/types';
import { errorMessage } from './errors';

/** Loads a cursor-paginated list with "load more". Resets when `key` changes. */
export function useCursorList<T>(load: (cursor?: string | null) => Promise<Page<T>>, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'idle' | 'more' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (c: string | null, reset: boolean) => {
    setState(reset ? 'loading' : 'more');
    setError(null);
    try {
      const p = await load(c);
      setItems((prev) => (reset ? p.items : [...prev, ...p.items]));
      setCursor(p.nextCursor);
      setState(p.nextCursor ? 'idle' : 'done');
    } catch (e) { setError(errorMessage(e)); setState('idle'); }
  }, [load]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setItems([]); void fetchPage(null, true); }, [key]);

  return {
    items, setItems, error, loading: state === 'loading', loadingMore: state === 'more',
    hasMore: state !== 'done' && !!cursor,
    loadMore: () => cursor && fetchPage(cursor, false),
    reload: () => fetchPage(null, true),
  };
}
