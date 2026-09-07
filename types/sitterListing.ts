export type SitterListingStatus = 'draft' | 'active' | 'archived';
export type PetSitting = 'with_pet' | 'without_pet' | 'both';

export interface AvailabilityPeriod {
  from: string;
  to: string;
}

export interface LocationPreference {
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
}

export interface OwnPetDetails {
  type: string;
  count: number;
}

export interface SitterListing {
  id: string;
  sitter_id: string;
  title: string;
  description: string | null;
  availability_periods: AvailabilityPeriod[];
  locations: LocationPreference[];
  pet_sitting: PetSitting;
  companion_ids: string[];
  brings_own_pet: boolean;
  own_pet_details: OwnPetDetails[];
  max_alone_hours: number | null;
  cover_photo: string | null;
  photos: string[];
  status: SitterListingStatus;
  created_at: string;
}

export interface SitterListingWithProfile extends SitterListing {
  sitter: import('./user').Profile;
}

export interface SitterSearchFilters {
  city?: string;
  country?: string;
  dateFrom?: Date;
  dateTo?: Date;
  petSitting?: PetSitting | null;
  keyword?: string;
}
