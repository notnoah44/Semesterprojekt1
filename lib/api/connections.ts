import { supabase } from '@/lib/supabase';

/**
 * Namens-Sichtbarkeit (Punkt 1, offene-punkte-anpassungen.md): andere Nutzer
 * sehen standardmäßig nur den Vornamen. Der volle Name wird erst sichtbar,
 * sobald zwischen den beiden eine akzeptierte oder abgeschlossene Buchung
 * existiert (in beide Rollenrichtungen, sitter_id/owner_id).
 */
const CONNECTED_STATUSES = ['accepted', 'completed'];

/** Prüft, ob zwischen zwei Nutzern eine Buchung mit obigem Status existiert. */
export async function isConnected(userId: string, otherId: string): Promise<boolean> {
  if (userId === otherId) return true;
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .in('status', CONNECTED_STATUSES)
    .or(`and(sitter_id.eq.${userId},owner_id.eq.${otherId}),and(sitter_id.eq.${otherId},owner_id.eq.${userId})`)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Ids aller Nutzer, mit denen `userId` verbunden ist (für Listen, ohne N+1-Anfragen). */
export async function getConnectedProfileIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('bookings')
    .select('sitter_id, owner_id')
    .in('status', CONNECTED_STATUSES)
    .or(`sitter_id.eq.${userId},owner_id.eq.${userId}`);
  if (error) throw error;
  const ids = new Set<string>();
  for (const b of data ?? []) {
    if (b.sitter_id === userId) ids.add(b.owner_id);
    if (b.owner_id === userId) ids.add(b.sitter_id);
  }
  return ids;
}

export function firstNameOf(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}

/** Voller Name nur, wenn `isConnected` — sonst nur der Vorname. */
export function getDisplayName(fullName: string | null | undefined, connected: boolean): string {
  return connected ? (fullName ?? '') : firstNameOf(fullName);
}
