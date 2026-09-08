import { adminClient, callerId, cors, json } from '../_shared/billing.ts';
import { hardDeleteAccount } from '../_shared/hardDeleteAccount.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const id = await callerId(req);
    if (!id) return json({ error: 'Unauthorized' }, 401);
    // A running store subscription never blocks account deletion.
    await hardDeleteAccount(adminClient(), id);
    return json({ status: 'deleted' });
  } catch {
    return json({ error: 'Account deletion failed. Please retry.' }, 500);
  }
});
