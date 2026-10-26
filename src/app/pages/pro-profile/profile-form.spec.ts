import { Availability, DEFAULT_AVAILABILITY } from '../../models/professional';
import {
  aboutToParagraphs,
  addBlockedRange,
  invalidDayKeys,
  missingFields,
  paragraphsToAbout,
  ProfileDraft,
  rangeLabel,
  toAvailabilityDraft,
} from './profile-form';
import { toServiceDraft } from './service-draft';

describe('toAvailabilityDraft', () => {
  it('starts from the default hours when there are none saved', () => {
    expect(toAvailabilityDraft(undefined)).toEqual(DEFAULT_AVAILABILITY);
  });

  it('is a copy: editing it never changes the saved hours or the default', () => {
    const draft = toAvailabilityDraft(undefined);
    draft.weekly['1'].enabled = false;
    draft.blockedRanges.push({ start: 'x', end: 'x' });
    expect(DEFAULT_AVAILABILITY.weekly['1'].enabled).toBe(true);
    expect(DEFAULT_AVAILABILITY.blockedRanges).toEqual([]);
  });

  it('turns the single blocked days of the old format into one-day periods', () => {
    const saved: Availability = {
      ...DEFAULT_AVAILABILITY,
      blockedRanges: [{ start: '2099-05-01', end: '2099-05-03' }],
      blockedDates: ['2099-06-10'],
    };
    const draft = toAvailabilityDraft(saved);
    expect(draft.blockedRanges).toEqual([
      { start: '2099-05-01', end: '2099-05-03' },
      { start: '2099-06-10', end: '2099-06-10' },
    ]);
    expect('blockedDates' in draft).toBe(false);
  });
});

describe('invalidDayKeys', () => {
  const hours = (day: { enabled: boolean; start: string; end: string }): Availability => ({
    ...DEFAULT_AVAILABILITY,
    weekly: { ...DEFAULT_AVAILABILITY.weekly, '1': day },
  });

  it('finds open days that close at or before opening', () => {
    expect(
      invalidDayKeys(hours({ enabled: true, start: '10:00', end: '09:00' }), ['1', '2']),
    ).toEqual(['1']);
    expect(invalidDayKeys(hours({ enabled: true, start: '10:00', end: '10:00' }), ['1'])).toEqual([
      '1',
    ]);
  });

  it('ignores valid days and days that are off', () => {
    expect(invalidDayKeys(hours({ enabled: true, start: '08:00', end: '18:00' }), ['1'])).toEqual(
      [],
    );
    expect(invalidDayKeys(hours({ enabled: false, start: '10:00', end: '09:00' }), ['1'])).toEqual(
      [],
    );
  });
});

describe('addBlockedRange', () => {
  const existing = [{ start: '2099-05-10', end: '2099-05-12' }];

  it('adds a period in date order', () => {
    expect(addBlockedRange(existing, { start: '2099-05-01', end: '2099-05-02' })).toEqual([
      { start: '2099-05-01', end: '2099-05-02' },
      { start: '2099-05-10', end: '2099-05-12' },
    ]);
  });

  it('a single day is a period of one day', () => {
    expect(addBlockedRange([], { start: '2099-05-01', end: null })).toEqual([
      { start: '2099-05-01', end: '2099-05-01' },
    ]);
  });

  it('does not repeat a period, and does nothing without a start', () => {
    expect(addBlockedRange(existing, { start: '2099-05-10', end: '2099-05-12' })).toBe(existing);
    expect(addBlockedRange(existing, { start: null, end: null })).toBe(existing);
  });

  it('does not change the list it receives', () => {
    addBlockedRange(existing, { start: '2099-05-01', end: null });
    expect(existing).toHaveLength(1);
  });
});

describe('rangeLabel', () => {
  it('shows a day or a period (Portuguese build)', () => {
    expect(rangeLabel('2099-03-10', null)).toBe('10/03/2099');
    expect(rangeLabel('2099-03-10', '2099-03-10')).toBe('10/03/2099');
    expect(rangeLabel('2099-03-10', '2099-03-15')).toBe('10/03/2099 a 15/03/2099');
  });
});

describe('about paragraphs', () => {
  it('splits on blank lines and drops empty paragraphs', () => {
    expect(aboutToParagraphs('Um.\n\n  Dois.  \n\n\n\n   \n\nTrês.\n')).toEqual([
      'Um.',
      'Dois.',
      'Três.',
    ]);
    expect(aboutToParagraphs('   ')).toEqual([]);
  });

  it('keeps single line breaks inside a paragraph', () => {
    expect(aboutToParagraphs('Linha 1\nLinha 2')).toEqual(['Linha 1\nLinha 2']);
  });

  it('round trips', () => {
    expect(aboutToParagraphs(paragraphsToAbout(['Um.', 'Dois.']))).toEqual(['Um.', 'Dois.']);
  });
});

describe('missingFields', () => {
  const service = toServiceDraft({
    id: 's1',
    name: 'Escova',
    category: 'Cabelo',
    price: 80,
    durationMinutes: 60,
    description: '',
  });
  const ready: ProfileDraft = {
    name: 'Ana Souza',
    cpf: '529.982.247-25',
    image: 'ana.jpg',
    hasServiceMode: true,
    needsAddress: true,
    address: 'Rua das Flores, 100 - Botafogo',
    addressConfirmed: true,
    services: [service],
  };

  it('is empty for a complete profile', () => {
    expect(missingFields(ready)).toEqual([]);
  });

  it('lists everything for an empty one', () => {
    expect(
      missingFields({
        name: '',
        cpf: '',
        image: '',
        hasServiceMode: false,
        needsAddress: true,
        address: '',
        addressConfirmed: false,
        services: [],
      }),
    ).toEqual(['nome', 'CPF', 'foto', 'onde você atende', 'pelo menos 1 serviço completo']);
  });

  it('wants a name of at least 3 letters, a valid CPF and a photo', () => {
    expect(missingFields({ ...ready, name: ' Al ' })).toEqual(['nome']);
    expect(missingFields({ ...ready, cpf: '111.111.111-11' })).toEqual(['CPF']);
    expect(missingFields({ ...ready, image: '  ' })).toEqual(['foto']);
  });

  it('wants an address chosen from the suggestions, unless the professional goes to the client', () => {
    expect(missingFields({ ...ready, address: 'Rua' })).toEqual(['endereço']);
    expect(missingFields({ ...ready, addressConfirmed: false })).toEqual([
      'escolher o endereço na lista de sugestões',
    ]);
    expect(
      missingFields({ ...ready, needsAddress: false, address: '', addressConfirmed: false }),
    ).toEqual([]);
  });

  it('wants at least one complete service', () => {
    expect(missingFields({ ...ready, services: [{ ...service, price: '0,00' }] })).toEqual([
      'pelo menos 1 serviço completo',
    ]);
    // One complete service is enough, even next to an unfinished one
    expect(missingFields({ ...ready, services: [{ ...service, price: '0,00' }, service] })).toEqual(
      [],
    );
  });
});
