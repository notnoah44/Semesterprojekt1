import { create } from 'zustand';
import type { SearchFilters } from '@/types/listing';

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
}

interface SearchStore {
  filters: SearchFilters;
  savedSearches: SavedSearch[];
  setFilters: (filters: SearchFilters) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  addSavedSearch: (search: SavedSearch) => void;
  removeSavedSearch: (id: string) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  filters: {},
  savedSearches: [],
  setFilters: (filters) => set({ filters }),
  updateFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: {} }),
  addSavedSearch: (search) =>
    set((state) => ({ savedSearches: [...state.savedSearches, search] })),
  removeSavedSearch: (id) =>
    set((state) => ({
      savedSearches: state.savedSearches.filter((s) => s.id !== id),
    })),
}));
