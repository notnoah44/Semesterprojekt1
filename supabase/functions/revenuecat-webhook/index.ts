import { adminClient, json, syncMembership } from '../_shared/billing.ts';
import { webhookUserIds } from '../_shared/membership.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);
  try {
    const { event } = await req.json();
    if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') return json({ error: 'Invalid event' }, 400);
    const ids = webhookUserIds(event);
    // Every delivery reads current authoritative state: duplicate and out-of-order
    // cancellation/refund events cannot replay old entitlements. Transfers sync both sides.
    for (const id of ids) {
      const { data, error } = await adminClient().from('profiles').select('id').eq('id', id).maybeSingle();
      if (error) throw error;
      if (data) await syncMembership(id);
    }
    return json({ received: true });
  } catch {
    // Non-2xx makes RevenueCat retry; never acknowledge an unapplied snapshot.
    return json({ error: 'Synchronization failed' }, 503);
  }
});
