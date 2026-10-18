// users/{uid}/bookings/{id}
export type Booking = {
  professionalId: string;
  professionalName: string;
  services: { id: string; name: string; price: number; durationMinutes: number }[];
  startsAt: Date;
  durationMinutes: number;
  total: number;
  notes: string;
  status: 'confirmed' | 'cancelled';
  // No payment integration yet: bookings are created with the payment pending
  paymentStatus: 'pending' | 'paid';
};
