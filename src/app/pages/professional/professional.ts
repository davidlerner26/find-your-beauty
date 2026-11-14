import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Professionals } from '../../services/professionals';
import { Seo } from '../../services/seo';
import { environment } from '../../../environments/environment';
import { opensInPanel, WIDE_SCREEN_QUERY } from '../../utils/professional-panel';
import { professionalJsonLd, professionalTitle, SITE_NAME, truncate } from '../../utils/seo';
import { ArtistDetails } from '../artist-details/artist-details';
import { Explore } from '../explore/explore';

// The page of a professional (/explorar/:id). On phones it is a screen of its own; on wide screens it is a card
// on top of the map. A professional with no place on the map has no pin: the page is a screen of its own there too.
@Component({
  selector: 'app-professional',
  imports: [ArtistDetails, Explore],
  template: `
    @if (onMap()) {
      <app-explore [openId]="id()" />
    } @else if (onMap() === false) {
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
  private readonly professionals = inject(Professionals);
  private readonly seo = inject(Seo);

  // Over the map, or a screen of its own. Unknown (null) until the catalog is there, so a professional with no place
  // does not flash the map first.
  protected readonly onMap = computed(() => {
    if (!this.wide()) return false;
    if (this.professionals.status() === 'loading') return null;
    return !opensInPanel(this.professionals.byId(this.id()), true);
  });

  constructor() {
    // The title, the description and the structured data of this professional, once the catalog is there
    effect(() => {
      if (this.professionals.status() === 'loading') return;
      const artist = this.professionals.byId(this.id());
      const path = `/explorar/${this.id()}`;
      if (!artist || artist.published === false) {
        this.seo.set({ title: $localize`Profissional não encontrado`, path, noindex: true });
        return;
      }
      const category = artist.tags?.[0];
      this.seo.set({
        title: professionalTitle(artist, (place) => $localize` em ${place}:place:`),
        description: truncate(
          artist.about?.[0] ||
            $localize`Agende ${category ?? SITE_NAME}:service: com ${artist.name}:name: pelo Find Your Beauty.`,
        ),
        image: artist.image,
        path,
        jsonLd: professionalJsonLd(artist, `${environment.siteUrl}${path}`),
      });
    });

    // Follows the width of the window (a phone turned sideways, a window that is resized)
    const query = window.matchMedia(WIDE_SCREEN_QUERY);
    this.wide.set(query.matches);
    query.addEventListener('change', (event) => this.wide.set(event.matches));
  }
}
