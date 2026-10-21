import { PriceRule, Service } from '../models/professional';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// The price of a service for an appointment that starts at `time` ("HH:mm") on `date`
export const priceAt = (service: Service, date: Date, time: string) =>
  (service.priceRules ?? []).find(
    (rule) => rule.days.includes(date.getDay()) && time >= rule.start && time < rule.end,
  )?.price ?? service.price;

// The cheapest the service can cost: "a partir de"
export const lowestPrice = (service: Service) =>
  Math.min(service.price, ...(service.priceRules ?? []).map((rule) => rule.price));

// "Sex e Sáb, 18:00 às 22:00"
export const ruleLabel = (rule: PriceRule) => {
  const days = [...rule.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => WEEKDAYS[day]);
  const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} e ${days[days.length - 1]}` : days[0];
  const from = rule.start === '00:00';
  const to = rule.end === '24:00';
  if (from && to) return `${list}, o dia todo`;
  if (from) return `${list}, até ${rule.end}`;
  if (to) return `${list}, a partir das ${rule.start}`;
  return `${list}, ${rule.start} às ${rule.end}`;
};
