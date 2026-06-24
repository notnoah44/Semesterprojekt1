export type ListingStatus = 'draft' | 'active' | 'archived';

export interface PetDetails {
  type: string;
  name: string;
  age?: number;
  special_needs?: string;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  has_pets: boolean;
  pet_details: PetDetails[] | null;
  responsibilities: string[];
  welcome_guide: string | null;
  photos: string[];
  available_from: string | null;
  available_to: string | null;
  status: ListingStatus;
  created_at: string;
}

export interface SearchFilters {
  city?: string;
  country?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasPets?: boolean | null;
  petTypes?: string[];
  keyword?: string;
}
