-- Benachrichtigt den Nutzer automatisch (Eintrag in `notifications`, per
-- Realtime schon live im NotificationBell), sobald `profiles.id_verified`
-- manuell im Dashboard von false/NULL auf true gesetzt wird.

CREATE OR REPLACE FUNCTION notify_verification_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_verified = TRUE THEN
    INSERT INTO notifications (profile_id, type, payload)
    VALUES (NEW.id, 'verification_approved', '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_verified
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.id_verified IS DISTINCT FROM OLD.id_verified)
  EXECUTE FUNCTION notify_verification_approved();
