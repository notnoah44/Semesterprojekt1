-- Punkt 15 (offene-punkte-anpassungen.md): "Woher du kommst" (origin) und
-- "Stadt" (city) waren zwei redundante Ortsfelder. Zusammengeführt zu einem
-- Feld "Wohnort" (weiterhin Spalte `city`), in Kombination mit `country`.
UPDATE profiles SET city = origin
WHERE (city IS NULL OR city = '') AND origin IS NOT NULL AND origin <> '';

ALTER TABLE profiles DROP COLUMN IF EXISTS origin;
