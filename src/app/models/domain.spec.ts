import {
  asLang,
  BOOKING_STATUSES,
  CLOSED_BOOKING_STATUSES,
  COLLECTIONS,
  freesSlots,
  isClosed,
  isOpen,
  OPEN_BOOKING_STATUSES,
} from '../../../shared/domain';

describe('booking statuses', () => {
  it('every status is open or closed, never both', () => {
    for (const status of BOOKING_STATUSES) {
      expect(isOpen(status) !== isClosed(status), status).toBe(true);
    }
    expect([...OPEN_BOOKING_STATUSES, ...CLOSED_BOOKING_STATUSES].sort()).toEqual(
      [...BOOKING_STATUSES].sort(),
    );
  });

  it('a pending or confirmed booking is still going to happen', () => {
    expect(isOpen('pending')).toBe(true);
    expect(isOpen('confirmed')).toBe(true);
    expect(isOpen('completed')).toBe(false);
  });

  it('declined and cancelled bookings free their slots, the others keep them', () => {
    for (const status of ['declined', 'cancelled', 'cancelledByProfessional'] as const) {
      expect(freesSlots(status), status).toBe(true);
    }
    for (const status of ['pending', 'confirmed', 'completed'] as const) {
      expect(freesSlots(status), status).toBe(false);
    }
  });
});

describe('asLang', () => {
  it('knows English and Spanish, and falls back to Portuguese', () => {
    expect(asLang('en')).toBe('en');
    expect(asLang('es')).toBe('es');
    for (const other of ['pt', 'fr', '', null, undefined, 3]) expect(asLang(other)).toBe('pt');
  });
});

describe('COLLECTIONS', () => {
  it('names the collections the Firestore rules protect', () => {
    for (const name of Object.values(COLLECTIONS)) {
      expect(name).toMatch(/^[a-z]+$/);
    }
    expect(COLLECTIONS.busy).toBe('busy');
    expect(COLLECTIONS.private).toBe('private');
  });
});
