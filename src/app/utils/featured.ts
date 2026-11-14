// The "Profissionais em destaque" of the home: the professionals with an active Pro subscription, in a shuffled order that
// changes at every visit, so every subscriber gets about the same exposure. Without subscribers there is nothing to show.

// A small random generator that always gives the same sequence for the same seed (so the order can be tested)
const generator = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const featuredPro = <T extends { pro?: boolean }>(list: T[], seed: number, max = 8) => {
  const subscribers = list.filter((item) => item.pro === true);
  const random = generator(seed);
  for (let i = subscribers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [subscribers[i], subscribers[j]] = [subscribers[j], subscribers[i]];
  }
  return subscribers.slice(0, max);
};

// A seed for a visit: it is taken once, so the order does not change while the page is open
export const newSeed = () => Math.floor(Math.random() * 2 ** 31);
