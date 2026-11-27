import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Filters, MAX_KM, noFilters, Point, SortKey } from '../../pages/search/search-filter';
import { CalendarDay as Day, monthDays, startOfDay, startOfMonth } from '../../utils/calendar';
import { CatalogPipe } from '../../utils/catalog.pipe';
import { DialogFocus } from '../../utils/dialog.directive';
import { INTL_LOCALE } from '../../utils/locale';
import { T } from '../../utils/texts';

// The filters of the search of professionals (order, neighborhood, day, service, place of service, rating and distance). It edits
// a draft that only becomes the filters on "Mostrar resultados". The search screen opens it as a sheet (from the bottom on a
// phone, a window on a wide screen); the screen of the map opens it as a card on the right (`side`).
@Component({
  selector: 'app-filter-sheet',
  imports: [CatalogPipe, DialogFocus, FormsModule, MatIconModule],
  templateUrl: './filter-sheet.html',
  styleUrl: './filter-sheet.scss',
})
export class FilterSheet {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // The filters that are applied now: the draft starts from them
  readonly filters = input.required<Filters>();
  // What the chips and the lists offer
  readonly tags = input.required<string[]>();
  readonly neighborhoods = input.required<string[]>();
  // Where the client is (null: it was not allowed): the distance and the order by distance need it
  readonly userPosition = input<Point | null>(null);
  // On the right of a wide screen, as a card over the map
  readonly side = input(false);

  readonly applied = output<Filters>();
  readonly cancelled = output<void>();

  protected readonly t = T;
  protected readonly maxKm = MAX_KM;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'price-asc', label: $localize`Menor preço` },
    { key: 'rating', label: $localize`Melhor avaliação` },
    { key: 'distance', label: $localize`Mais próximo` },
    { key: 'price-desc', label: $localize`Maior preço` },
  ];

  // What is being edited (kept apart until "Mostrar resultados")
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
    // The component is only there while the sheet is open: it starts from the filters that are applied
    effect(() => {
      const applied = this.filters();
      this.draft = { ...applied, tags: [...applied.tags] };
      this.month.set(startOfMonth(this.draft.date ?? this.today));
      this.showDay();
    });
  }

  protected resetDraft() {
    this.draft = noFilters();
  }

  protected showResults() {
    this.applied.emit({ ...this.draft, tags: [...this.draft.tags] });
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
