import { signal } from '@angular/core';
import { GoogleMapsLoader } from '../services/google-maps-loader';
import { INTL_LOCALE } from './locale';

export type PlaceSuggestion = { text: string; prediction: google.maps.places.PlacePrediction };

// Address search with Google Places: the address only counts once a suggestion was chosen.
// A page keeps one of these per address field and shows `suggestions` under the input.
export class PlaceSearch {
  readonly suggestions = signal<PlaceSuggestion[]>([]);
  readonly open = signal(false);
  readonly confirmed = signal(false);
  readonly error = signal('');

  // A signal behind the property, so a page that shows `value` updates when a suggestion is chosen
  private readonly text = signal('');
  get value() {
    return this.text();
  }
  set value(text: string) {
    this.text.set(text);
  }

  position = { lat: 0, lng: 0 };

  private timer?: ReturnType<typeof setTimeout>;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;

  constructor(private readonly maps: GoogleMapsLoader) {}

  // An address that was saved before: it counts as chosen until the text is edited
  load(address: string, position?: { lat: number; lng: number }) {
    this.value = address;
    this.position = position ? { ...position } : { lat: 0, lng: 0 };
    this.confirmed.set(!!address.trim());
  }

  input(value: string) {
    this.value = value;
    // Editing the text breaks the link with the chosen place: it has to be chosen again
    this.confirmed.set(false);
    this.position = { lat: 0, lng: 0 };
    this.error.set('');
    clearTimeout(this.timer);

    if (value.trim().length < 3) {
      this.suggestions.set([]);
      return;
    }
    // Waits for a pause in the typing so it doesn't search on every key
    this.timer = setTimeout(() => this.search(value), 250);
  }

  private async search(input: string) {
    try {
      await this.maps.load();
      const { AutocompleteSuggestion, AutocompleteSessionToken } = google.maps.places;
      this.sessionToken ??= new AutocompleteSessionToken();

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: this.sessionToken,
        includedRegionCodes: ['br'],
        language: INTL_LOCALE,
        region: 'br',
      });

      // The user kept typing while this was loading: that answer is already old
      if (input !== this.value) return;

      this.suggestions.set(
        suggestions.flatMap((suggestion) =>
          suggestion.placePrediction
            ? [{ text: suggestion.placePrediction.text.text, prediction: suggestion.placePrediction }]
            : [],
        ),
      );
      this.open.set(true);
    } catch (error) {
      console.error('Address search failed', error);
      this.suggestions.set([]);
      this.error.set('Não foi possível buscar endereços agora. Tente novamente em instantes.');
    }
  }

  async choose(suggestion: PlaceSuggestion) {
    this.open.set(false);
    this.suggestions.set([]);

    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });
      if (!place.location) throw new Error('place-without-location');

      this.value = place.formattedAddress ?? suggestion.text;
      this.position = { lat: place.location.lat(), lng: place.location.lng() };
      this.confirmed.set(true);
      // Choosing a place closes the billing session of the search
      this.sessionToken = undefined;
    } catch (error) {
      console.error('Failed to load the place', error);
      this.error.set('Não foi possível carregar este endereço. Escolha outro.');
    }
  }

  close() {
    this.open.set(false);
  }
}
