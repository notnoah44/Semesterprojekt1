export type Role = 'sitter' | 'anbieter';
export type MembershipTier = 'free' | 'standard';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  job: string | null;
  origin: string | null;
  bio: string | null;
  animals_cared: string[];
  languages: string[];
  role_default: Role;
  membership_tier: MembershipTier;
  membership_expires_at: string | null;
  referral_code: string | null;
  created_at: string;
}

export interface TravelCompanion {
  id: string;
  profile_id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
}
