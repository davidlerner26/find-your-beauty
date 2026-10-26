export type PriceRule = { days: number[]; start: string; end: string; price: number };
export type Service = {
  id: string;
  price: number;
  durationMinutes: number;
  priceRules?: PriceRule[];
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The price of a service for an appointment that starts at `startsAt`, counted in Brazil's time
// (the same rule as the app: the first price rule that matches the day and the start time wins)
export const priceAt = (service: Service, startsAt: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(startsAt);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = WEEKDAYS.indexOf(part('weekday'));
  const time = `${part('hour')}:${part('minute')}`;

  return (
    (service.priceRules ?? []).find(
      (rule) => rule.days.includes(weekday) && time >= rule.start && time < rule.end,
    )?.price ?? service.price
  );
};

// What the client owes for these services of the professional (by id) at that start time, in reais.
// null when one of the services is not in the professional's catalog: the request can't be trusted.
export const totalFor = (catalog: Service[], serviceIds: string[], startsAt: Date) => {
  if (!serviceIds.length) return null;
  const chosen = serviceIds.map((id) => catalog.find((service) => service.id === id));
  if (!chosen.every(Boolean)) return null;

  const total = (chosen as Service[]).reduce((sum, service) => sum + priceAt(service, startsAt), 0);
  return Math.round(total * 100) / 100;
};
