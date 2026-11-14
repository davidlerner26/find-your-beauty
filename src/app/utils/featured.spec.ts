import { featuredPro } from './featured';

const person = (id: string, pro?: boolean) => ({ id, pro });
const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe('featuredPro', () => {
  const all = [
    person('a', true),
    person('b', false),
    person('c', true),
    person('d'),
    person('e', true),
    person('f', true),
  ];

  it('has only the subscribers', () => {
    expect(ids(featuredPro(all, 1)).sort()).toEqual(['a', 'c', 'e', 'f']);
  });

  it('is empty when there is no subscriber: the section is not shown', () => {
    expect(featuredPro([person('b', false), person('d')], 1)).toEqual([]);
    expect(featuredPro([], 1)).toEqual([]);
  });

  it('keeps the order for the same seed, so it does not move while the page is open', () => {
    expect(ids(featuredPro(all, 42))).toEqual(ids(featuredPro(all, 42)));
  });

  it('changes the order with the seed (a new visit), giving every subscriber a turn at the first place', () => {
    const firsts = new Set<string>();
    for (let seed = 0; seed < 200; seed++) firsts.add(featuredPro(all, seed)[0].id);

    expect([...firsts].sort()).toEqual(['a', 'c', 'e', 'f']);
  });

  it('shows at most `max` cards', () => {
    const many = Array.from({ length: 20 }, (_, i) => person(`p${i}`, true));

    expect(featuredPro(many, 7)).toHaveLength(8);
    expect(featuredPro(many, 7, 3)).toHaveLength(3);
  });

  it('does not change the list it was given', () => {
    const before = ids(all);

    featuredPro(all, 9);

    expect(ids(all)).toEqual(before);
  });
});
