export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  listing_id: string;
  sitter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  message: string | null;
  created_at: string;
}
