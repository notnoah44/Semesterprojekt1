-- Granulare Benachrichtigungs-Einstellungen (Schritt 7): pro Ereignistyp
-- getrennt Push/Mail an- oder abschaltbar. Siehe konto/subscription/notifications.tsx.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  DEFAULT '{
    "new_message": {"push": true, "email": true},
    "booking_request": {"push": true, "email": true},
    "booking_update": {"push": true, "email": true},
    "favourite": {"push": true, "email": false},
    "membership": {"push": true, "email": true}
  }'::jsonb;
