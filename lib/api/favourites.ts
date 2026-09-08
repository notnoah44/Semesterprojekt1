import { supabase } from '@/lib/supabase';
import type { Listing } from '@/types/listing';
import type { Profile } from '@/types/user';

export interface FavouriteWithListing {
  id: string;
  created_at: string;
  listing: Listing;
}

export interface FavouriteWithSitter {
  id: string;
  created_at: string;
  sitter: Profile;
}

export async function getFavouriteListings(profileId: string) {
  const { data, error } = await supabase
    .from('favourites')
    .select('id, created_at, listing:listings(*)')
    .eq('profile_id', profileId)
    .not('listing_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Filter out favourites whose listing was deleted
  return (data ?? []).filter((f: any) => f.listing) as unknown as FavouriteWithListing[];
}

export async function getFavouriteListingIds(profileId: string) {
  const { data, error } = await supabase
    .from('favourites')
    .select('listing_id')
    .eq('profile_id', profileId)
    .not('listing_id', 'is', null);
  if (error) throw error;
  return (data ?? []).map((f) => f.listing_id as string);
}

export async function addFavourite(profileId: string, listingId: string) {
  const { error } = await supabase
    .from('favourites')
    .insert({ profile_id: profileId, listing_id: listingId });
  if (error) throw error;
}

export async function removeFavourite(profileId: string, listingId: string) {
  const { error } = await supabase
    .from('favourites')
    .delete()
    .eq('profile_id', profileId)
    .eq('listing_id', listingId);
  if (error) throw error;
}

export async function getFavouriteSitters(profileId: string) {
  const { data, error } = await supabase
    .from('favourites')
    .select('id, created_at, sitter:profiles!sitter_id(*)')
    .eq('profile_id', profileId)
    .not('sitter_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Filter out favourites whose sitter profile was deleted
  return (data ?? []).filter((f: any) => f.sitter) as unknown as FavouriteWithSitter[];
}

export async function getFavouriteSitterIds(profileId: string) {
  const { data, error } = await supabase
    .from('favourites')
    .select('sitter_id')
    .eq('profile_id', profileId)
    .not('sitter_id', 'is', null);
  if (error) throw error;
  return (data ?? []).map((f) => f.sitter_id as string);
}

export async function addFavouriteSitter(profileId: string, sitterId: string) {
  const { error } = await supabase
    .from('favourites')
    .insert({ profile_id: profileId, sitter_id: sitterId });
  if (error) throw error;
}

export async function getFavouriteCount(target: { listingId?: string; sitterId?: string }) {
  const { data, error } = await supabase.rpc('get_favourite_count', {
    p_listing_id: target.listingId ?? null,
    p_sitter_id: target.sitterId ?? null,
  });
  if (error) throw error;
  return (data ?? 0) as number;
}

export async function removeFavouriteSitter(profileId: string, sitterId: string) {
  const { error } = await supabase
    .from('favourites')
    .delete()
    .eq('profile_id', profileId)
    .eq('sitter_id', sitterId);
  if (error) throw error;
}
