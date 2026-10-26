import { Component, HostListener, inject } from '@angular/core';
import { UserLocation } from '../../services/user-location';

@Component({
  selector: 'app-location-prompt',
  templateUrl: './location-prompt.html',
  styleUrl: './location-prompt.scss',
})
export class LocationPrompt {
  protected readonly location = inject(UserLocation);

  protected enable() {
    this.location.request();
  }

  @HostListener('document:keydown.escape')
  protected dismiss() {
    if (this.location.shouldAsk()) this.location.dismiss();
  }
}
