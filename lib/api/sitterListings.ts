import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { toDateString } from '@/lib/utils/formatDate';
import type { SitterListing, SitterListingWithProfile, SitterSearchFilters } from '@/types/sitterListing';

const SITTER_LISTING_WITH_PROFILE = '*, sitter:profiles!sitter_id(*)';

export async function getSitterListings(filters: SitterSearchFilters = {}) {
  let query = supabase.from('sitter_listings').select(SITTER_LISTING_WITH_PROFILE).eq('status', 'active');

  if (filters.keyword) query = query.ilike('title', `%${filters.keyword}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  let results = (data ?? []) as unknown as SitterListingWithProfile[];

  // availability_periods is a JSONB array; exclude listings whose every period has already ended
  const today = toDateString(new Date());
  results = results.filter(
    (l) => l.availability_periods.length === 0 || l.availability_periods.some((p) => p.to >= today)
  );

  // locations/availability_periods are JSONB arrays, filtered client-side
  if (filters.city) {
    const needle = filters.city.toLowerCase();
    results = results.filter((l) => l.locations.some((loc) => loc.city?.toLowerCase().includes(needle)));
  }
  if (filters.country) {
    const needle = filters.country.toLowerCase();
    results = results.filter((l) => l.locations.some((loc) => loc.country?.toLowerCase().includes(needle)));
  }
  if (filters.petSitting) {
    results = results.filter((l) => l.pet_sitting === filters.petSitting || l.pet_sitting === 'both');
  }
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? toDateString(new Date(filters.dateFrom)) : undefined;
    const to = filters.dateTo ? toDateString(new Date(filters.dateTo)) : undefined;
    results = results.filter((l) =>
      l.availability_periods.length === 0 || l.availability_periods.some((p) => {
        const periodFrom = p.from;
        const periodTo = p.to;
        if (from && periodTo < from) return false;
        if (to && periodFrom > to) return false;
        return true;
      })
    );
  }

  return results;
}

export async function getSitterListing(id: string) {
  const { data, error } = await supabase
    .from('sitter_listings')
    .select(SITTER_LISTING_WITH_PROFILE)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as SitterListingWithProfile;
}

export async function getMySitterListings(sitterId: string) {
  const { data, error } = await supabase
    .from('sitter_listings')
    .select('*')
    .eq('sitter_id', sitterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SitterListing[];
}

export async function upsertSitterListing(listing: Partial<SitterListing> & { sitter_id: string }) {
  const { data, error } = await supabase
    .from('sitter_listings')
    .upsert(listing)
    .select()
    .single();
  if (error) throw error;
  return data as SitterListing;
}

export async function deleteSitterListing(id: string) {
  const { error } = await supabase.from('sitter_listings').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadSitterListingPhoto(sitterId: string, uri: string) {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const path = `${sitterId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const arrayBuffer = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from('sitter-listing-photos').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('sitter-listing-photos').getPublicUrl(path);
  return data.publicUrl;
}
