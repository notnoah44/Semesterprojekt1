-- BaseProfile additions + SitterProfile/HostProfile tables
-- See docs/feature-konto-restructure-membership.md, Abschnitt 9

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_own_pets BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS own_pets_description TEXT;

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

CREATE TABLE IF NOT EXISTS host_profiles (
  profile_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  housing_type           TEXT CHECK (housing_type IN ('house','apartment','farmhouse')),
  environment_tags       TEXT[] DEFAULT '{}',
  house_rules            TEXT,
  garden_plants_notes    TEXT,
  sitter_accommodation   TEXT CHECK (sitter_accommodation IN ('guest_room','own_bathroom','owners_bedroom')),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sitter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public sitter profiles are viewable" ON sitter_profiles FOR SELECT USING (true);
CREATE POLICY "Own sitter profile" ON sitter_profiles FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Public host profiles are viewable" ON host_profiles FOR SELECT USING (true);
CREATE POLICY "Own host profile" ON host_profiles FOR ALL USING (auth.uid() = profile_id);
