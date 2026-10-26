import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Professional } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { UserLocation } from '../../services/user-location';
import { noFilters } from './search-filter';
import { SearchStore } from './search.store';

const pro = (id: string, name: string, rating: number, tag = 'Maquiagem'): Professional =>
  ({
    id,
    name,
    image: '',
    address: 'Rua A, 1 - Botafogo, Rio de Janeiro - RJ',
    serviceMode: 'studio',
    tags: [tag],
    rating,
    reviewsCount: '0',
    views: '0',
    about: [],
    services: [],
    gallery: [],
    position: { lat: -22.95, lng: -43.18 },
  }) as Professional;

const setup = () => {
  const published = signal([pro('1', 'Ana', 4, 'Maquiagem'), pro('2', 'Bia', 5, 'Cabelo')]);
  const position = signal<{ lat: number; lng: number } | null>(null);
  TestBed.configureTestingModule({
    providers: [
      SearchStore,
      { provide: Professionals, useValue: { published } },
      { provide: UserLocation, useValue: { position } },
    ],
  });
  return { store: TestBed.inject(SearchStore), published, position };
};

beforeEach(() => localStorage.clear());

describe('SearchStore', () => {
  it('starts with no search: suggestions instead of results', () => {
    const { store } = setup();
    expect(store.searching()).toBe(false);
    expect(store.activeFilterCount()).toBe(0);
    expect(store.suggestions().map((card) => card.name)).toEqual(['Bia', 'Ana']);
  });

  it('searches as the text changes, and follows the catalog', () => {
    const { store, published } = setup();
    store.setTerm('ana');
    expect(store.searching()).toBe(true);
    expect(store.results().map((card) => card.name)).toEqual(['Ana']);

    published.update((list) => [...list, pro('3', 'Ana Paula', 3)]);
    expect(store.results().map((card) => card.name)).toEqual(['Ana', 'Ana Paula']);
  });

  it('a filter counts as searching even without text', () => {
    const { store } = setup();
    store.applyFilters({ ...noFilters(), tags: ['Cabelo'] });
    expect(store.searching()).toBe(true);
    expect(store.activeFilterCount()).toBe(1);
    expect(store.results().map((card) => card.name)).toEqual(['Bia']);
  });

  it('keeps its own copy of the filters it is given', () => {
    const { store } = setup();
    const draft = { ...noFilters(), tags: ['Cabelo'] };
    store.applyFilters(draft);
    draft.tags.push('Maquiagem');
    expect(store.applied().tags).toEqual(['Cabelo']);
  });

  it('knows the tags and the neighborhoods of the catalog', () => {
    const { store } = setup();
    expect(store.allTags()).toEqual(['Maquiagem', 'Cabelo']);
    expect(store.popular()).toEqual(['Maquiagem', 'Cabelo']);
    expect(store.neighborhoods()).toEqual(['Botafogo']);
  });

  it('uses the position of the user for the distance', () => {
    const { store, position } = setup();
    store.setTerm('ana');
    expect(store.results()[0].distance).toBeNull();

    position.set({ lat: -22.9068, lng: -43.1729 });
    expect(store.results()[0].distance).toMatch(/km$/);
  });

  describe('recent searches', () => {
    it('remembers a sent text, newest first, without repeating it', () => {
      const { store } = setup();
      store.submitTerm('escova');
      store.submitTerm('noiva');
      store.submitTerm('  ESCOVA ');

      expect(store.recents()).toEqual(['ESCOVA', 'noiva']);
      expect(store.term()).toBe('ESCOVA');
    });

    it('keeps the last 5 and saves them for the next visit', () => {
      const { store } = setup();
      for (const text of ['a', 'b', 'c', 'd', 'e', 'f']) store.submitTerm(text);

      expect(store.recents()).toEqual(['f', 'e', 'd', 'c', 'b']);
      expect(JSON.parse(localStorage.getItem('recent-searches')!)).toEqual([
        'f',
        'e',
        'd',
        'c',
        'b',
      ]);
    });

    it('does not remember an empty text, but clears the search', () => {
      const { store } = setup();
      store.setTerm('ana');
      store.submitTerm('   ');
      expect(store.term()).toBe('');
      expect(store.recents()).toEqual([]);
    });

    it('removes one or all', () => {
      const { store } = setup();
      store.submitTerm('a');
      store.submitTerm('b');
      store.removeRecent('a');
      expect(store.recents()).toEqual(['b']);
      store.clearRecents();
      expect(store.recents()).toEqual([]);
      expect(JSON.parse(localStorage.getItem('recent-searches')!)).toEqual([]);
    });

    it('starts with the ones saved before, and survives a broken value', () => {
      localStorage.setItem('recent-searches', JSON.stringify(['x', 'y']));
      expect(setup().store.recents()).toEqual(['x', 'y']);

      TestBed.resetTestingModule();
      localStorage.setItem('recent-searches', '{not json');
      expect(setup().store.recents()).toEqual([]);
    });
  });
});
