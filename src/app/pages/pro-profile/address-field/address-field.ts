import { Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoogleMapsLoader } from '../../../services/google-maps-loader';
import { INTL_LOCALE } from '../../../utils/locale';
import { log } from '../../../utils/log';

type Suggestion = { text: string; prediction: google.maps.places.PlacePrediction };

export type Position = { lat: number; lng: number };

export const NO_POSITION: Position = { lat: 0, lng: 0 };

// An address typed with the help of Google Places. It only counts once a suggestion was chosen: that is
// what gives it a place on the map. Typing again breaks that link.
@Component({
  selector: 'app-address-field',
  imports: [FormsModule],
  templateUrl: './address-field.html',
  styleUrl: './address-field.scss',
})
export class AddressField {
  private readonly maps = inject(GoogleMapsLoader);

  readonly address = model('');
  readonly position = model<Position>(NO_POSITION);
  // A suggestion was chosen: the address has a place on the map
  readonly confirmed = model(false);

  protected readonly suggestions = signal<Suggestion[]>([]);
  protected readonly open = signal(false);
  protected readonly error = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;

  protected onInput(value: string) {
    this.address.set(value);
    // Editing the text breaks the link with the chosen place: it has to be chosen again
    this.confirmed.set(false);
    this.position.set(NO_POSITION);
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
      if (input !== this.address()) return;

      this.suggestions.set(
        suggestions.flatMap((suggestion) =>
          suggestion.placePrediction
            ? [
                {
                  text: suggestion.placePrediction.text.text,
                  prediction: suggestion.placePrediction,
                },
              ]
            : [],
        ),
      );
      this.open.set(true);
    } catch (error) {
      log.error('Address search failed', error);
      this.suggestions.set([]);
      this.error.set(
        $localize`Não foi possível buscar endereços agora. Tente novamente em instantes.`,
      );
    }
  }

  protected async choose(suggestion: Suggestion) {
    this.open.set(false);
    this.suggestions.set([]);

    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });
      if (!place.location) throw new Error('place-without-location');

      this.address.set(place.formattedAddress ?? suggestion.text);
      this.position.set({ lat: place.location.lat(), lng: place.location.lng() });
      this.confirmed.set(true);
      // Choosing a place closes the billing session of the search
      this.sessionToken = undefined;
    } catch (error) {
      log.error('Failed to load the place', error);
      this.error.set($localize`Não foi possível carregar este endereço. Escolha outro.`);
    }
  }

  protected close() {
    this.open.set(false);
  }
}
