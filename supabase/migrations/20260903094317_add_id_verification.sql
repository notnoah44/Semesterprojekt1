-- ID-Check (manuelle Verifizierung): privater Storage-Bucket für Ausweisfoto + Selfie
-- See docs/feature-konto-restructure-membership.md, Abschnitt 3 (ID-Check-Flow) / Schritt 6f

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_verification_submitted_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public)
VALUES ('id-verification', 'id-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Nutzer duerfen nur ihre eigenen Verifizierungsfotos hochladen/ansehen/loeschen
-- (Pfad-Konvention: {user_id}/id-photo.jpg, {user_id}/selfie.jpg).
-- Manuelle Pruefung + Loeschung passiert ueber das Supabase-Dashboard mit
-- Service-Role-Zugriff, der RLS ohnehin umgeht.
CREATE POLICY "Own verification photos - upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own verification photos - view" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own verification photos - delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'id-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
