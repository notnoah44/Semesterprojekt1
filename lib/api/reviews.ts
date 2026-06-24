import { supabase } from '@/lib/supabase';
import type { Review } from '@/types/review';

export interface ReviewWithReviewer extends Review {
  reviewer: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getReviewsForUser(revieweeId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(id, full_name, avatar_url)')
    .eq('reviewee_id', revieweeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ReviewWithReviewer[];
}

export interface ReviewStats {
  average: number;
  count: number;
}

export async function getReviewStats(revieweeId: string): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', revieweeId);
  if (error) throw error;
  const ratings = (data ?? []).map((r) => r.rating as number);
  const count = ratings.length;
  const average = count === 0 ? 0 : ratings.reduce((a, b) => a + b, 0) / count;
  return { average, count };
}

export async function getReviewForBooking(bookingId: string, reviewerId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error) throw error;
  return data as Review | null;
}

export async function createReview(review: Omit<Review, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}
