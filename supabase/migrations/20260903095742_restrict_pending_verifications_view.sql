-- `pending_verifications` ist ein reines Admin-Hilfsmittel fuers Dashboard und
-- soll NICHT ueber die oeffentliche REST-API (PostgREST) abfragbar sein.
-- Der Supabase-Dashboard-Zugriff laeuft ueber die postgres-Rolle und ist davon
-- nicht betroffen; nur `anon`/`authenticated` (also die App/API) werden gesperrt.
REVOKE ALL ON pending_verifications FROM anon, authenticated;
