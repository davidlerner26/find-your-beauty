import { Component, input, output } from '@angular/core';
import { PlaceSuggestion } from '../../utils/place-search';

// The list under an address input (inside an element with `position: relative`)
@Component({
  selector: 'app-place-suggestions',
  template: `
    @if (suggestions().length) {
      <ul
        i18n-aria-label
        class="suggestions"
        role="listbox"
        aria-label="Sugestões de endereço"
        [id]="listId()"
      >
        @for (suggestion of suggestions(); track suggestion.text) {
          <!-- mousedown is prevented so the input keeps focus and the click still lands -->
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected="false"
              (mousedown)="$event.preventDefault()"
              (click)="pick.emit(suggestion)"
            >
              {{ suggestion.text }}
            </button>
          </li>
        }
        <li class="powered" role="presentation">Powered by Google</li>
      </ul>
    }
  `,
  styleUrl: './place-suggestions.scss',
})
export class PlaceSuggestions {
  readonly suggestions = input.required<PlaceSuggestion[]>();
  // The id of the list: the input that it belongs to points at it with aria-controls
  readonly listId = input('place-suggestions');
  readonly pick = output<PlaceSuggestion>();
}
