import { useState, useCallback } from 'react';
import { getListings } from '@/lib/api/listings';
import { useSearchStore } from '@/stores/searchStore';
import type { Listing } from '@/types/listing';

export function useSearch() {
  const filters = useSearchStore((s) => s.filters);
  const [results, setResults] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getListings(filters);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  return { results, isLoading, error, search };
}
