-- Pro membership plan/auto-renew/ID-check fields + Thread-Unlock flag on conversations
-- See docs/feature-konto-restructure-membership.md, Abschnitt 4/5.1

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_plan TEXT
  CHECK (membership_plan IN ('monthly','quarterly','yearly'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE;

-- Grandfather existing conversations as unlocked; new conversations should be
-- inserted with is_unlocked explicitly set based on the requester's Pro status.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT TRUE;
