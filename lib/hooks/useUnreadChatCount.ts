import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export const useChatUpdates = create<{ unread: number; revision: number }>(() => ({ unread: 0, revision: 0 }));

export function useUnreadChatCount() {
  const userId = useAuthStore(s => s.user?.id);
  useEffect(() => {
    let active = true;
    let request = 0;
    useChatUpdates.setState({ unread: 0 });
    if (!userId) return;
    const refresh = async () => {
      const current = ++request;
      const { count, error } = await supabase.from('messages').select('id,conversations!inner(id)', { count: 'exact', head: true }).eq('read', false).neq('sender_id', userId)
        .or(`participant1.eq.${userId},participant2.eq.${userId}`, { referencedTable: 'conversations' });
      if (active && current === request && !error) useChatUpdates.setState(s => ({ unread: count ?? 0, revision: s.revision + 1 }));
    };
    void refresh();
    const channel = supabase.channel(`chat-badge-${userId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); });
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; listener.remove(); void supabase.removeChannel(channel); };
  }, [userId]);
  return useChatUpdates(s => s.unread);
}
