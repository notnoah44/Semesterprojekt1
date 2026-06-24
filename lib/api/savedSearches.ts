import { supabase } from '@/lib/supabase';
import type { SearchFilters } from '@/types/listing';

export interface SavedSearchRow {
  id: string;
  profile_id: string;
  name: string | null;
  filters: SearchFilters;
  created_at: string;
}

export async function getSavedSearches(profileId: string) {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SavedSearchRow[];
}

export async function createSavedSearch(profileId: string, name: string, filters: SearchFilters) {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({ profile_id: profileId, name, filters })
    .select()
    .single();
  if (error) throw error;
  return data as SavedSearchRow;
}

export async function deleteSavedSearch(id: string) {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  if (error) throw error;
}
