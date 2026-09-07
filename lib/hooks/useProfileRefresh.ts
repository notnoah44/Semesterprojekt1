import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/api/profiles';
import { useAuthStore } from '@/stores/authStore';
import i18n from '@/lib/i18n';

export async function refreshOwnProfile() {
  const id = useAuthStore.getState().user?.id;
  if (!id) return;
  const profile = await getProfile(id);
  if (useAuthStore.getState().user?.id !== id) return;
  if (profile.is_blocked) {
    useAuthStore.getState().clear();
    await supabase.auth.signOut();
    Alert.alert(i18n.t('errors.title'), i18n.t('fixes.blocked'));
    return;
  }
  useAuthStore.getState().setUser(profile);
}

export function useProfileRefresh() {
  const id = useAuthStore(s => s.user?.id);
  useEffect(() => {
    if (!id) return;
    const refresh = () => { void refreshOwnProfile().catch(() => {}); };
    refresh();
    const listener = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    const channel = supabase.channel(`own-profile-${id}-${Date.now()}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${id}` }, refresh).subscribe();
    return () => { listener.remove(); void supabase.removeChannel(channel); };
  }, [id]);
}
