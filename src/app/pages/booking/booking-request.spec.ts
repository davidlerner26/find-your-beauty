import { Service } from '../../models/professional';
import { bookingErrorMessage, buildBookingRequest, totalAt } from './booking-request';

const service = (overrides: Partial<Service> = {}): Service => ({
  id: 's1',
  name: 'Maquiagem social',
  category: 'Maquiagem',
  price: 100,
  durationMinutes: 60,
  description: '',
  ...overrides,
});

// 2099-05-08 is a Friday (day 5)
const FRIDAY = new Date(2099, 4, 8);
const artist = { id: 'pro1', name: 'Ana', ownerUid: 'proUid' };

const choice = (overrides = {}) => ({
  artist,
  services: [service()],
  day: FRIDAY,
  time: '10:00',
  notes: '  Pele sensível  ',
  place: 'studio' as const,
  clientAddress: 'Rua Teste, 10',
  slotMinutes: 60,
  ...overrides,
});

describe('totalAt', () => {
  it('adds the prices of the start time, without float noise', () => {
    const cheap = [service({ price: 0.1 }), service({ id: 's2', price: 0.2 })];
    expect(totalAt(cheap, FRIDAY, '10:00')).toBe(0.3);
  });

  it('uses the price rule that matches the day and the start time', () => {
    const weekend = service({
      priceRules: [{ days: [5], start: '18:00', end: '22:00', price: 150 }],
    });
    expect(totalAt([weekend], FRIDAY, '10:00')).toBe(100);
    expect(totalAt([weekend], FRIDAY, '19:00')).toBe(150);
  });
});

describe('buildBookingRequest', () => {
  it('describes the professional, the services and the start', () => {
    const request = buildBookingRequest(choice());

    expect(request).toMatchObject({
      professionalId: 'pro1',
      professionalUid: 'proUid',
      professionalName: 'Ana',
      services: [{ id: 's1', name: 'Maquiagem social', price: 100, durationMinutes: 60 }],
      durationMinutes: 60,
      total: 100,
      place: 'studio',
    });
    expect(request.startsAt).toEqual(new Date(2099, 4, 8, 10, 0));
  });

  it('trims the notes', () => {
    expect(buildBookingRequest(choice()).notes).toBe('Pele sensível');
  });

  // The Firestore rules accept only these ids: yyyy-mm-dd_HH:mm, one per slot of the service
  it('lists one busy slot per slot of the whole service', () => {
    const two = [service({ durationMinutes: 90 }), service({ id: 's2', durationMinutes: 30 })];
    const request = buildBookingRequest(choice({ services: two }));

    expect(request.durationMinutes).toBe(120);
    expect(request.busyIds).toEqual(['2099-05-08_10:00', '2099-05-08_11:00']);
  });

  it('the payment starts pending: the server marks it when there is a real one', () => {
    expect(buildBookingRequest(choice()).paymentStatus).toBe('pending');
  });

  it('sends the address of the client only for a service at home', () => {
    expect(buildBookingRequest(choice({ place: 'home' })).clientAddress).toBe('Rua Teste, 10');
    expect('clientAddress' in buildBookingRequest(choice({ place: 'studio' }))).toBe(false);
  });

  it('a demo professional without an account has no uid', () => {
    const demo = buildBookingRequest(choice({ artist: { id: 'demo1', name: 'Demo' } }));
    expect(demo.professionalUid).toBeNull();
  });
});

describe('bookingErrorMessage', () => {
  it('says the time was taken when the write is denied, and a general message otherwise', () => {
    const taken = bookingErrorMessage({ code: 'permission-denied' });
    expect(taken).toContain('ocupado');
    expect(bookingErrorMessage(new Error('offline'))).not.toBe(taken);
    expect(bookingErrorMessage(null)).not.toBe(taken);
  });
});
