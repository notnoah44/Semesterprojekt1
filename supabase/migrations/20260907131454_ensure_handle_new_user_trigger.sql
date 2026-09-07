-- Punkt 5.1 (umsetzungsplan.md): beim ersten Gerätetest wurde festgestellt, dass
-- Vor-/Nachname nach der Registrierung nicht gespeichert wurden. schema.sql enthält
-- den Trigger `on_auth_user_created`, aber es gab keine explizite Migration, die
-- ihn auf dem live-Projekt (an)legt — falls er dort nie angelegt wurde, lief
-- `handle_new_user()` nie und die `profiles`-Zeile wurde nie erstellt.
-- Idempotent: legt Funktion + Trigger in jedem Fall neu an, unabhängig vom Ist-Zustand.
-- `SECURITY DEFINER` only elevates privileges, it does not change `search_path` —
-- this trigger fires under the internal `supabase_auth_admin` role on `auth.users`
-- inserts, whose search_path does not include `public`, so `profiles` must be
-- schema-qualified (this was the actual cause of registration failing with
-- "Database error saving new user" / `42P01 relation "profiles" does not exist").
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
