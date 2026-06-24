import { supabase } from '@/lib/supabase';
import type { Listing } from '@/types/listing';

export interface FavouriteWithListing {
  id: string;
  created_at: string;
  listing: Listing;
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
