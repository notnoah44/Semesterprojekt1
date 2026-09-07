import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.2';

// Database webhook: notifications INSERT -> this function, with x-webhook-secret.
// Deploy with verify_jwt=false; authentication is the dedicated webhook secret.
Deno.serve(async request => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || request.headers.get('x-webhook-secret') !== secret) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const event = await request.json();
    if (event.type !== 'INSERT' || event.table !== 'notifications' || event.schema !== 'public' || !event.record?.id) return new Response('Ignored');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // Load the real row rather than trusting a supplied notification body or recipient.
    const { data: notification, error } = await db.from('notifications').select('*').eq('id', event.record.id).single();
    if (error) throw error;
    if (!['new_message', 'booking_request', 'booking_update'].includes(notification.type) || notification.read) return new Response('Ignored');
    const { data: profile, error: profileError } = await db.from('profiles').select('is_blocked,notification_preferences').eq('id', notification.profile_id).single();
    if (profileError) throw profileError;
    if (profile.is_blocked || profile.notification_preferences?.[notification.type]?.push === false) return new Response('Disabled');
    const { data: tokens, error: tokenError } = await db.from('push_tokens').select('token').eq('user_id', notification.profile_id);
    if (tokenError) throw tokenError;
    const body = notification.type === 'new_message' ? 'Du hast eine neue Nachricht.' : notification.type === 'booking_request' ? 'Du hast eine neue Buchungsanfrage.' : 'Deine Buchung wurde aktualisiert.';
    for (let offset = 0; offset < (tokens?.length ?? 0); offset += 100) {
      const batch = tokens!.slice(offset, offset + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}) },
        body: JSON.stringify(batch.map(({ token }) => ({ to: token, title: 'PawStay', body, sound: 'default', channelId: 'default', data: { ...notification.payload, type: notification.type, profile_id: notification.profile_id } }))),
      });
      if (!response.ok) throw Error('Expo push service rejected request');
      const tickets = await response.json();
      if (!Array.isArray(tickets.data)) throw Error('Invalid Expo push response');
      for (const [index, ticket] of tickets.data.entries()) {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await db.from('push_tokens').delete().eq('token', batch[index].token);
        } else if (ticket.status === 'error') throw Error('Expo push ticket failed');
      }
    }
    return new Response('Sent');
  } catch { console.error('Push dispatch failed; inspect webhook delivery and Expo credentials.'); return new Response('Push dispatch failed', { status: 500 }); }
});
