import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types/chat';

export function isMissingChatHidingTable(error: { code?: string; message?: string } | null) {
  return !!error && ['PGRST205', '42P01'].includes(error.code ?? '') &&
    (error.message ?? '').includes('conversation_hidden');
}

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, participant1_profile:profiles!participant1(*), participant2_profile:profiles!participant2(*), listing:listings(id,title,owner_id,photos), sitter_listing:sitter_listings(id,title,sitter_id,cover_photo), messages(content,created_at)')
    .or(`participant1.eq.${userId},participant2.eq.${userId}`)
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const { data: hidden, error: hiddenError } = await supabase.from('conversation_hidden').select('conversation_id').eq('user_id', userId);
  // Older databases can still display chats before the optional hiding migration.
  // Permission, network and unrelated schema failures must remain visible.
  if (hiddenError && !isMissingChatHidingTable(hiddenError)) throw hiddenError;
  const ids = new Set(hidden?.map(h => h.conversation_id));
  return (data ?? []).filter(c => !ids.has(c.id)).sort((a, b) =>
    (b.messages[0]?.created_at ?? b.created_at).localeCompare(a.messages[0]?.created_at ?? a.created_at));
}

export async function getConversation(id: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1_profile:profiles!participant1(*),
      participant2_profile:profiles!participant2(*),
      listing:listings(id,title,owner_id,photos),
      sitter_listing:sitter_listings(id,title,sitter_id,cover_photo)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function hideConversationForUser(conversationId: string, userId: string) {
  const { error } = await supabase.from('conversation_hidden').upsert({ conversation_id: conversationId, user_id: userId });
  if (error) throw error;
}

export async function findConversation(userId: string, otherUserId: string, listingId?: string, sitterListingId?: string) {
  let query = supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant1.eq.${userId},participant2.eq.${otherUserId}),and(participant1.eq.${otherUserId},participant2.eq.${userId})`
    );
  if (listingId) query = query.eq('listing_id', listingId);
  if (sitterListingId) query = query.eq('sitter_listing_id', sitterListingId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as Conversation | null;
}

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  listingId?: string,
  sitterListingId?: string,
  isUnlocked = true
) {
  const existing = await findConversation(userId, otherUserId, listingId, sitterListingId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant1: userId,
      participant2: otherUserId,
      listing_id: listingId ?? null,
      sitter_listing_id: sitterListingId ?? null,
      is_unlocked: isUnlocked,
    })
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
  const { error: notificationError } = await supabase.from('notifications').update({ read: true })
    .eq('profile_id', userId).eq('type', 'new_message').eq('read', false).contains('payload', { conversation_id: conversationId });
  if (notificationError) throw notificationError;
}
