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
  const listingId = item.payload?.listing_id;
  const sitterId = item.payload?.sitter_id;
  const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
  if (item.type === 'new_message' && typeof conversationId === 'string' && uuid.test(conversationId)) router.push(`/(tabs)/chat/${conversationId}`);
  else if (item.type === 'favourite' && typeof listingId === 'string' && uuid.test(listingId)) router.push(`/(tabs)/search/listings/${listingId}`);
  else if (item.type === 'favourite' && typeof sitterId === 'string' && uuid.test(sitterId)) router.push(`/profile/${sitterId}?viewMode=sitter`);
  else if (typeof bookingId === 'string' && uuid.test(bookingId)) router.push(`/(tabs)/home/bookings/${bookingId}`);
}

const NOTIFICATION_ICONS: Record<string, string> = {
  new_message: 'chat-bubble',
  booking_request: 'event-available',
  booking_update: 'event-note',
  favourite: 'favorite',
};

export function notificationIcon(item: Pick<AppNotification, 'type'>) {
  return NOTIFICATION_ICONS[item.type] ?? 'notifications';
}

export function notificationLabel(item: Pick<AppNotification, 'type' | 'payload'>, t: (key: string) => string) {
  if (item.type === 'favourite') {
    return typeof item.payload?.sitter_id === 'string'
      ? t('notifications.types.favouriteSitter')
      : t('notifications.types.favouriteListing');
  }
  const key = `notifications.types.${item.type}`;
  const label = t(key);
  return label === key ? item.type.replace(/_/g, ' ') : label;
}
