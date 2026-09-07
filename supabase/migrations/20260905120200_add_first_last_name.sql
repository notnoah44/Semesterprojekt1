-- Punkt 1 (offene-punkte-anpassungen.md): Vor-/Nachname werden ab jetzt bei
-- der Registrierung getrennt erfasst und sind danach gesperrt (nur der
-- Vorname ist für andere Nutzer sichtbar, bis eine Buchung zustande kommt —
-- siehe getDisplayName in lib/api/connections.ts).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Bestandsdaten: bester Versuch, den vorhandenen full_name aufzuteilen
-- (erstes Wort = Vorname, Rest = Nachname).
UPDATE profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name  = COALESCE(last_name, NULLIF(TRIM(substring(full_name FROM position(' ' IN full_name) + 1)), ''))
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- Auto-create profile on signup: jetzt mit Vor-/Nachname aus den Signup-Metadaten.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    TRIM(CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Serverseitige Sperre: first_name/last_name dürfen nach dem ersten Setzen
-- nicht mehr geändert werden (zusätzlich zur UI-Sperre).
CREATE OR REPLACE FUNCTION prevent_name_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.first_name IS NOT NULL AND NEW.first_name IS DISTINCT FROM OLD.first_name THEN
    RAISE EXCEPTION 'first_name cannot be changed after registration';
  END IF;
  IF OLD.last_name IS NOT NULL AND NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    RAISE EXCEPTION 'last_name cannot be changed after registration';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lock_name_fields ON profiles;
CREATE TRIGGER lock_name_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_name_change();
