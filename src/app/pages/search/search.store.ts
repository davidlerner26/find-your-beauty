import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Professionals } from '../../services/professionals';
import { UserLocation } from '../../services/user-location';
import {
  countFilters,
  Filters,
  neighborhoodsWith,
  noFilters,
  normalize,
  search,
  suggestions,
} from './search-filter';

const RECENTS_KEY = 'recent-searches';
const MAX_RECENTS = 5;

const readRecents = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const writeRecents = (recents: string[]) => {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // Storage can be blocked: recents just won't survive a reload
  }
};

type SearchState = {
  // The text being searched for
  term: string;
  // The filters of the last "Mostrar resultados"
  applied: Filters;
  recents: string[];
};

// What the search screen knows: the text, the applied filters, the recent searches and the results they give.
// The filter sheet keeps its own draft in the screen: it only reaches the store when it is applied.
export const SearchStore = signalStore(
  withState<SearchState>(() => ({ term: '', applied: noFilters(), recents: readRecents() })),
  withComputed(
    ({ term, applied }, professionals = inject(Professionals), location = inject(UserLocation)) => {
      const userPosition = computed(() => location.position());
      const allTags = computed(() => [
        ...new Set(professionals.published().flatMap((professional) => professional.tags)),
      ]);
      const activeFilterCount = computed(() => countFilters(applied()));

      return {
        userPosition,
        // Tags that exist in the catalog, for the chips
        allTags,
        popular: computed(() => allTags().slice(0, 6)),
        // Only the neighborhoods where there is a professional
        neighborhoods: computed(() =>
          neighborhoodsWith(professionals.published().map((professional) => professional.address)),
        ),
        activeFilterCount,
        searching: computed(() => !!term().trim() || activeFilterCount() > 0),
        results: computed(() =>
          search(professionals.published(), term(), applied(), userPosition()),
        ),
        suggestions: computed(() => suggestions(professionals.published(), userPosition())),
      };
    },
  ),
  withMethods((store) => ({
    setTerm(term: string) {
      patchState(store, { term });
    },

    // The text was sent (enter, a recent, a chip): it is searched and remembered
    submitTerm(text: string) {
      const term = text.trim();
      patchState(store, { term });
      if (!term) return;

      const recents = [
        term,
        ...store.recents().filter((recent) => normalize(recent) !== normalize(term)),
      ].slice(0, MAX_RECENTS);
      patchState(store, { recents });
      writeRecents(recents);
    },

    removeRecent(recent: string) {
      const recents = store.recents().filter((r) => r !== recent);
      patchState(store, { recents });
      writeRecents(recents);
    },

    clearRecents() {
      patchState(store, { recents: [] });
      writeRecents([]);
    },

    applyFilters(filters: Filters) {
      patchState(store, { applied: { ...filters, tags: [...filters.tags] } });
    },
  })),
);
