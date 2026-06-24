import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types/chat';

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, participant1_profile:profiles!participant1(*), participant2_profile:profiles!participant2(*)')
    .or(`participant1.eq.${userId},participant2.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getConversation(id: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, participant1_profile:profiles!participant1(*), participant2_profile:profiles!participant2(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getOrCreateConversation(userId: string, otherUserId: string, listingId?: string) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant1.eq.${userId},participant2.eq.${otherUserId}),and(participant1.eq.${otherUserId},participant2.eq.${userId})`
    )
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant1: userId, participant2: otherUserId, listing_id: listingId ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(message: Omit<Message, 'id' | 'created_at' | 'read'>) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ ...message, read: false })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markMessagesRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);
  if (error) throw error;
}
