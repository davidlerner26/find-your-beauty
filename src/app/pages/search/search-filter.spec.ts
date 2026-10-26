import { Professional } from '../../models/professional';
import {
  countFilters,
  inNeighborhood,
  matchesText,
  MAX_KM,
  neighborhoodsWith,
  noFilters,
  normalize,
  search,
  suggestions,
  toCard,
} from './search-filter';

let nextId = 0;
const pro = (overrides: Partial<Professional> = {}): Professional => ({
  id: `p${++nextId}`,
  name: 'Ana',
  image: 'ana.jpg',
  address: 'Rua A, 1 - Botafogo, Rio de Janeiro - RJ',
  serviceMode: 'studio',
  tags: ['Maquiagem'],
  rating: 4,
  reviewsCount: '1',
  views: '0',
  about: [],
  services: [
    {
      id: 's1',
      name: 'Maquiagem social',
      category: 'Maquiagem',
      price: 100,
      durationMinutes: 60,
      description: '',
    },
  ],
  gallery: [],
  position: { lat: -22.95, lng: -43.18 },
  ...overrides,
});

const filters = (overrides = {}) => ({ ...noFilters(), ...overrides });
const names = (cards: { name: string }[]) => cards.map((card) => card.name);

describe('normalize', () => {
  it('ignores case and accents', () => {
    expect(normalize('Jacarepaguá  MAQUIAGEM')).toBe('jacarepagua  maquiagem');
  });
});

describe('inNeighborhood', () => {
  const address = 'Rua X, 12 - Leblon, Rio de Janeiro - RJ';

  it('finds the neighborhood written in the address', () => {
    expect(inNeighborhood(address, 'Leblon')).toBe(true);
    expect(inNeighborhood(address, 'leblon')).toBe(true);
  });

  it('does not match a part of another name or another neighborhood', () => {
    expect(inNeighborhood(address, 'Lebl')).toBe(false);
    expect(inNeighborhood(address, 'Botafogo')).toBe(false);
  });

  it('only counts addresses of the city of Rio', () => {
    expect(inNeighborhood('Rua X, 12 - Leblon, Niterói - RJ', 'Leblon')).toBe(false);
  });

  it('searches "Freguesia (Jacarepaguá)" by the name before the parentheses', () => {
    expect(
      inNeighborhood('Rua Y, 3 - Freguesia, Rio de Janeiro - RJ', 'Freguesia (Jacarepaguá)'),
    ).toBe(true);
  });
});

describe('matchesText', () => {
  const ana = pro({ name: 'Ana Souza', tags: ['Cabelo'] });

  it('looks in the name, address, tags and service names', () => {
    expect(matchesText(ana, 'souza')).toBe(true);
    expect(matchesText(ana, 'botafogo')).toBe(true);
    expect(matchesText(ana, 'cabelo')).toBe(true);
    expect(matchesText(ana, 'maquiagem social')).toBe(true);
  });

  it('looks in every service, not only the first', () => {
    const two = pro({
      services: [
        { ...pro().services[0], name: 'Escova' },
        { ...pro().services[0], id: 's2', name: 'Corte feminino' },
      ],
    });
    expect(matchesText(two, 'escova')).toBe(true);
    expect(matchesText(two, 'corte feminino')).toBe(true);
  });

  it('is false for text that is nowhere', () => {
    expect(matchesText(ana, 'tatuagem')).toBe(false);
  });
});

describe('neighborhoodsWith', () => {
  it('lists only neighborhoods that have an address, with the short name', () => {
    const list = neighborhoodsWith([
      'Rua A, 1 - Botafogo, Rio de Janeiro - RJ',
      'Rua B, 2 - Freguesia, Rio de Janeiro - RJ',
    ]);
    expect(list).toContain('Botafogo');
    expect(list).toContain('Freguesia');
    expect(list).not.toContain('Freguesia (Jacarepaguá)');
    expect(list).not.toContain('Leblon');
  });
});

describe('countFilters', () => {
  it('counts each active filter once', () => {
    expect(countFilters(noFilters())).toBe(0);
    expect(
      countFilters(
        filters({
          tags: ['a', 'b'],
          minRating: 4,
          maxKm: 10,
          sort: 'rating',
          neighborhood: 'Leblon',
          date: new Date(),
        }),
      ),
    ).toBe(6);
  });
});

describe('toCard', () => {
  it('has no distance without the position of the user', () => {
    const card = toCard(pro(), null);
    expect(card.distance).toBeNull();
    expect(card.km).toBeNull();
  });

  it('measures the distance when both positions are known', () => {
    const card = toCard(pro(), { lat: -22.9068, lng: -43.1729 });
    expect(card.km).toBeGreaterThan(4);
    expect(card.km).toBeLessThan(7);
    expect(card.distance).toMatch(/km$/);
  });

  it('has no distance for a professional who goes to the client (no place on the map)', () => {
    const home = pro({ serviceMode: 'home', position: { lat: 0, lng: 0 } });
    expect(toCard(home, { lat: -22.9, lng: -43.1 }).km).toBeNull();
  });

  it('shows the profile photo when there is no gallery', () => {
    expect(toCard(pro(), null).photos).toEqual(['ana.jpg']);
    expect(toCard(pro({ gallery: ['a.jpg', 'b.jpg'] }), null).photos).toEqual(['a.jpg', 'b.jpg']);
  });

  it('starts from the cheapest price, rules included, or none without services', () => {
    const cheap = pro({
      services: [
        {
          ...pro().services[0],
          price: 100,
          priceRules: [{ days: [1], start: '08:00', end: '12:00', price: 70 }],
        },
        { ...pro().services[0], id: 's2', price: 90 },
      ],
    });
    expect(toCard(cheap, null).minPrice).toBe(70);
    expect(toCard(pro({ services: [] }), null).minPrice).toBeNull();
  });
});

describe('search', () => {
  const ana = pro({ name: 'Ana', rating: 4.5, tags: ['Maquiagem'] });
  const bia = pro({
    name: 'Bia',
    rating: 3,
    tags: ['Cabelo'],
    address: 'Rua B, 2 - Leblon, Rio de Janeiro - RJ',
    services: [{ ...pro().services[0], name: 'Escova', category: 'Cabelo', price: 60 }],
    position: { lat: -22.985, lng: -43.223 },
  });
  const cris = pro({ name: 'Cris', rating: 5, serviceMode: 'home', position: { lat: 0, lng: 0 } });
  const all = [ana, bia, cris];

  it('keeps the order of the catalog when there is nothing to filter or sort', () => {
    expect(names(search(all, '', noFilters(), null))).toEqual(['Ana', 'Bia', 'Cris']);
  });

  it('filters by text, ignoring accents and case', () => {
    expect(names(search(all, '  ESCOVA ', noFilters(), null))).toEqual(['Bia']);
    expect(names(search(all, 'nada disso', noFilters(), null))).toEqual([]);
  });

  it('filters by neighborhood, tag and minimum rating', () => {
    expect(names(search(all, '', filters({ neighborhood: 'Leblon' }), null))).toEqual(['Bia']);
    expect(names(search(all, '', filters({ tags: ['Cabelo'] }), null))).toEqual(['Bia']);
    expect(names(search(all, '', filters({ minRating: 4 }), null))).toEqual(['Ana', 'Cris']);
  });

  it('filters by a day the professional works', () => {
    // 2099-05-03 is a Sunday: the default hours are off on Sundays
    expect(search(all, '', filters({ date: new Date(2099, 4, 3) }), null)).toEqual([]);
    expect(search(all, '', filters({ date: new Date(2099, 4, 4) }), null)).toHaveLength(3);
  });

  it('filters by distance only when the position is known, and drops who has no place on the map', () => {
    const near = filters({ maxKm: 3 });
    // Without the position of the user the distance cannot be judged
    expect(search(all, '', near, null)).toHaveLength(3);
    const user = { lat: -22.9519, lng: -43.1837 };
    expect(names(search(all, '', near, user))).toEqual(['Ana']);
    // The maximum means "any distance"
    expect(search(all, '', filters({ maxKm: MAX_KM }), user)).toHaveLength(3);
  });

  it('sorts by price with who has no price last', () => {
    const none = pro({ name: 'Dani', services: [] });
    expect(names(search([ana, none, bia], '', filters({ sort: 'price-asc' }), null))).toEqual([
      'Bia',
      'Ana',
      'Dani',
    ]);
    expect(names(search([none, ana, bia], '', filters({ sort: 'price-desc' }), null))).toEqual([
      'Ana',
      'Bia',
      'Dani',
    ]);
  });

  it('sorts by rating and by distance', () => {
    expect(names(search(all, '', filters({ sort: 'rating' }), null))).toEqual([
      'Cris',
      'Ana',
      'Bia',
    ]);
    const user = { lat: -22.9519, lng: -43.1837 };
    expect(names(search(all, '', filters({ sort: 'distance' }), user))).toEqual([
      'Ana',
      'Bia',
      'Cris',
    ]);
  });

  it('does not change the list it receives', () => {
    const input = [ana, bia, cris];
    search(input, '', filters({ sort: 'rating' }), null);
    expect(names(input)).toEqual(['Ana', 'Bia', 'Cris']);
  });
});

describe('suggestions', () => {
  it('gives the best rated first, up to the count, without touching the list', () => {
    const list = [1, 5, 3, 4, 2, 4.5].map((rating) => pro({ name: `R${rating}`, rating }));
    expect(names(suggestions(list, null))).toEqual(['R5', 'R4.5', 'R4', 'R3', 'R2']);
    expect(names(list)[0]).toBe('R1');
  });
});
