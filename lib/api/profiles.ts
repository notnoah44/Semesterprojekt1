import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import type { Profile, TravelCompanion, SitterProfile, HostProfile } from '@/types/user';

export const MIN_BIO_LENGTH = 150;

/**
 * Pflichtfelder fürs allgemeine öffentliche Profil, bevor ein Inserat (Sitter
 * oder Host) erstellt werden darf (Punkt 10, offene-punkte-anpassungen.md):
 * Geburtsjahr, Profilbild, Stadt, Land, mind. 150 Zeichen "Über dich".
 */
export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return (
    !!profile.birth_year &&
    !!profile.avatar_url &&
    !!profile.city &&
    !!profile.country &&
    (profile.bio?.length ?? 0) >= MIN_BIO_LENGTH
  );
}

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

export async function uploadVerificationPhoto(userId: string, kind: 'id-photo' | 'selfie', uri: string) {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const path = `${userId}/${kind}.${ext}`;
  const arrayBuffer = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from('id-verification').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
}

export async function submitVerification(userId: string) {
  return upsertProfile({ id: userId, id_verification_submitted_at: new Date().toISOString() });
}

export async function markEmailVerified(userId: string) {
  return upsertProfile({ id: userId, email_verified: true });
}

export async function uploadVideoPitch(userId: string, uri: string) {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'mp4').toLowerCase();
  const path = `${userId}/video-pitch.${ext}`;
  const arrayBuffer = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: `video/${ext === 'mov' ? 'quicktime' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProfilePhoto(userId: string, uri: string) {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const path = `${userId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const arrayBuffer = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
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

export async function getSitterProfile(profileId: string) {
  const { data, error } = await supabase
    .from('sitter_profiles')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data as SitterProfile | null;
}

export async function upsertSitterProfile(profile: Partial<SitterProfile> & { profile_id: string }) {
  const { data, error } = await supabase
    .from('sitter_profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as SitterProfile;
}

export async function getHostProfile(profileId: string) {
  const { data, error } = await supabase
    .from('host_profiles')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data as HostProfile | null;
}

export async function upsertHostProfile(profile: Partial<HostProfile> & { profile_id: string }) {
  const { data, error } = await supabase
    .from('host_profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as HostProfile;
}
