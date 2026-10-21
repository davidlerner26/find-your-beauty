import { Component, input, output } from '@angular/core';
import { PlaceSuggestion } from '../../utils/place-search';

// The list under an address input (inside an element with `position: relative`)
@Component({
  selector: 'app-place-suggestions',
  template: `
    @if (suggestions().length) {
      <ul class="suggestions" role="listbox">
        @for (suggestion of suggestions(); track suggestion.text) {
          <!-- mousedown is prevented so the input keeps focus and the click still lands -->
          <li role="option">
            <button type="button" (mousedown)="$event.preventDefault()" (click)="pick.emit(suggestion)">
              {{ suggestion.text }}
            </button>
          </li>
        }
        <li class="powered">Powered by Google</li>
      </ul>
    }
  `,
  styleUrl: './place-suggestions.scss',
})
export class PlaceSuggestions {
  readonly suggestions = input.required<PlaceSuggestion[]>();
  readonly pick = output<PlaceSuggestion>();
}
