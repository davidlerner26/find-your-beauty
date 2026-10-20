import { MatIconModule } from '@angular/material/icon';
import { Component, computed, signal } from '@angular/core';
import { FocusPipe } from '../../utils/focus.pipe';
import { Location, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Professional } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { UserLocation } from '../../services/user-location';
import { distanceKm, formatDistance } from '../../utils/geo';
import { DEFAULT_AVAILABILITY } from '../../models/professional';
import { isWorkingDay } from '../../utils/slots';

type Filters = {
  date: Date | null;
  tags: string[];
  minRating: number;
  maxKm: number;
};

type Day = { date: Date; weekday: string; number: number; disabled: boolean };

const MAX_KM = 50;
const NO_FILTERS: Filters = { date: null, tags: [], minRating: 0, maxKm: MAX_KM };
const RECENTS_KEY = 'recent-searches';

// Compares text ignoring case and accents
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const readRecents = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
};

@Component({
  selector: 'app-search',
  imports: [FocusPipe, FormsModule, RouterLink, NgTemplateOutlet, MatIconModule],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  protected readonly maxKm = MAX_KM;
  protected readonly stars = [1, 2, 3, 4, 5];

  protected query = '';
  protected readonly term = signal('');
  protected readonly recents = signal<string[]>(readRecents());
  protected readonly applied = signal<Filters>({ ...NO_FILTERS });
  protected readonly userPosition = computed(() => this.userLocation.position());

  // Filter sheet: edits a draft that only becomes the applied filters on "Mostrar resultados"
  protected readonly sheetOpen = signal(false);
  protected draft: Filters = { ...NO_FILTERS };
  protected readonly month = signal(this.startOfMonth(new Date()));

  private readonly today = this.startOfDay(new Date());

  // Tags that exist in the catalog, for the chips
  protected readonly allTags = computed(() => [
    ...new Set(this.professionals.published().flatMap((professional) => professional.tags)),
  ]);

  protected readonly popular = computed(() => this.allTags().slice(0, 6));

  protected readonly activeFilterCount = computed(() => {
    const { date, tags, minRating, maxKm } = this.applied();
    return (date ? 1 : 0) + (tags.length ? 1 : 0) + (minRating ? 1 : 0) + (maxKm < MAX_KM ? 1 : 0);
  });

  protected readonly searching = computed(() => !!this.term().trim() || this.activeFilterCount() > 0);

  protected readonly results = computed(() => {
    const term = normalize(this.term().trim());
    const { date, tags, minRating, maxKm } = this.applied();
    const user = this.userPosition();

    return this.professionals
      .published()
      .filter((professional) => {
        if (term && !this.matchesText(professional, term)) return false;
        if (tags.length && !professional.tags.some((tag) => tags.includes(tag))) return false;
        if (professional.rating < minRating) return false;
        if (date && !isWorkingDay(date, professional.availability ?? DEFAULT_AVAILABILITY)) return false;
        if (user && maxKm < MAX_KM && distanceKm(user, professional.position) > maxKm) return false;
        return true;
      })
      .map((professional) => ({
        ...professional,
        cardImage: professional.image,
        cardPosition: professional.imagePosition,
        distance: user ? formatDistance(distanceKm(user, professional.position)) : null,
      }));
  });

  // What is shown before searching: the best rated
  protected readonly suggestions = computed(() =>
    [...this.professionals.published()].sort((a, b) => b.rating - a.rating).slice(0, 5),
  );

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.month()),
  );
  protected readonly isCurrentMonth = computed(
    () => this.month().getTime() === this.startOfMonth(this.today).getTime(),
  );

  protected readonly days = computed<Day[]>(() => {
    const month = this.month();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

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

  constructor(
    private readonly location: Location,
    protected readonly professionals: Professionals,
    private readonly userLocation: UserLocation,
  ) {}

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

    this.saveRecents([value, ...this.recents().filter((r) => normalize(r) !== normalize(value))].slice(0, 5));
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
  }

  protected pickDay(day: Day) {
    this.draft.date = this.isDraftDay(day) ? null : day.date;
  }

  protected isDraftDay(day: Day) {
    return this.draft.date?.getTime() === day.date.getTime();
  }

  protected toggleTag(tag: string) {
    this.draft.tags = this.draft.tags.includes(tag)
      ? this.draft.tags.filter((t) => t !== tag)
      : [...this.draft.tags, tag];
  }

  protected setRating(stars: number) {
    this.draft.minRating = this.draft.minRating === stars ? 0 : stars;
  }

  private matchesText(professional: Professional, term: string) {
    const haystack = [
      professional.name,
      professional.address,
      ...professional.tags,
      ...professional.services.map((service) => service.name),
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
