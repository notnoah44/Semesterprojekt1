import { supabase } from '@/lib/supabase';
import { useNotificationStore, type AppNotification } from '@/stores/notificationStore';
import { router } from 'expo-router';

export async function readNotification(id?: string) {
  let query = supabase.from('notifications').update({ read: true }).eq('read', false);
  if (id) query = query.eq('id', id);
  const { error } = await query;
  if (error) throw error;
  if (id) useNotificationStore.getState().markRead(id);
  else useNotificationStore.getState().markAllRead();
}

export function openNotification(item: Pick<AppNotification, 'type' | 'payload'>) {
  const conversationId = item.payload?.conversation_id;
  const bookingId = item.payload?.booking_id;
  const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
  if (item.type === 'new_message' && typeof conversationId === 'string' && uuid.test(conversationId)) router.push(`/(tabs)/chat/${conversationId}`);
  else if (typeof bookingId === 'string' && uuid.test(bookingId)) router.push(`/(tabs)/home/bookings/${bookingId}`);
}
