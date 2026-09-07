import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';

export function useNotifications() {
  const userId = useAuthStore(s => s.user?.id);
  useEffect(() => {
    let active = true;
    let request = 0;
    useNotificationStore.getState().setNotifications([]);
    if (!userId) return;
    const refresh = async () => {
      const current = ++request;
      const { data, error } = await supabase.from('notifications').select('*').eq('profile_id', userId).order('created_at', { ascending: false });
      if (active && current === request && !error && data) useNotificationStore.getState().setNotifications(data);
    };
    void refresh();
    const channel = supabase.channel(`notifications-${userId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${userId}` }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); });
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; listener.remove(); void supabase.removeChannel(channel); };
  }, [userId]);
}
