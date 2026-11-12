import {
  COMBO_CATEGORY,
  comboName,
  comboParts,
  Service,
  ServiceCategory,
  SERVICE_NAMES,
} from '../../models/professional';
import { durationToText, parseDuration } from '../../utils/duration';
import { moneyToText, parseMoney } from '../../utils/money';

// A service being edited: nothing is pre-filled, so the fields can be empty
export type PriceRuleDraft = {
  id: string;
  days: number[];
  start: string;
  end: string;
  price: string;
};

export type ServiceDraft = Omit<
  Service,
  'category' | 'price' | 'durationMinutes' | 'priceRules' | 'photos'
> & {
  // Photos of this service (the card shows them as a gallery)
  photos: string[];
  // Other prices, by day and time (each price typed like the main one)
  priceRules: PriceRuleDraft[];
  category: ServiceCategory | '';
  // Typed like a money field, e.g. "15,50"
  price: string;
  // Typed as H:MM, e.g. "1:30"
  duration: string;
};

const newId = () => Math.random().toString(36).slice(2, 10);

export const newServiceDraft = (): ServiceDraft => ({
  id: newId(),
  name: '',
  category: '',
  price: '0,00',
  priceRules: [],
  photos: [],
  duration: '0:00',
  description: '',
});

export const newRuleDraft = (): PriceRuleDraft => ({
  id: newId(),
  days: [],
  start: '',
  end: '',
  price: '0,00',
});

// A saved service as the form edits it
export const toServiceDraft = ({
  durationMinutes,
  price,
  priceRules,
  photos,
  image,
  ...service
}: Service & { image?: string }): ServiceDraft => {
  void image;
  return {
    ...service,
    photos: [...(photos ?? [])],
    priceRules: (priceRules ?? []).map((rule) => ({
      id: newId(),
      days: [...rule.days],
      start: rule.start,
      end: rule.end,
      price: moneyToText(rule.price),
    })),
    price: moneyToText(price),
    duration: durationToText(durationMinutes),
  };
};

// A price rule needs days, a start before the end, and a price
export const isRuleComplete = (rule: PriceRuleDraft) =>
  rule.days.length > 0 &&
  !!rule.start &&
  !!rule.end &&
  rule.start < rule.end &&
  parseMoney(rule.price) > 0;

// A service has a name; a combo has both halves
const hasName = (service: ServiceDraft) =>
  service.category === COMBO_CATEGORY
    ? comboParts(service.name).every(Boolean)
    : !!service.name.trim();

// Description is optional, everything else is required
export const isServiceComplete = (service: ServiceDraft) =>
  hasName(service) &&
  !!service.category &&
  parseMoney(service.price) > 0 &&
  !!parseDuration(service.duration) &&
  service.priceRules.every(isRuleComplete);

// A filled in draft as it is saved. Call it only for complete drafts.
export const toService = ({
  duration,
  price,
  priceRules,
  photos,
  ...service
}: ServiceDraft): Service => ({
  ...service,
  ...(photos.length ? { photos } : {}),
  price: parseMoney(price),
  ...(priceRules.length
    ? {
        priceRules: priceRules.map(({ id, price: rulePrice, ...rule }) => {
          void id;
          return { ...rule, days: [...rule.days].sort(), price: parseMoney(rulePrice) };
        }),
      }
    : {}),
  durationMinutes: parseDuration(duration)!,
  category: service.category as ServiceCategory,
  name: service.name.trim(),
  description: service.description.trim(),
});

// The names of the chosen category (a name saved before this list existed is kept as an option)
export const serviceNamesOf = (service: Pick<ServiceDraft, 'category' | 'name'>) => {
  if (!service.category || service.category === COMBO_CATEGORY) return [];
  const names = SERVICE_NAMES[service.category];
  return service.name && !names.includes(service.name) ? [service.name, ...names] : names;
};

// Changing the category clears a name that doesn't belong to it
export const setCategory = (service: ServiceDraft, category: ServiceCategory) => {
  const before = service.category;
  service.category = category;
  if (category === COMBO_CATEGORY) {
    // Coming from makeup or hair, what was chosen stays as that half of the combo
    if (before !== COMBO_CATEGORY) {
      const kept = SERVICE_NAMES.Maquiagem.includes(service.name)
        ? comboName(service.name, '')
        : SERVICE_NAMES.Cabelo.includes(service.name)
          ? comboName('', service.name)
          : '';
      service.name = kept;
    }
  } else if (!SERVICE_NAMES[category].includes(service.name)) service.name = '';
};

// One half of a combo is chosen: the name has both
export const setComboPart = (service: ServiceDraft, part: 'makeup' | 'hair', value: string) => {
  const [makeup, hair] = comboParts(service.name);
  service.name = part === 'makeup' ? comboName(value, hair) : comboName(makeup, value);
};

export const toggleRuleDay = (rule: PriceRuleDraft, day: number) => {
  rule.days = rule.days.includes(day) ? rule.days.filter((d) => d !== day) : [...rule.days, day];
};
