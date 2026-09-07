import { toDateString } from './formatDate';

export type ListingDisplayStatus = 'active' | 'inactive' | 'past';

/** Host listings: derives Aktiv/Inaktiv/Vergangen from raw status + available_to. */
export function getListingDisplayStatus(
  status: 'draft' | 'active' | 'archived',
  availableTo: string | null
): ListingDisplayStatus {
  if (status !== 'active') return 'inactive';
  if (availableTo && availableTo < toDateString(new Date())) return 'past';
  return 'active';
}

/** Sitter listings: "past" means every availability period has already ended. */
export function getSitterListingDisplayStatus(
  status: 'draft' | 'active' | 'archived',
  periods: { to: string }[]
): ListingDisplayStatus {
  if (status !== 'active') return 'inactive';
  const today = toDateString(new Date());
  if (periods.length > 0 && periods.every((p) => p.to < today)) return 'past';
  return 'active';
}
