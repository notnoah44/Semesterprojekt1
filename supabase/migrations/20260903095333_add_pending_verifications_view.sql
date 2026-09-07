-- Admin-Hilfsmittel: offene ID-Check-Einreichungen auf einen Blick im
-- Supabase Table Editor (unter "Views"), statt manuell durch `profiles`
-- zu scrollen. Kein Client-Code liest diese View.
CREATE OR REPLACE VIEW pending_verifications AS
SELECT
  id,
  full_name,
  avatar_url,
  id_verification_submitted_at
FROM profiles
WHERE id_verification_submitted_at IS NOT NULL
  AND id_verified = FALSE
ORDER BY id_verification_submitted_at ASC;
