-- Punkt 5.2 (umsetzungsplan.md): Kontolöschung. Ein Konto mit aktivem Abo wird
-- nicht sofort hart gelöscht, sondern erst zum Ende der bezahlten Laufzeit
-- (membership_expires_at). Bis dahin bleibt es normal nutzbar. Ein täglicher
-- Sweep (Edge Function `process-scheduled-deletions`, siehe
-- supabase/functions/) löscht Konten, deren Termin erreicht ist.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.scheduled_deletion_at IS
  'Gesetzt, wenn der User sein Konto gelöscht hat, aber ein aktives Abo die sofortige Löschung verzögert. Sobald erreicht, löscht process-scheduled-deletions das Konto hart (auth.users + Storage).';
