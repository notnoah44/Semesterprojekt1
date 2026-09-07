-- Apply after the existing migrations. No rows or address data are deleted.
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.current_user_is_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND NOT is_blocked);
$$;

-- A user must not be able to undo an administrative block through Own profile.
CREATE OR REPLACE FUNCTION public.protect_profile_block() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') THEN
    IF (TG_OP = 'INSERT' AND NEW.is_blocked) OR
       (TG_OP = 'UPDATE' AND NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) THEN
      RAISE EXCEPTION 'Only administrators can change account blocks';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER protect_profile_block BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_block();

-- Restrictive policies complement existing owner/participant policies.
DO $$
DECLARE tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['profiles','listings','sitter_listings','messages','conversations','bookings','reviews','sitter_profiles','host_profiles'] LOOP
    EXECUTE format('CREATE POLICY "Blocked users cannot insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.current_user_is_active())', tab);
    EXECUTE format('CREATE POLICY "Blocked users cannot update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.current_user_is_active()) WITH CHECK (public.current_user_is_active())', tab);
    EXECUTE format('CREATE POLICY "Blocked users cannot delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.current_user_is_active())', tab);
  END LOOP;
END $$;
-- New profiles are created by the auth trigger (service role / database owner).

CREATE POLICY "Completed booking reviews only" ON public.reviews AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.status = 'completed'
  AND ((b.sitter_id = reviewer_id AND b.owner_id = reviewee_id)
    OR (b.owner_id = reviewer_id AND b.sitter_id = reviewee_id))
));

CREATE TABLE public.conversation_hidden (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_hidden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hide instead of deleting threads" ON public.conversations AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY "Own hidden conversations" ON public.conversation_hidden FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.current_user_is_active() AND EXISTS (
  SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.participant1, c.participant2)
));

CREATE OR REPLACE FUNCTION public.reopen_conversation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.conversation_hidden WHERE conversation_id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reopen_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.reopen_conversation();

-- Prevent forging a sender or modifying the other person's message body.
DROP POLICY IF EXISTS "Conversation participants" ON public.messages;
CREATE POLICY "Read conversation messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.participant1,c.participant2))
);
CREATE POLICY "Send own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.participant1,c.participant2))
);
CREATE POLICY "Read incoming messages" ON public.messages FOR UPDATE TO authenticated USING (
  sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.participant1,c.participant2))
) WITH CHECK (read = true);
CREATE OR REPLACE FUNCTION public.protect_message_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND
    (to_jsonb(NEW) - 'read') IS DISTINCT FROM (to_jsonb(OLD) - 'read') THEN
    RAISE EXCEPTION 'Only the read state can be updated';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_message_update BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.protect_message_update();
CREATE INDEX IF NOT EXISTS messages_conversation_latest ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread ON public.messages(conversation_id) WHERE read = false;

CREATE OR REPLACE FUNCTION public.validate_listing_pets() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.has_pets AND NEW.status = 'active' THEN
    IF NEW.pet_details IS NULL OR jsonb_typeof(NEW.pet_details) <> 'array' THEN
      RAISE EXCEPTION 'Pet details are required';
    END IF;
    IF jsonb_array_length(NEW.pet_details) = 0 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.pet_details) pet
      WHERE length(trim(coalesce(pet->>'type',''))) = 0
        OR length(trim(coalesce(pet->>'name',''))) = 0
        OR length(trim(coalesce(pet->>'special_needs',''))) = 0
    ) THEN RAISE EXCEPTION 'Each animal needs species, name and care instructions'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_listing_pets BEFORE INSERT OR UPDATE OF has_pets,pet_details ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.validate_listing_pets();

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('harassment','fraud','inappropriate','other')),
  description text CHECK (length(description) <= 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id)
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submit own report" ON public.reports FOR INSERT TO authenticated WITH CHECK (
  reporter_id = auth.uid() AND status = 'open' AND public.current_user_is_active() AND
  (conversation_id IS NULL OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND auth.uid() IN (c.participant1,c.participant2) AND reported_user_id IN (c.participant1,c.participant2)))
);
CREATE POLICY "Read own reports" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE TABLE public.push_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own push tokens" ON public.push_tokens FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.current_user_is_active());

-- Atomic device re-assignment on shared devices, without exposing others' tokens.
CREATE OR REPLACE FUNCTION public.register_push_token(push_token text, installation_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.current_user_is_active() OR push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' OR length(installation_id) > 200 THEN
    RAISE EXCEPTION 'Invalid push registration';
  END IF;
  DELETE FROM public.push_tokens WHERE token = push_token OR (user_id = auth.uid() AND device_id = installation_id);
  INSERT INTO public.push_tokens(token, user_id, device_id) VALUES(push_token, auth.uid(), installation_id);
END;
$$;
REVOKE ALL ON FUNCTION public.register_push_token(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_token(text,text) TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
COMMIT;
