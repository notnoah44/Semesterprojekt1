-- The "Own favourites" RLS policy on favourites only lets a user see their own
-- rows, so neither listing owners nor other visitors can find out how many
-- people favourited a listing/sitter profile. Expose just the aggregate count
-- (never who favourited) via a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION get_favourite_count(p_listing_id UUID DEFAULT NULL, p_sitter_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM favourites
  WHERE (p_listing_id IS NOT NULL AND listing_id = p_listing_id)
     OR (p_sitter_id IS NOT NULL AND sitter_id = p_sitter_id);
$$;

REVOKE ALL ON FUNCTION get_favourite_count(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_favourite_count(UUID, UUID) TO authenticated;
