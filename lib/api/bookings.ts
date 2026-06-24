import { supabase } from '@/lib/supabase';
import type { Booking } from '@/types/booking';

export async function getBooking(id: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listing:listings(*), sitter:profiles!sitter_id(*), owner:profiles!owner_id(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getBookingsForSitter(sitterId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listing:listings(*), owner:profiles!owner_id(*)')
    .eq('sitter_id', sitterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getBookingsForOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listing:listings(*), sitter:profiles!sitter_id(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function updateBookingStatus(id: string, status: Booking['status']) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}
