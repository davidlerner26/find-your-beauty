import { MatIconModule } from '@angular/material/icon';
import { Component, computed, effect, ElementRef, input, signal, inject } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { PricePipe } from '../../utils/price.pipe';
import { Location, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Favorites } from '../../services/favorites';
import { Professionals } from '../../services/professionals';
import { CalendarDay as Day, monthDays, startOfDay, startOfMonth } from '../../utils/calendar';
import { INTL_LOCALE } from '../../utils/locale';
import { CarouselArrows } from '../../components/carousel-arrows/carousel-arrows';
import { T } from '../../utils/texts';
import { CatalogPipe } from '../../utils/catalog.pipe';
import { log } from '../../utils/log';
import { Filters, MAX_KM, noFilters, SortKey } from './search-filter';
import { SearchStore } from './search.store';
import { DialogFocus } from '../../utils/dialog.directive';

@Component({
  selector: 'app-search',
  imports: [
    DialogFocus,
    CarouselArrows,
    CatalogPipe,
    ReviewsLabelPipe,
    PricePipe,
    FocusPipe,
    FormsModule,
    RouterLink,
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly favorites = inject(Favorites);

  protected readonly t = T;
  // A text to search for, from the link of a service on the home (?q=Escova)
  readonly q = input<string>();

  protected readonly maxKm = MAX_KM;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'price-asc', label: $localize`Menor preço` },
    { key: 'rating', label: $localize`Melhor avaliação` },
    { key: 'distance', label: $localize`Mais próximo` },
    { key: 'price-desc', label: $localize`Maior preço` },
  ];

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

  // Filter sheet: edits a draft that only becomes the applied filters on "Mostrar resultados"
  protected readonly sheetOpen = signal(false);
  protected draft: Filters = noFilters();
  protected readonly month = signal(startOfMonth(new Date()));

  private readonly today = startOfDay(new Date());

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(INTL_LOCALE, { month: 'long', year: 'numeric' }).format(this.month()),
  );
  protected readonly isCurrentMonth = computed(
    () => this.month().getTime() === startOfMonth(this.today).getTime(),
  );

  protected readonly days = computed<Day[]>(() =>
    monthDays(this.month(), (date) => date < this.today),
  );

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
    const applied = this.store.applied();
    this.draft = { ...applied, tags: [...applied.tags] };
    this.month.set(startOfMonth(this.draft.date ?? this.today));
    this.sheetOpen.set(true);
    this.showDay();
  }

  protected cancelSheet() {
    this.sheetOpen.set(false);
  }

  protected resetDraft() {
    this.draft = noFilters();
  }

  protected showResults() {
    this.store.applyFilters(this.draft);
    this.sheetOpen.set(false);
  }

  protected changeMonth(delta: number) {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    this.showDay();
  }

  protected pickDay(day: Day) {
    this.draft.date = this.isDraftDay(day) ? null : day.date;
  }

  protected isToday(day: Day) {
    return day.date.getTime() === this.today.getTime();
  }

  // Scrolls the strip of days to the chosen day, or to today, so it is in view when the list opens
  private showDay() {
    setTimeout(() => {
      const strip = this.host.nativeElement.querySelector('.days');
      strip
        ?.querySelector('.day.selected, .day.today')
        ?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }, 50);
  }

  protected isDraftDay(day: Day) {
    return this.draft.date?.getTime() === day.date.getTime();
  }

  protected toggleTag(tag: string) {
    this.draft.tags = this.draft.tags.includes(tag)
      ? this.draft.tags.filter((t) => t !== tag)
      : [...this.draft.tags, tag];
  }

  protected setSort(sort: SortKey) {
    this.draft.sort = this.draft.sort === sort ? null : sort;
  }

  protected setRating(stars: number) {
    this.draft.minRating = this.draft.minRating === stars ? 0 : stars;
  }
}
