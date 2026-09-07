-- ============================================================
-- PawStay — Supabase Schema
-- Run this in the Supabase SQL editor (project > SQL editor)
-- ============================================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name            TEXT,
  last_name             TEXT,
  full_name             TEXT,
  avatar_url            TEXT,
  birth_year            INT,
  job                   TEXT,
  bio                   TEXT,
  animals_cared         TEXT[] DEFAULT '{}',
  languages             TEXT[] DEFAULT '{}',
  role_default          TEXT DEFAULT 'sitter' CHECK (role_default IN ('sitter','anbieter')),
  membership_tier       TEXT DEFAULT 'free',
  membership_expires_at TIMESTAMPTZ,
  membership_plan       TEXT CHECK (membership_plan IN ('monthly','quarterly','yearly')),
  auto_renew            BOOLEAN DEFAULT TRUE,
  scheduled_deletion_at TIMESTAMPTZ,
  id_verified           BOOLEAN DEFAULT FALSE,
  id_verification_submitted_at TIMESTAMPTZ,
  email_verified        BOOLEAN DEFAULT FALSE,
  city                  TEXT,
  country               TEXT,
  photos                TEXT[] DEFAULT '{}',
  has_own_pets          BOOLEAN DEFAULT FALSE,
  own_pets_description  TEXT,
  video_pitch_url       TEXT,
  notification_preferences JSONB DEFAULT '{
    "new_message": {"push": true, "email": true},
    "booking_request": {"push": true, "email": true},
    "booking_update": {"push": true, "email": true},
    "favourite": {"push": true, "email": false},
    "membership": {"push": true, "email": true},
    "search_alert": {"push": true, "email": false}
  }'::jsonb,
  referral_code         TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    TRIM(CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Vor-/Nachname sind nach der Registrierung gesperrt (siehe register.tsx-Hinweistext) —
-- serverseitig zusätzlich zur UI-Sperre erzwungen, sobald einmal gesetzt.
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

CREATE OR REPLACE TRIGGER lock_name_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_name_change();

-- Notify user when ID-Check is manually approved in the dashboard
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

-- Travel Companions
CREATE TABLE IF NOT EXISTS travel_companions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  age        INT,
  avatar_url TEXT,
  relation   TEXT CHECK (relation IN ('partner','friend','family','child'))
);

-- Sitter-Inserate (Verfügbarkeit + Einsatzort + Präferenzen eines Sitters)
CREATE TABLE IF NOT EXISTS sitter_listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  availability_periods  JSONB DEFAULT '[]',
  locations             JSONB DEFAULT '[]',
  pet_sitting           TEXT DEFAULT 'both' CHECK (pet_sitting IN ('with_pet','without_pet','both')),
  companion_ids         UUID[] DEFAULT '{}',
  brings_own_pet        BOOLEAN DEFAULT FALSE,
  own_pet_details       JSONB DEFAULT '[]',
  max_alone_hours       INT,
  cover_photo           TEXT,
  photos                TEXT[] DEFAULT '{}',
  status                TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Sitter-Profil ("Kompetenz-Akte", Pflicht vor Bewerbung auf ein Inserat)
CREATE TABLE IF NOT EXISTS sitter_profiles (
  profile_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  experience_level       TEXT CHECK (experience_level IN ('beginner','advanced','expert')),
  experience_references  TEXT,
  special_skills         TEXT[] DEFAULT '{}',
  special_skills_notes   TEXT,
  mobility               TEXT CHECK (mobility IN ('own_car','public_transport')),
  work_setup             TEXT CHECK (work_setup IN ('remote','away_daytime','flexible')),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Host-Profil ("Zuhause-Akte", Pflicht vor Erstellen eines Haus-Inserats)
CREATE TABLE IF NOT EXISTS host_profiles (
  profile_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  housing_type           TEXT CHECK (housing_type IN ('house','apartment','farmhouse')),
  environment_tags       TEXT[] DEFAULT '{}',
  house_rules            TEXT,
  garden_plants_notes    TEXT,
  sitter_accommodation   TEXT CHECK (sitter_accommodation IN ('guest_room','own_bathroom','owners_bedroom')),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Listings
CREATE TABLE IF NOT EXISTS listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT,
  lat              FLOAT,
  lng              FLOAT,
  has_pets         BOOLEAN DEFAULT FALSE,
  pet_details      JSONB,
  responsibilities TEXT[] DEFAULT '{}',
  welcome_guide    TEXT,
  photos           TEXT[] DEFAULT '{}',
  available_from   DATE,
  available_to     DATE,
  status           TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID REFERENCES listings(id),
  sitter_listing_id UUID REFERENCES sitter_listings(id),
  sitter_id   UUID REFERENCES profiles(id),
  owner_id    UUID REFERENCES profiles(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected','completed','cancelled')),
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES bookings(id),
  reviewer_id UUID REFERENCES profiles(id),
  reviewee_id UUID REFERENCES profiles(id),
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1 UUID REFERENCES profiles(id),
  participant2 UUID REFERENCES profiles(id),
  listing_id   UUID REFERENCES listings(id),
  sitter_listing_id UUID REFERENCES sitter_listings(id),
  is_unlocked  BOOLEAN DEFAULT TRUE, -- Thread-Unlock: gesetzt beim Erstellen je nach Abo-Status des Anfragenden; TRUE als Default grandfathered bestehende Chats
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES profiles(id),
  content         TEXT NOT NULL,
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Favourites
CREATE TABLE IF NOT EXISTS favourites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id),
  sitter_id  UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT,
  filters    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  payload    JSONB,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Feedback
CREATE TABLE IF NOT EXISTS app_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  rating     INT CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notify on new chat message, booking request/update, favourite (all respect
-- profiles.notification_preferences->type->push, default true)
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

-- Such-Alarme (Pro-Feature): neue/aktiv geschaltete Inserate gegen
-- saved_searches abgleichen, Pro-Nutzer bei Treffer benachrichtigen.
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
    RETURN NEW;
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

-- Admin-Hilfsmittel: offene ID-Check-Einreichungen auf einen Blick im
-- Supabase Table Editor (unter "Views"). Kein Client-Code liest diese View.
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

-- Reines Admin-Hilfsmittel fuers Dashboard, nicht ueber die REST-API abfragbar
REVOKE ALL ON pending_verifications FROM anon, authenticated;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_listings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feedback      ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Travel companions
CREATE POLICY "Own companions" ON travel_companions FOR ALL USING (auth.uid() = profile_id);

-- Sitter / host profiles
CREATE POLICY "Public sitter profiles are viewable" ON sitter_profiles FOR SELECT USING (true);
CREATE POLICY "Own sitter profile" ON sitter_profiles FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public host profiles are viewable" ON host_profiles FOR SELECT USING (true);
CREATE POLICY "Own host profile" ON host_profiles FOR ALL USING (auth.uid() = profile_id);

-- Listings
CREATE POLICY "View active listings" ON listings FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "Manage own listings" ON listings FOR ALL USING (auth.uid() = owner_id);

-- Sitter listings
CREATE POLICY "View active sitter listings" ON sitter_listings
  FOR SELECT USING (status = 'active' OR auth.uid() = sitter_id);
CREATE POLICY "Manage own sitter listings" ON sitter_listings
  FOR ALL USING (auth.uid() = sitter_id);

-- Bookings
CREATE POLICY "Own bookings" ON bookings FOR ALL
  USING (auth.uid() = sitter_id OR auth.uid() = owner_id);

-- Reviews
CREATE POLICY "View reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Conversations
CREATE POLICY "Own conversations" ON conversations FOR ALL
  USING (auth.uid() = participant1 OR auth.uid() = participant2);

-- Messages
CREATE POLICY "Conversation participants" ON messages FOR ALL
  USING (
    auth.uid() = sender_id OR
    auth.uid() IN (
      SELECT participant1 FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2 FROM conversations WHERE id = conversation_id
    )
  );

-- Favourites / Saved Searches / Notifications
CREATE POLICY "Own favourites"      ON favourites      FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Own saved searches"  ON saved_searches   FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Own notifications"   ON notifications    FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Own feedback"        ON app_feedback     FOR ALL USING (auth.uid() = profile_id);

-- ============================================================
-- Enable Realtime for chat
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- Storage
-- ============================================================
-- Buckets `avatars` und `listing-photos` sind public und wurden manuell im
-- Supabase-Dashboard angelegt (nicht Teil dieses Skripts).
--
-- `id-verification` ist PRIVATE (ID-Check: Ausweisfoto + Selfie, manuelle
-- Pruefung, danach manuell geloescht). Pfad-Konvention: {user_id}/id-photo.*,
-- {user_id}/selfie.*.
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-verification', 'id-verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Own verification photos - upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own verification photos - view" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own verification photos - delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'id-verification' AND (storage.foldername(name))[1] = auth.uid()::text);

-- `avatars`, `listing-photos`, `sitter-listing-photos`: public read, Schreibzugriff
-- nur auf den eigenen {user_id}/...-Ordner (siehe 20260907200000_add_storage_object_policies.sql).
CREATE POLICY "Public avatars are viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Own avatars" ON storage.objects
  FOR ALL USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public listing photos are viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-photos');
CREATE POLICY "Own listing photos" ON storage.objects
  FOR ALL USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public sitter listing photos are viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'sitter-listing-photos');
CREATE POLICY "Own sitter listing photos" ON storage.objects
  FOR ALL USING (bucket_id = 'sitter-listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'sitter-listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
