// The order of "Profissionais próximos" on the home: first the professionals that have an address, the closest first, then the
// ones that only go to the client's home, from the best rating to the worst. Nobody is left out: the list is not cut.
type Nearby = { located: boolean; distanceKm: number | null; rating: number };

// A professional without a distance (the position of the client is not known) goes after the ones that have it, in the order
// she came in
const byDistance = (a: Nearby, b: Nearby) => {
  if (a.distanceKm === null && b.distanceKm === null) return 0;
  if (a.distanceKm === null) return 1;
  if (b.distanceKm === null) return -1;
  return a.distanceKm - b.distanceKm;
};

export const nearbyOrder = <T extends Nearby>(list: T[]) => [
  ...list.filter((item) => item.located).sort(byDistance),
  ...list.filter((item) => !item.located).sort((a, b) => b.rating - a.rating),
];
