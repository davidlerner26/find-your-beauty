import { TestBed } from '@angular/core/testing';
import { GoogleMapsLoader } from '../../../services/google-maps-loader';
import { setLogSink } from '../../../utils/log';
import { AddressField } from './address-field';

// A fake of the part of Google Places the field uses
const fetchSuggestions = vi.fn();
const fetchFields = vi.fn();
const place = {
  location: { lat: () => -22.95, lng: () => -43.18 },
  formattedAddress: 'Rua A, 1 - Botafogo',
  fetchFields,
};
const prediction = (text: string) => ({ text: { text }, toPlace: () => place });

beforeEach(() => {
  vi.useFakeTimers();
  setLogSink(() => undefined);
  fetchSuggestions
    .mockReset()
    .mockResolvedValue({ suggestions: [{ placePrediction: prediction('Rua A, 1') }] });
  fetchFields.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('google', {
    maps: {
      places: {
        AutocompleteSessionToken: class {},
        AutocompleteSuggestion: { fetchAutocompleteSuggestions: fetchSuggestions },
      },
    },
  });
  TestBed.configureTestingModule({
    imports: [AddressField],
    providers: [{ provide: GoogleMapsLoader, useValue: { load: async () => undefined } }],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setLogSink(null);
});

// The pieces the template uses
type Inside = {
  onInput(value: string): void;
  choose(suggestion: unknown): Promise<void>;
  suggestions(): { text: string }[];
  open(): boolean;
  error(): string;
};

const create = () => {
  const fixture = TestBed.createComponent(AddressField);
  return {
    component: fixture.componentInstance,
    inside: fixture.componentInstance as unknown as Inside,
  };
};

describe('AddressField', () => {
  it('searches after a pause in the typing, not on every key', async () => {
    const { inside } = create();
    inside.onInput('Rua');
    inside.onInput('Rua A');
    await vi.advanceTimersByTimeAsync(249);
    expect(fetchSuggestions).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(fetchSuggestions.mock.calls[0][0]).toMatchObject({
      input: 'Rua A',
      includedRegionCodes: ['br'],
    });
    expect(inside.suggestions().map((s) => s.text)).toEqual(['Rua A, 1']);
    expect(inside.open()).toBe(true);
  });

  it('does not search for fewer than 3 characters and clears the suggestions', async () => {
    const { inside } = create();
    inside.onInput('Rua');
    await vi.advanceTimersByTimeAsync(250);
    inside.onInput('Ru');
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(inside.suggestions()).toEqual([]);
  });

  it('typing breaks the link with the chosen place', async () => {
    const { component, inside } = create();
    component.address.set('Rua A, 1 - Botafogo');
    component.confirmed.set(true);
    component.position.set({ lat: -22.95, lng: -43.18 });

    inside.onInput('Rua A, 12');

    expect(component.address()).toBe('Rua A, 12');
    expect(component.confirmed()).toBe(false);
    expect(component.position()).toEqual({ lat: 0, lng: 0 });
  });

  it('choosing a suggestion confirms the address and gives it a position', async () => {
    const { component, inside } = create();
    inside.onInput('Rua A');
    await vi.advanceTimersByTimeAsync(250);
    await inside.choose({ text: 'Rua A, 1', prediction: prediction('Rua A, 1') });

    expect(component.address()).toBe('Rua A, 1 - Botafogo');
    expect(component.position()).toEqual({ lat: -22.95, lng: -43.18 });
    expect(component.confirmed()).toBe(true);
    expect(inside.open()).toBe(false);
    expect(inside.suggestions()).toEqual([]);
  });

  it('ignores an answer that arrives after the user kept typing', async () => {
    let answer!: (value: unknown) => void;
    fetchSuggestions.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const { inside } = create();

    inside.onInput('Rua A');
    await vi.advanceTimersByTimeAsync(250);
    inside.onInput('Rua B');
    answer({ suggestions: [{ placePrediction: prediction('Rua A, 1') }] });
    await vi.advanceTimersByTimeAsync(0);

    expect(inside.suggestions()).toEqual([]);
  });

  it('tells the user when the search or the place cannot be loaded', async () => {
    const { component, inside } = create();
    fetchSuggestions.mockRejectedValueOnce(new Error('quota'));
    inside.onInput('Rua A');
    await vi.advanceTimersByTimeAsync(250);
    expect(inside.error()).not.toBe('');

    inside.onInput('Rua AB');
    expect(inside.error()).toBe('');

    place.location = undefined as never;
    await inside.choose({ text: 'x', prediction: prediction('x') });
    expect(inside.error()).not.toBe('');
    expect(component.confirmed()).toBe(false);
    place.location = { lat: () => -22.95, lng: () => -43.18 };
  });
});
