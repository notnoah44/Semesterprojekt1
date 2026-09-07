export type Role = 'sitter' | 'anbieter';
export type MembershipTier = 'free' | 'standard';
export type MembershipPlan = 'monthly' | 'quarterly' | 'yearly';

export interface Profile {
  is_blocked?: boolean;
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  job: string | null;
  bio: string | null;
  animals_cared: string[];
  languages: string[];
  role_default: Role;
  membership_tier: MembershipTier;
  membership_expires_at: string | null;
  membership_plan: MembershipPlan | null;
  auto_renew: boolean;
  scheduled_deletion_at: string | null;
  id_verified: boolean;
  id_verification_submitted_at: string | null;
  email_verified: boolean;
  city: string | null;
  country: string | null;
  photos: string[];
  has_own_pets: boolean;
  own_pets_description: string | null;
  video_pitch_url: string | null;
  notification_preferences: NotificationPreferences;
  referral_code: string | null;
  created_at: string;
}

export type NotificationEventType = 'new_message' | 'booking_request' | 'booking_update' | 'favourite' | 'membership' | 'search_alert';
export type NotificationChannelPrefs = { push: boolean; email: boolean };
export type NotificationPreferences = Record<NotificationEventType, NotificationChannelPrefs>;

export type CompanionRelation = 'partner' | 'friend' | 'family' | 'child';

export interface TravelCompanion {
  id: string;
  profile_id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  relation: CompanionRelation | null;
}

export type ExperienceLevel = 'beginner' | 'advanced' | 'expert';
export type Mobility = 'own_car' | 'public_transport';
export type WorkSetup = 'remote' | 'away_daytime' | 'flexible';

/** "Kompetenz-Akte" — Pflicht, bevor ein Sitter sich auf ein Inserat bewerben darf. */
export interface SitterProfile {
  profile_id: string;
  experience_level: ExperienceLevel | null;
  experience_references: string | null;
  special_skills: string[];
  special_skills_notes: string | null;
  mobility: Mobility | null;
  work_setup: WorkSetup | null;
  updated_at: string;
}

export type HousingType = 'house' | 'apartment' | 'farmhouse';
export type SitterAccommodation = 'guest_room' | 'own_bathroom' | 'owners_bedroom';

/** "Zuhause-Akte" — Pflicht, bevor ein Host ein Haus-Inserat erstellen darf. */
export interface HostProfile {
  profile_id: string;
  housing_type: HousingType | null;
  environment_tags: string[];
  house_rules: string | null;
  garden_plants_notes: string | null;
  sitter_accommodation: SitterAccommodation | null;
  updated_at: string;
}
