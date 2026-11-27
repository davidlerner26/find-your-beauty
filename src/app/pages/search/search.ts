import { MatIconModule } from '@angular/material/icon';
import { Component, effect, input, signal, inject } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
import { ProfessionalLink } from '../../utils/professional-link.directive';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { PricePipe } from '../../utils/price.pipe';
import { Location, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Favorites } from '../../services/favorites';
import { Professionals } from '../../services/professionals';
import { CarouselArrows } from '../../components/carousel-arrows/carousel-arrows';
import { dotsWindow } from '../../utils/photo-dots';
import { T } from '../../utils/texts';
import { CatalogPipe } from '../../utils/catalog.pipe';
import { log } from '../../utils/log';
import { ProBadge } from '../../components/pro-badge/pro-badge';
import { FilterSheet } from '../../components/filter-sheet/filter-sheet';
import { Filters } from './search-filter';
import { SearchStore } from './search.store';

@Component({
  selector: 'app-search',
  imports: [
    FilterSheet,
    ProBadge,
    CarouselArrows,
    CatalogPipe,
    ReviewsLabelPipe,
    PricePipe,
    FocusPipe,
    FormsModule,
    ProfessionalLink,
    NgTemplateOutlet,
    MatIconModule,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  providers: [SearchStore],
})
export class Search {
  private readonly location = inject(Location);
  protected readonly professionals = inject(Professionals);
  private readonly store = inject(SearchStore);
  protected readonly favorites = inject(Favorites);

  protected readonly t = T;
  protected readonly dotsOf = dotsWindow;
  // A text to search for, from the link of a service on the home (?q=Escova)
  readonly q = input<string>();

  // What the store knows about the search
  protected readonly recents = this.store.recents;
  protected readonly userPosition = this.store.userPosition;
  protected readonly allTags = this.store.allTags;
  protected readonly popular = this.store.popular;
  protected readonly neighborhoods = this.store.neighborhoods;
  protected readonly activeFilterCount = this.store.activeFilterCount;
  protected readonly searching = this.store.searching;
  protected readonly results = this.store.results;
  protected readonly suggestions = this.store.suggestions;

  // The text of the search box (the store gets it as the user types)
  protected query = '';

  // Photo being shown in the card of each result (for the dots)
  protected readonly photoIndex = signal<Record<string, number | undefined>>({});

  protected onPhotosScroll(event: Event, id: string) {
    const strip = event.target as HTMLElement;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    if (this.photoIndex()[id] !== index)
      this.photoIndex.update((current) => ({ ...current, [id]: index }));
  }

  // The filter sheet (the component edits a draft; it only reaches the store on "Mostrar resultados")
  protected readonly sheetOpen = signal(false);
  protected readonly appliedFilters = this.store.applied;

  constructor() {
    effect(() => {
      const q = this.q();
      if (!q) return;
      this.query = q;
      this.store.setTerm(q);
    });
  }

  // The heart sits inside a card that is a link: it must not open the page
  protected toggleFavorite(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(id).catch((error) => log.error('Failed to update favorite', error));
  }

  protected goBack() {
    this.location.back();
  }

  // ----- text search and recents
  protected onType() {
    this.store.setTerm(this.query);
  }

  protected submit() {
    this.store.submitTerm(this.query);
  }

  protected searchFor(value: string) {
    this.query = value;
    this.submit();
  }

  protected removeRecent(value: string) {
    this.store.removeRecent(value);
  }

  protected clearRecents() {
    this.store.clearRecents();
  }

  protected clearQuery() {
    this.query = '';
    this.store.setTerm('');
  }

  // ----- filter sheet
  protected openSheet() {
    this.sheetOpen.set(true);
  }

  protected cancelSheet() {
    this.sheetOpen.set(false);
  }

  protected applyFilters(filters: Filters) {
    this.store.applyFilters(filters);
    this.sheetOpen.set(false);
  }
}
