import { callerId, cors, json, syncMembership } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const id = await callerId(req);
    if (!id) return json({ error: 'Unauthorized' }, 401);
    const profile = await syncMembership(id);
    return profile ? json({ profile }) : json({ error: 'Account not found' }, 404);
  } catch {
    return json({ error: 'Membership could not be verified. Try synchronizing again.' }, 503);
  }
});
