import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/chat';

export function useRealTimeChat(
  conversationId: string | null,
  onMessage: (message: Message) => void
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    channelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [conversationId, onMessage]);
}
