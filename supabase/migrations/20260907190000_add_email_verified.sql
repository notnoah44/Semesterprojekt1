-- "Confirm email" is disabled in Supabase Auth so signUp() returns a session
-- immediately (soft-gate onboarding flow) — but that also means GoTrue
-- auto-confirms auth.users.email_confirmed_at right at signup, so it can no
-- longer be used to tell whether the user actually clicked a verification
-- link. This column tracks that ourselves, set via a magic-link email sent
-- after registration and confirmed in app/auth/callback.tsx.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
