-- The favourite notification payload only stored who favourited (profile_id),
-- not what was favourited, so tapping the notification had nowhere to go.
-- Add listing_id/sitter_id so the client can deep-link to the favourited item.
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
    VALUES (
      recipient_id,
      'favourite',
      jsonb_build_object('profile_id', NEW.profile_id, 'listing_id', NEW.listing_id, 'sitter_id', NEW.sitter_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
