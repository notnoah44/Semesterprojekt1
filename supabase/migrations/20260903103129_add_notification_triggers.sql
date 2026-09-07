-- T6: DB-Trigger fuer die vier Ereignistypen, die bisher nie eine
-- `notifications`-Zeile erzeugt haben (new_message, booking_request,
-- booking_update, favourite). Jeder Trigger respektiert
-- profiles.notification_preferences->type->push (Default true, falls Feld
-- fehlt) analog zum bestehenden on_profile_verified-Trigger.

-- Neue Chat-Nachricht: benachrichtigt den jeweils anderen Teilnehmer.
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  prefs JSONB;
BEGIN
  SELECT CASE WHEN c.participant1 = NEW.sender_id THEN c.participant2 ELSE c.participant1 END
  INTO recipient_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT notification_preferences INTO prefs FROM profiles WHERE id = recipient_id;
  IF COALESCE((prefs->'new_message'->>'push')::boolean, true) THEN
    INSERT INTO notifications (profile_id, type, payload)
    VALUES (recipient_id, 'new_message', jsonb_build_object('conversation_id', NEW.conversation_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Neue Buchungsanfrage: benachrichtigt die Gegenseite (wer nicht der
-- anfragende Nutzer ist, ermittelt ueber auth.uid()).
CREATE OR REPLACE FUNCTION notify_booking_request()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  prefs JSONB;
BEGIN
  recipient_id := CASE WHEN NEW.sitter_id = auth.uid() THEN NEW.owner_id ELSE NEW.sitter_id END;
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT notification_preferences INTO prefs FROM profiles WHERE id = recipient_id;
  IF COALESCE((prefs->'booking_request'->>'push')::boolean, true) THEN
    INSERT INTO notifications (profile_id, type, payload)
    VALUES (recipient_id, 'booking_request', jsonb_build_object('booking_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_booking_request();

-- Buchungsstatus geaendert (angenommen/abgelehnt/storniert/abgeschlossen):
-- benachrichtigt die Gegenseite dessen, der die Aenderung vorgenommen hat.
CREATE OR REPLACE FUNCTION notify_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  prefs JSONB;
BEGIN
  recipient_id := CASE WHEN NEW.sitter_id = auth.uid() THEN NEW.owner_id ELSE NEW.sitter_id END;
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT notification_preferences INTO prefs FROM profiles WHERE id = recipient_id;
  IF COALESCE((prefs->'booking_update'->>'push')::boolean, true) THEN
    INSERT INTO notifications (profile_id, type, payload)
    VALUES (recipient_id, 'booking_update', jsonb_build_object('booking_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_booking_status_changed
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION notify_booking_update();

-- Profil/Inserat als Favorit gespeichert: benachrichtigt Listing-Owner bzw.
-- favorisierten Sitter (keine Selbst-Benachrichtigung).
CREATE OR REPLACE FUNCTION notify_favourite()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  prefs JSONB;
BEGIN
  IF NEW.listing_id IS NOT NULL THEN
    SELECT owner_id INTO recipient_id FROM listings WHERE id = NEW.listing_id;
  ELSIF NEW.sitter_id IS NOT NULL THEN
    recipient_id := NEW.sitter_id;
  END IF;

  IF recipient_id IS NULL OR recipient_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  SELECT notification_preferences INTO prefs FROM profiles WHERE id = recipient_id;
  IF COALESCE((prefs->'favourite'->>'push')::boolean, true) THEN
    INSERT INTO notifications (profile_id, type, payload)
    VALUES (recipient_id, 'favourite', jsonb_build_object('profile_id', NEW.profile_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_favourite_created
  AFTER INSERT ON favourites
  FOR EACH ROW EXECUTE FUNCTION notify_favourite();
