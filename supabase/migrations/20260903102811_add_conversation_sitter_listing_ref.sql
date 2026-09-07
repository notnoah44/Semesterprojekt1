-- Erlaubt die Herleitung der Sitter-/Host-Rolle in der Chat-Profilansicht (T3):
-- neben `listing_id` (Host-Inserat) jetzt auch eine Referenz auf ein Sitter-Inserat.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sitter_listing_id UUID REFERENCES sitter_listings(id);
