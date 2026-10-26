import { Component, HostListener, inject } from '@angular/core';
import { UserLocation } from '../../services/user-location';
import { DialogFocus } from '../../utils/dialog.directive';

@Component({
  selector: 'app-location-prompt',
  imports: [DialogFocus],
  templateUrl: './location-prompt.html',
  styleUrl: './location-prompt.scss',
})
export class LocationPrompt {
  protected readonly location = inject(UserLocation);

  // A tap on the dark area closes it; a tap on the card does not
  protected onBackdrop(event: Event) {
    if (event.target === event.currentTarget) this.dismiss();
  }

  protected enable() {
    this.location.request();
  }

  @HostListener('document:keydown.escape')
  protected dismiss() {
    if (this.location.shouldAsk()) this.location.dismiss();
  }
}
