import { useState, useCallback, useRef } from 'react';
import { getListings } from '@/lib/api/listings';
import { useSearchStore } from '@/stores/searchStore';
import type { Listing } from '@/types/listing';

export function useSearch() {
  const filters = useSearchStore((s) => s.filters);
  const [results, setResults] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const search = useCallback(async () => {
    const current = ++request.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getListings(filters);
      if (current === request.current) setResults(data);
    } catch (e) {
      if (current === request.current) setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      if (current === request.current) setIsLoading(false);
    }
  }, [filters]);

  return { results, isLoading, error, search };
}
