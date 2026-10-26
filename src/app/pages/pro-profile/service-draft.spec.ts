import { Service } from '../../models/professional';
import {
  isRuleComplete,
  isServiceComplete,
  newRuleDraft,
  newServiceDraft,
  PriceRuleDraft,
  ServiceDraft,
  serviceNamesOf,
  setCategory,
  toggleRuleDay,
  toService,
  toServiceDraft,
} from './service-draft';

const saved: Service = {
  id: 's1',
  name: 'Maquiagem social',
  category: 'Maquiagem',
  price: 150.5,
  durationMinutes: 90,
  description: 'Pele e olhos',
  photos: ['a.jpg'],
  priceRules: [{ days: [6, 5], start: '18:00', end: '22:00', price: 200 }],
};

const complete = (overrides: Partial<ServiceDraft> = {}): ServiceDraft => ({
  ...toServiceDraft(saved),
  ...overrides,
});

describe('toServiceDraft', () => {
  it('writes price and duration the way the fields show them', () => {
    const draft = toServiceDraft(saved);
    expect(draft.price).toBe('150,50');
    expect(draft.duration).toBe('1:30');
    expect(draft.priceRules[0].price).toBe('200,00');
    expect(draft.priceRules[0].days).toEqual([6, 5]);
  });

  it('gives empty lists to a service without photos or rules, and drops the old `image` field', () => {
    const { photos, priceRules, ...bare } = saved;
    void photos;
    void priceRules;
    const draft = toServiceDraft({ ...bare, image: 'old.jpg' } as Service & { image?: string });

    expect(draft.photos).toEqual([]);
    expect(draft.priceRules).toEqual([]);
    expect('image' in draft).toBe(false);
  });

  it('copies the lists, so editing the draft never touches the saved profile', () => {
    const draft = toServiceDraft(saved);
    draft.photos.push('b.jpg');
    draft.priceRules[0].days.push(0);
    expect(saved.photos).toEqual(['a.jpg']);
    expect(saved.priceRules![0].days).toEqual([6, 5]);
  });
});

describe('toService', () => {
  it('round trips a saved service (rules without ids, days in order)', () => {
    expect(toService(toServiceDraft(saved))).toEqual({
      ...saved,
      priceRules: [{ days: [5, 6], start: '18:00', end: '22:00', price: 200 }],
    });
  });

  it('leaves out empty photos and rules, and trims the texts', () => {
    const service = toService(
      complete({ photos: [], priceRules: [], name: '  Maquiagem social ', description: '  oi ' }),
    );
    expect('photos' in service).toBe(false);
    expect('priceRules' in service).toBe(false);
    expect(service.name).toBe('Maquiagem social');
    expect(service.description).toBe('oi');
  });

  it('turns the typed text into numbers', () => {
    const service = toService(complete({ price: '1.234,50', duration: '2:15' }));
    expect(service.price).toBe(1234.5);
    expect(service.durationMinutes).toBe(135);
  });
});

describe('isRuleComplete', () => {
  const rule = (overrides: Partial<PriceRuleDraft> = {}): PriceRuleDraft => ({
    ...newRuleDraft(),
    days: [5],
    start: '18:00',
    end: '22:00',
    price: '200,00',
    ...overrides,
  });

  it('needs days, a start before the end, and a price', () => {
    expect(isRuleComplete(rule())).toBe(true);
    expect(isRuleComplete(rule({ days: [] }))).toBe(false);
    expect(isRuleComplete(rule({ start: '' }))).toBe(false);
    expect(isRuleComplete(rule({ end: '' }))).toBe(false);
    expect(isRuleComplete(rule({ end: '18:00' }))).toBe(false);
    expect(isRuleComplete(rule({ end: '17:00' }))).toBe(false);
    expect(isRuleComplete(rule({ price: '0,00' }))).toBe(false);
  });

  it('accepts the whole day, which ends at 24:00', () => {
    expect(isRuleComplete(rule({ start: '00:00', end: '24:00' }))).toBe(true);
  });
});

describe('isServiceComplete', () => {
  it('is true for a filled in service, whose description is optional', () => {
    expect(isServiceComplete(complete())).toBe(true);
    expect(isServiceComplete(complete({ description: '' }))).toBe(true);
  });

  it('needs a name, a category, a price and a duration', () => {
    expect(isServiceComplete(complete({ name: '   ' }))).toBe(false);
    expect(isServiceComplete(complete({ category: '' }))).toBe(false);
    expect(isServiceComplete(complete({ price: '0,00' }))).toBe(false);
    expect(isServiceComplete(complete({ duration: '0:00' }))).toBe(false);
    expect(isServiceComplete(complete({ duration: '' }))).toBe(false);
  });

  it('is false when one of its price rules is not finished', () => {
    expect(isServiceComplete(complete({ priceRules: [newRuleDraft()] }))).toBe(false);
  });

  it('a new service is not complete and has an id of its own', () => {
    expect(isServiceComplete(newServiceDraft())).toBe(false);
    expect(newServiceDraft().id).not.toBe(newServiceDraft().id);
  });
});

describe('serviceNamesOf / setCategory', () => {
  it('has no names before a category is chosen', () => {
    expect(serviceNamesOf({ category: '', name: '' })).toEqual([]);
  });

  it('lists the names of the category, keeping a saved name that is no longer in the list', () => {
    expect(serviceNamesOf({ category: 'Cabelo', name: '' })).toContain('Escova');
    expect(
      serviceNamesOf({ category: 'Cabelo', name: 'Escova' }).filter((n) => n === 'Escova'),
    ).toHaveLength(1);
    expect(serviceNamesOf({ category: 'Cabelo', name: 'Nome antigo' })[0]).toBe('Nome antigo');
  });

  it('changing the category clears a name that does not belong to it', () => {
    const service = complete({ name: 'Maquiagem social', category: 'Maquiagem' });
    setCategory(service, 'Cabelo');
    expect(service.category).toBe('Cabelo');
    expect(service.name).toBe('');
  });

  it('keeps a name that exists in the new category', () => {
    const service = complete({ name: 'Escova', category: 'Cabelo' });
    setCategory(service, 'Cabelo');
    expect(service.name).toBe('Escova');
  });
});

describe('toggleRuleDay', () => {
  it('adds and removes a day', () => {
    const rule = newRuleDraft();
    toggleRuleDay(rule, 5);
    toggleRuleDay(rule, 0);
    expect(rule.days).toEqual([5, 0]);
    toggleRuleDay(rule, 5);
    expect(rule.days).toEqual([0]);
  });
});
