// Punkt 5.2 (docs/umsetzungsplan.md): Kontolöschung.
//
// Läuft mit der Service-Role, weil das Löschen eines auth.users-Eintrags
// (supabase.auth.admin.deleteUser) nur mit dem Service-Role-Key möglich ist —
// das kann der Client nicht selbst tun. Der Client authentifiziert sich mit
// seinem normalen Nutzer-JWT; diese Funktion liest daraus, wer der Aufrufer
// ist, und handelt ausschließlich für dessen eigenes Konto.
//
// Deploy: `supabase functions deploy delete-account`
// Benötigt Secrets (werden von Supabase i.d.R. automatisch bereitgestellt):
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hardDeleteAccount } from '../_shared/hardDeleteAccount.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('membership_tier, membership_expires_at')
    .eq('id', user.id)
    .single();
  if (profileError) return json({ error: profileError.message }, 500);

  const hasActiveMembership =
    profile.membership_tier === 'standard' &&
    !!profile.membership_expires_at &&
    new Date(profile.membership_expires_at).getTime() > Date.now();

  if (hasActiveMembership) {
    const { error: updateError } = await admin
      .from('profiles')
      .update({ scheduled_deletion_at: profile.membership_expires_at })
      .eq('id', user.id);
    if (updateError) return json({ error: updateError.message }, 500);

    return json({ status: 'scheduled', scheduledFor: profile.membership_expires_at });
  }

  await hardDeleteAccount(admin, user.id);
  return json({ status: 'deleted' });
});
