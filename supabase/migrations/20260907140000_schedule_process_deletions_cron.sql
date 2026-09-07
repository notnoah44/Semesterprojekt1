-- Punkt 5.2 (docs/umsetzungsplan.md): richtet den täglichen Sweep ein, der
-- Konten hart löscht, deren `scheduled_deletion_at` erreicht ist (siehe
-- supabase/functions/process-scheduled-deletions).
--
-- Voraussetzung: der Service-Role-Key muss VOR dieser Migration einmalig im
-- Vault hinterlegt werden (im SQL Editor des Dashboards, NICHT hier im Repo,
-- da dies sonst den Key in die Git-Historie schreiben würde):
--
--   select vault.create_secret('<DEIN_SERVICE_ROLE_KEY>', 'service_role_key');
--
-- Ohne diesen Secret-Eintrag schlägt der Cron-Aufruf mit 401 fehl (die Edge
-- Function vergleicht den Authorization-Header gegen SUPABASE_SERVICE_ROLE_KEY).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'process-scheduled-deletions',
  '0 3 * * *', -- täglich um 03:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://eaexnhwhazziqgovdqyo.supabase.co/functions/v1/process-scheduled-deletions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
