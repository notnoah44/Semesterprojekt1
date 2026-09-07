// Punkt 5.2 (docs/umsetzungsplan.md): löscht Konten hart, deren
// `scheduled_deletion_at` (gesetzt von der `delete-account`-Funktion, wenn ein
// aktives Abo die sofortige Löschung verzögert hat) erreicht ist.
//
// Muss regelmäßig (z. B. täglich) aufgerufen werden — dafür im Supabase
// Dashboard unter Edge Functions → process-scheduled-deletions → "Cron
// Trigger" einrichten (z. B. `0 3 * * *`), oder per pg_cron + pg_net. Wird
// nicht automatisch durch das Deployment selbst eingerichtet.
//
// Deploy: `supabase functions deploy process-scheduled-deletions`
// Aufruf erfordert den Service-Role-Key als Bearer-Token (kein User-JWT, da
// kein einzelner Nutzer dahintersteht) — beim Einrichten des Cron Triggers im
// Dashboard als Authorization-Header hinterlegen.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hardDeleteAccount } from '../_shared/hardDeleteAccount.ts';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: due, error } = await admin
    .from('profiles')
    .select('id')
    .not('scheduled_deletion_at', 'is', null)
    .lte('scheduled_deletion_at', new Date().toISOString());
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results = await Promise.allSettled((due ?? []).map((p) => hardDeleteAccount(admin, p.id)));
  const deleted = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - deleted;

  return new Response(JSON.stringify({ checked: due?.length ?? 0, deleted, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
