import { nearbyOrder } from './nearby';

const at = (id: string, distanceKm: number | null, rating = 4) => ({
  id,
  located: true,
  distanceKm,
  rating,
});
const home = (id: string, rating: number) => ({ id, located: false, distanceKm: null, rating });
const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe('nearbyOrder', () => {
  it('puts the ones with an address first, the closest first', () => {
    expect(ids(nearbyOrder([at('far', 9), at('near', 1), at('mid', 4)]))).toEqual([
      'near',
      'mid',
      'far',
    ]);
  });

  it('puts the ones that only go to the home after them, from the best rating to the worst', () => {
    const list = [home('h3', 3), at('a', 3), home('h5', 5), at('b', 1), home('h4', 4)];

    expect(ids(nearbyOrder(list))).toEqual(['b', 'a', 'h5', 'h4', 'h3']);
  });

  it('does not cut the list: everybody is in it', () => {
    const many = Array.from({ length: 12 }, (_, i) => (i % 2 ? home(`h${i}`, i) : at(`a${i}`, i)));

    expect(nearbyOrder(many)).toHaveLength(12);
  });

  it('keeps who has no distance (the client has not shared the position) after who has one, in the order they came', () => {
    const list = [at('x', null), at('y', 3), at('z', null), at('w', 1)];

    expect(ids(nearbyOrder(list))).toEqual(['w', 'y', 'x', 'z']);
  });

  it('is empty for nobody, and does not change the list it was given', () => {
    expect(nearbyOrder([])).toEqual([]);
    const list = [home('h', 1), at('a', 1)];

    nearbyOrder(list);

    expect(ids(list)).toEqual(['h', 'a']);
  });
});
