-- Punkt 13 (offene-punkte-anpassungen.md): "Alter" als fest eingetragene Zahl
-- veraltet mit der Zeit. Ersetzt durch Geburtsjahr, aus dem das Alter laufend
-- berechnet wird (siehe lib/utils/age.ts, getAgeFromBirthYear).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year INT;

-- Bestandsdaten: da das echte Geburtsjahr nicht bekannt ist, nur eine Näherung
-- aus dem bisherigen Alter möglich (aktuelles Jahr - age).
UPDATE profiles SET birth_year = EXTRACT(YEAR FROM NOW())::INT - age
WHERE age IS NOT NULL AND birth_year IS NULL;

ALTER TABLE profiles DROP COLUMN IF EXISTS age;
