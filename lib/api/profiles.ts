import { supabase } from '@/lib/supabase';
import type { Profile, TravelCompanion } from '@/types/user';

export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getTravelCompanions(profileId: string) {
  const { data, error } = await supabase
    .from('travel_companions')
    .select('*')
    .eq('profile_id', profileId);
  if (error) throw error;
  return data as TravelCompanion[];
}

export async function upsertTravelCompanion(companion: Partial<TravelCompanion> & { profile_id: string }) {
  const { data, error } = await supabase
    .from('travel_companions')
    .upsert(companion)
    .select()
    .single();
  if (error) throw error;
  return data as TravelCompanion;
}

export async function deleteTravelCompanion(id: string) {
  const { error } = await supabase.from('travel_companions').delete().eq('id', id);
  if (error) throw error;
}
