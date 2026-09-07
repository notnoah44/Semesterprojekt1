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

    const topic = `realtime:messages:${conversationId}`;
    // Reuse an in-flight channel for this topic instead of calling `.on()` on it again:
    // removeChannel() only closes the socket asynchronously, so a rapid effect re-run
    // can otherwise find the old, already-(re)joining channel and throw.
    const existing = supabase.getChannels().find((c) => c.topic === topic);

    channelRef.current =
      existing ??
      supabase
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, onMessage]);
}
