BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'inactive'
  CHECK (membership_status IN ('inactive','active','cancelled','grace_period','billing_issue','refunded'));

CREATE TABLE public.billing_sync_state (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  revision bigint NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_sync_state FROM anon, authenticated;
CREATE SEQUENCE public.billing_revision;
REVOKE ALL ON SEQUENCE public.billing_revision FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.next_billing_revision() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT nextval('public.billing_revision'); $$;
REVOKE ALL ON FUNCTION public.next_billing_revision() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_billing_revision() TO service_role;

CREATE FUNCTION public.apply_membership_snapshot(p_user_id uuid, p_revision bigint, p_snapshot jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Lock per account; deletion and simultaneous syncs cannot create orphan state.
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.billing_sync_state WHERE user_id = p_user_id AND revision >= p_revision) THEN RETURN; END IF;
  UPDATE public.profiles SET
    membership_tier = p_snapshot->>'membership_tier',
    membership_plan = p_snapshot->>'membership_plan',
    membership_expires_at = (p_snapshot->>'membership_expires_at')::timestamptz,
    auto_renew = (p_snapshot->>'auto_renew')::boolean,
    membership_status = p_snapshot->>'membership_status'
  WHERE id = p_user_id;
  INSERT INTO public.billing_sync_state(user_id, revision) VALUES (p_user_id, p_revision)
    ON CONFLICT (user_id) DO UPDATE SET revision = EXCLUDED.revision, verified_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.apply_membership_snapshot(uuid,bigint,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_membership_snapshot(uuid,bigint,jsonb) TO service_role;

CREATE FUNCTION public.protect_membership() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.membership_tier IS DISTINCT FROM 'free' OR NEW.membership_plan IS NOT NULL
        OR NEW.membership_expires_at IS NOT NULL OR coalesce(NEW.auto_renew, false)
        OR NEW.membership_status IS DISTINCT FROM 'inactive' THEN
        RAISE EXCEPTION 'Membership is managed by the store';
      END IF;
    ELSIF ROW(NEW.membership_tier,NEW.membership_plan,NEW.membership_expires_at,NEW.auto_renew,NEW.membership_status)
      IS DISTINCT FROM ROW(OLD.membership_tier,OLD.membership_plan,OLD.membership_expires_at,OLD.auto_renew,OLD.membership_status) THEN
      RAISE EXCEPTION 'Membership is managed by the store';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_membership BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_membership();

-- Remove unverified demo grants when adopting real receipt verification.
UPDATE public.profiles SET membership_tier='free', membership_plan=NULL, membership_expires_at=NULL, auto_renew=false, scheduled_deletion_at=NULL;
ALTER TABLE public.profiles ALTER COLUMN auto_renew SET DEFAULT false;

-- Old scheduled deletions are superseded by explicit immediate deletion.
CREATE TABLE public.account_deletion_requests (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM anon, authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_is_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND NOT is_blocked)
    AND NOT EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE user_id = auth.uid());
$$;
-- Prevent new uploads during deletion or with a still-unexpired deleted user's JWT.
CREATE POLICY "Active account uploads only" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active());
CREATE POLICY "Active account file updates only" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.current_user_is_active()) WITH CHECK (public.current_user_is_active());

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='process-scheduled-deletions';
  END IF;
END $$;

-- Existing NO ACTION FKs previously prevented auth account deletion whenever
-- a user had bookings/messages. This test app deletes those associated records.
DO $$
DECLARE fk record;
BEGIN
  FOR fk IN SELECT c.conname, c.conrelid::regclass AS tbl, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE c.contype='f' AND n.nspname='public' AND c.confdeltype='a'
      AND c.confrelid IN ('public.profiles'::regclass,'public.listings'::regclass,'public.sitter_listings'::regclass,'public.bookings'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.tbl, fk.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON DELETE CASCADE', fk.tbl, fk.conname, fk.definition);
  END LOOP;
END $$;
COMMIT;
