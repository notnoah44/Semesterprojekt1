-- Neuer Ereignistyp "search_alert" im Default fuer kuenftige Profile.
ALTER TABLE profiles ALTER COLUMN notification_preferences SET DEFAULT '{
  "new_message": {"push": true, "email": true},
  "booking_request": {"push": true, "email": true},
  "booking_update": {"push": true, "email": true},
  "favourite": {"push": true, "email": false},
  "membership": {"push": true, "email": true},
  "search_alert": {"push": true, "email": false}
}'::jsonb;

-- T8: Such-Alarme (Rechtematrix "searchAlerts", Pro-Feature). Gleicht neue/
-- aktiv geschaltete Host-Inserate gegen gespeicherte Suchen (saved_searches)
-- ab und benachrichtigt Pro-Nutzer bei Treffer. Matcht city/country/hasPets/
-- keyword/Datumsueberschneidung — petTypes wird bewusst nicht abgeglichen
-- (Struktur von listings.pet_details ist nicht eindeutig genug fuer einen
-- verlaesslichen Match).
CREATE OR REPLACE FUNCTION notify_search_alert()
RETURNS TRIGGER AS $$
DECLARE
  saved RECORD;
  is_match BOOLEAN;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW; -- nur beim (erneuten) Aktivwerden benachrichtigen, nicht bei jedem Update
  END IF;

  FOR saved IN
    SELECT ss.id AS search_id, ss.profile_id, ss.filters
    FROM saved_searches ss
    JOIN profiles p ON p.id = ss.profile_id
    WHERE p.membership_tier = 'standard'
      AND p.membership_expires_at > NOW()
      AND COALESCE((p.notification_preferences->'search_alert'->>'push')::boolean, true)
      AND ss.profile_id <> NEW.owner_id
  LOOP
    is_match := TRUE;

    IF NULLIF(saved.filters->>'city', '') IS NOT NULL THEN
      is_match := is_match AND (NEW.city ILIKE saved.filters->>'city');
    END IF;

    IF NULLIF(saved.filters->>'country', '') IS NOT NULL THEN
      is_match := is_match AND (NEW.country ILIKE saved.filters->>'country');
    END IF;

    IF saved.filters->>'hasPets' IS NOT NULL THEN
      is_match := is_match AND (NEW.has_pets = (saved.filters->>'hasPets')::boolean);
    END IF;

    IF NULLIF(saved.filters->>'keyword', '') IS NOT NULL THEN
      is_match := is_match AND (
        NEW.title ILIKE '%' || (saved.filters->>'keyword') || '%'
        OR NEW.description ILIKE '%' || (saved.filters->>'keyword') || '%'
      );
    END IF;

    IF saved.filters->>'dateFrom' IS NOT NULL AND NEW.available_to IS NOT NULL THEN
      is_match := is_match AND (NEW.available_to >= (saved.filters->>'dateFrom')::date);
    END IF;

    IF saved.filters->>'dateTo' IS NOT NULL AND NEW.available_from IS NOT NULL THEN
      is_match := is_match AND (NEW.available_from <= (saved.filters->>'dateTo')::date);
    END IF;

    IF is_match THEN
      INSERT INTO notifications (profile_id, type, payload)
      VALUES (saved.profile_id, 'search_alert', jsonb_build_object('listing_id', NEW.id, 'saved_search_id', saved.search_id));
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_listing_activated
  AFTER INSERT OR UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION notify_search_alert();
