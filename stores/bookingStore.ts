import { create } from 'zustand';
import type { Booking } from '@/types/booking';

interface BookingStore {
  bookings: Booking[];
  activeBooking: Booking | null;
  setBookings: (bookings: Booking[]) => void;
  setActiveBooking: (booking: Booking | null) => void;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  bookings: [],
  activeBooking: null,
  setBookings: (bookings) => set({ bookings }),
  setActiveBooking: (activeBooking) => set({ activeBooking }),
  updateBookingStatus: (id, status) =>
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
    })),
}));
