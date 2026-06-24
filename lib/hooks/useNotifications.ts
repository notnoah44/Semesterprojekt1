import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';

// Push token registration is set up in a development build only

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotifications(data);
      });

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          supabase
            .from('notifications')
            .select('*')
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) setNotifications(data);
            });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, setNotifications]);
}
