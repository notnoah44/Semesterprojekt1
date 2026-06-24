import { supabase } from '@/lib/supabase';
import type { Listing, SearchFilters } from '@/types/listing';

export async function getListings(filters: SearchFilters = {}) {
  let query = supabase.from('listings').select('*').eq('status', 'active');

  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.country) query = query.ilike('country', `%${filters.country}%`);
  if (filters.keyword) query = query.ilike('title', `%${filters.keyword}%`);
  if (filters.hasPets !== undefined && filters.hasPets !== null) {
    query = query.eq('has_pets', filters.hasPets);
  }
  if (filters.dateFrom) {
    query = query.gte('available_from', filters.dateFrom.toISOString().split('T')[0]);
  }
  if (filters.dateTo) {
    query = query.lte('available_to', filters.dateTo.toISOString().split('T')[0]);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

export async function getListing(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function getMyListings(ownerId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

export async function upsertListing(listing: Partial<Listing> & { owner_id: string }) {
  const { data, error } = await supabase
    .from('listings')
    .upsert(listing)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function deleteListing(id: string) {
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadListingPhoto(ownerId: string, uri: string) {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const { error } = await supabase.storage.from('listing-photos').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
  return data.publicUrl;
}
