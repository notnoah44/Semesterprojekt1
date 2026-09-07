-- T9: Video-Pitch im eigenen Profil (Rechtematrix "videoPitch", Pro-Feature).
-- Datei liegt im bestehenden, oeffentlichen "avatars"-Bucket unter
-- {user_id}/video-pitch.*, analog zur Bildergalerie aus Schritt 6c.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_pitch_url TEXT;
