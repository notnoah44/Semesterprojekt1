import { createClient } from 'jsr:@supabase/supabase-js@2';
import { membershipFromSubscriber, type Plan } from './membership.ts';

export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function callerId(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

export async function syncMembership(userId: string) {
  const secret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  const environment = Deno.env.get('BILLING_ENVIRONMENT');
  const products = JSON.parse(Deno.env.get('REVENUECAT_PRODUCTS_JSON') ?? '{}') as Record<string, Plan>;
  if (!secret || !['sandbox', 'production'].includes(environment ?? '') || !Object.keys(products).length) throw new Error('Billing not configured');
  const admin = adminClient();
  // Revisions are allocated BEFORE the network request. A late older request
  // cannot overwrite a newer applied snapshot, including webhook retries.
  const { data: revision, error: revisionError } = await admin.rpc('next_billing_revision');
  if (revisionError) throw revisionError;
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  // API failures never revoke or grant access. Existing access still expires.
  if (!response.ok) throw new Error(`RevenueCat sync failed (${response.status})`);
  const membership = membershipFromSubscriber(await response.json(), products, environment as 'sandbox' | 'production');
  const { error } = await admin.rpc('apply_membership_snapshot', { p_user_id: userId, p_revision: revision, p_snapshot: membership });
  if (error) throw error;
  const { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (profileError) throw profileError;
  return profile;
}
