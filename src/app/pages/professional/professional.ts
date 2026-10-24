import { Component, input, signal } from '@angular/core';
import { ArtistDetails } from '../artist-details/artist-details';
import { Explore } from '../explore/explore';

// The page of a professional (/profissionais/:id). On phones it is a screen of its own; on wide screens it is a card
// on top of the map.
@Component({
  selector: 'app-professional',
  imports: [ArtistDetails, Explore],
  template: `
    @if (wide()) {
      <app-explore [openId]="id()" />
    } @else {
      <app-artist-details [id]="id()" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ProfessionalPage {
  readonly id = input.required<string>();

  protected readonly wide = signal(false);

  constructor() {
    // Follows the width of the window (a phone turned sideways, a window that is resized)
    const query = window.matchMedia('(min-width: 1024px)');
    this.wide.set(query.matches);
    query.addEventListener('change', (event) => this.wide.set(event.matches));
  }
}
