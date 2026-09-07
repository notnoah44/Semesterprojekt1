-- Die Buckets `avatars`, `listing-photos` und `sitter-listing-photos` wurden
-- manuell im Dashboard angelegt (siehe Kommentar in schema.sql), aber nie mit
-- RLS-Policies auf storage.objects versehen -> jeder Upload schlug mit
-- "new row violates row-level security policy" fehl. Pfad-Konvention in allen
-- drei Buckets: {user_id}/... als erstes Pfadsegment (siehe lib/api/profiles.ts,
-- lib/api/listings.ts, lib/api/sitterListings.ts).

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
