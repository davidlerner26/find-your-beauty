import { MatIconModule } from '@angular/material/icon';
import { Component, computed, effect, ElementRef, input, signal, inject } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
import { ReviewsLabelPipe } from '../../utils/reviews-label.pipe';
import { PricePipe } from '../../utils/price.pipe';
import { Location, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RJ_NEIGHBORHOODS } from '../../models/neighborhoods';
import { hasLocation, locationLabel, Professional } from '../../models/professional';
import { Favorites } from '../../services/favorites';
import { Professionals } from '../../services/professionals';
import { UserLocation } from '../../services/user-location';
import { lowestPrice } from '../../utils/pricing';
import { distanceKm, formatDistance } from '../../utils/geo';
import { DEFAULT_AVAILABILITY } from '../../models/professional';
import { isWorkingDay } from '../../utils/slots';
import { INTL_LOCALE } from '../../utils/locale';
import { CarouselArrows } from '../../components/carousel-arrows/carousel-arrows';
import { T } from '../../utils/texts';
import { CatalogPipe, catalogLabel } from '../../utils/catalog.pipe';

type SortKey = 'price-asc' | 'rating' | 'distance' | 'price-desc';

type Filters = {
  date: Date | null;
  tags: string[];
  minRating: number;
  maxKm: number;
  sort: SortKey | null;
  // A neighborhood of the city of Rio de Janeiro
  neighborhood: string | null;
};

type Day = { date: Date; weekday: string; number: number; disabled: boolean };

const MAX_KM = 50;
const NO_FILTERS: Filters = {
  date: null,
  tags: [],
  minRating: 0,
  maxKm: MAX_KM,
  sort: null,
  neighborhood: null,
};
const RECENTS_KEY = 'recent-searches';

// Compares text ignoring case and accents
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Is the address in this neighborhood of Rio? The addresses come from Google: "Rua X, 12 - Leblon, Rio de Janeiro - RJ"
const inNeighborhood = (address: string, neighborhood: string) => {
  const text = normalize(address);
  // "Freguesia (Jacarepaguá)": the name that is written in the address is the one before the parentheses
  const name = normalize(neighborhood.split(' (')[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.includes('rio de janeiro') && new RegExp(`(^|[\\s,-])${name}\\s*,`).test(text);
};

const readRecents = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
};

@Component({
  selector: 'app-search',
  imports: [
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
})
export class Search {
  private readonly location = inject(Location);
  protected readonly professionals = inject(Professionals);
  private readonly userLocation = inject(UserLocation);
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

  protected query = '';
  protected readonly term = signal('');
  protected readonly recents = signal<string[]>(readRecents());
  protected readonly applied = signal<Filters>({ ...NO_FILTERS });
  protected readonly userPosition = computed(() => this.userLocation.position());

  // Filter sheet: edits a draft that only becomes the applied filters on "Mostrar resultados"
  // Photo being shown in the card of each result (for the dots)
  protected readonly photoIndex = signal<Record<string, number | undefined>>({});

  protected onPhotosScroll(event: Event, id: string) {
    const strip = event.target as HTMLElement;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    if (this.photoIndex()[id] !== index)
      this.photoIndex.update((current) => ({ ...current, [id]: index }));
  }

  protected readonly sheetOpen = signal(false);
  protected draft: Filters = { ...NO_FILTERS };
  protected readonly month = signal(this.startOfMonth(new Date()));

  private readonly today = this.startOfDay(new Date());

  // Tags that exist in the catalog, for the chips
  protected readonly allTags = computed(() => [
    ...new Set(this.professionals.published().flatMap((professional) => professional.tags)),
  ]);

  // Only the neighborhoods where there is a professional
  protected readonly neighborhoods = computed(() => {
    const addresses = this.professionals.published().map((professional) => professional.address);
    // "Freguesia (Jacarepaguá)" and "Freguesia (Ilha do Governador)" are searched as "Freguesia"
    const names = RJ_NEIGHBORHOODS.map((name) => name.split(' (')[0]);
    return [...new Set(names)].filter((name) =>
      addresses.some((address) => inNeighborhood(address, name)),
    );
  });

  protected readonly popular = computed(() => this.allTags().slice(0, 6));

  protected readonly activeFilterCount = computed(() => {
    const { date, tags, minRating, maxKm, sort, neighborhood } = this.applied();
    return (
      (neighborhood ? 1 : 0) +
      (date ? 1 : 0) +
      (tags.length ? 1 : 0) +
      (minRating ? 1 : 0) +
      (maxKm < MAX_KM ? 1 : 0) +
      (sort ? 1 : 0)
    );
  });

  protected readonly searching = computed(
    () => !!this.term().trim() || this.activeFilterCount() > 0,
  );

  // What a card of the list shows (the same for the results and for the suggestions)
  private card(professional: Professional, user: { lat: number; lng: number } | null) {
    return {
      ...professional,
      cardImage: professional.image,
      cardPosition: professional.imagePosition,
      // The photos of the work (the profile photo when there is no gallery), like the cards of the home
      photos: professional.gallery.length ? professional.gallery : [professional.image],
      address: locationLabel(professional),
      distance:
        user && hasLocation(professional)
          ? formatDistance(distanceKm(user, professional.position))
          : null,
      km: user && hasLocation(professional) ? distanceKm(user, professional.position) : null,
      // The cheapest service: "a partir de"
      minPrice: professional.services.length
        ? Math.min(...professional.services.map(lowestPrice))
        : null,
    };
  }

  protected readonly results = computed(() => {
    const term = normalize(this.term().trim());
    const { date, tags, minRating, maxKm, sort, neighborhood } = this.applied();
    const user = this.userPosition();

    const found = this.professionals
      .published()
      .filter((professional) => {
        if (term && !this.matchesText(professional, term)) return false;
        if (neighborhood && !inNeighborhood(professional.address, neighborhood)) return false;
        if (tags.length && !professional.tags.some((tag) => tags.includes(tag))) return false;
        if (professional.rating < minRating) return false;
        if (date && !isWorkingDay(date, professional.availability ?? DEFAULT_AVAILABILITY))
          return false;
        if (
          user &&
          maxKm < MAX_KM &&
          (!hasLocation(professional) || distanceKm(user, professional.position) > maxKm)
        )
          return false;
        return true;
      })
      .map((professional) => this.card(professional, user));

    // No chosen order keeps the order of the catalog. Without a price or a distance, a professional goes last.
    if (!sort) return found;
    const last = (value: number | null, fallback: number) => value ?? fallback;
    return found.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return last(a.minPrice, Infinity) - last(b.minPrice, Infinity) || 0;
        case 'price-desc':
          return last(b.minPrice, -Infinity) - last(a.minPrice, -Infinity) || 0;
        case 'rating':
          return b.rating - a.rating;
        case 'distance':
          return last(a.km, Infinity) - last(b.km, Infinity) || 0;
      }
    });
  });

  // What is shown before searching: the best rated
  protected readonly suggestions = computed(() =>
    [...this.professionals.published()]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map((professional) => this.card(professional, this.userPosition())),
  );

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(INTL_LOCALE, { month: 'long', year: 'numeric' }).format(this.month()),
  );
  protected readonly isCurrentMonth = computed(
    () => this.month().getTime() === this.startOfMonth(this.today).getTime(),
  );

  protected readonly days = computed<Day[]>(() => {
    const month = this.month();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weekday = new Intl.DateTimeFormat(INTL_LOCALE, { weekday: 'short' });

    return Array.from({ length: total }, (_, i) => {
      const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
      return {
        date,
        weekday: weekday.format(date).replace('.', ''),
        number: i + 1,
        disabled: date < this.today,
      };
    });
  });

  constructor() {
    effect(() => {
      const q = this.q();
      if (!q) return;
      this.query = q;
      this.term.set(q);
    });
  }

  // The heart sits inside a card that is a link: it must not open the page
  protected toggleFavorite(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(id).catch((error) => console.error('Failed to update favorite', error));
  }

  protected goBack() {
    this.location.back();
  }

  // ----- text search and recents
  protected onType() {
    this.term.set(this.query);
  }

  protected submit() {
    const value = this.query.trim();
    this.term.set(value);
    if (!value) return;

    this.saveRecents(
      [value, ...this.recents().filter((r) => normalize(r) !== normalize(value))].slice(0, 5),
    );
  }

  protected searchFor(value: string) {
    this.query = value;
    this.submit();
  }

  protected removeRecent(value: string) {
    this.saveRecents(this.recents().filter((recent) => recent !== value));
  }

  protected clearRecents() {
    this.saveRecents([]);
  }

  protected clearQuery() {
    this.query = '';
    this.term.set('');
  }

  // ----- filter sheet
  protected openSheet() {
    this.draft = { ...this.applied(), tags: [...this.applied().tags] };
    this.month.set(this.startOfMonth(this.draft.date ?? this.today));
    this.sheetOpen.set(true);
    this.showDay();
  }

  protected cancelSheet() {
    this.sheetOpen.set(false);
  }

  protected resetDraft() {
    this.draft = { ...NO_FILTERS, tags: [] };
  }

  protected showResults() {
    this.applied.set({ ...this.draft, tags: [...this.draft.tags] });
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

  private matchesText(professional: Professional, term: string) {
    const haystack = [
      professional.name,
      professional.address,
      ...professional.tags,
      ...professional.services.flatMap((service) => [service.name, catalogLabel(service.name)]),
    ]
      .map(normalize)
      .join(' ');
    return haystack.includes(term);
  }

  private saveRecents(list: string[]) {
    this.recents.set(list);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
    } catch {
      // Storage can be blocked: recents just won't survive a reload
    }
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}
