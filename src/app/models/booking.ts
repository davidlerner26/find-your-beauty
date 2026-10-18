export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

// bookings/{id}
export type Booking = {
  id?: string;
  clientUid: string;
  clientName: string;
  professionalId: string;
  // null for demo professionals that don't have an account
  professionalUid: string | null;
  professionalName: string;
  services: { id: string; name: string; price: number; durationMinutes: number }[];
  startsAt: Date;
  durationMinutes: number;
  total: number;
  notes: string;
  // Ids of the documents in professionals/{id}/busy that hold this booking's time slots
  busyIds: string[];
  status: BookingStatus;
  // No payment integration yet: bookings are created with the payment pending
  paymentStatus: 'pending' | 'paid';
};
