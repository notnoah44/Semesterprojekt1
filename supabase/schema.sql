-- ============================================================
-- PawStay — Supabase Schema
-- Run this in the Supabase SQL editor (project > SQL editor)
-- ============================================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  avatar_url            TEXT,
  age                   INT,
  job                   TEXT,
  origin                TEXT,
  bio                   TEXT,
  animals_cared         TEXT[] DEFAULT '{}',
  languages             TEXT[] DEFAULT '{}',
  role_default          TEXT DEFAULT 'sitter' CHECK (role_default IN ('sitter','anbieter')),
  membership_tier       TEXT DEFAULT 'free',
  membership_expires_at TIMESTAMPTZ,
  referral_code         TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Travel Companions
CREATE TABLE IF NOT EXISTS travel_companions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  age        INT,
  avatar_url TEXT
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
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id),
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

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
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

-- Listings
CREATE POLICY "View active listings" ON listings FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "Manage own listings" ON listings FOR ALL USING (auth.uid() = owner_id);

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
