import { FakePayments } from './fake-payments';

const typeAndSave = async (payments: FakePayments, number: string) => {
  const form = await payments.cardForm();
  const mount = document.createElement('div');
  form.mount(mount);
  mount.querySelector('input')!.value = number;
  return form.save();
};

beforeEach(() => localStorage.clear());

describe('FakePayments', () => {
  it('saves a card from its number and keeps only the last 4 digits', async () => {
    const payments = new FakePayments();
    expect(await typeAndSave(payments, '4242 4242 4242 4242')).toBeNull();

    const [card] = await payments.cards();
    expect(card).toMatchObject({ brand: 'visa', last4: '4242' });
    expect(JSON.stringify(card)).not.toContain('4242424242424242');
  });

  it('refuses a number that is too short', async () => {
    const payments = new FakePayments();
    expect(await typeAndSave(payments, '1234')).not.toBeNull();
    expect(await payments.cards()).toEqual([]);
  });

  it('lists the latest card first and removes one', async () => {
    const payments = new FakePayments();
    await typeAndSave(payments, '4000000000001111');
    await typeAndSave(payments, '4242424242424242');

    const cards = await payments.cards();
    expect(cards.map((card) => card.last4)).toEqual(['4242', '1111']);
    await payments.removeCard(cards[0].id);
    expect((await payments.cards()).map((card) => card.last4)).toEqual(['1111']);
  });

  it('holds on a good card and is declined on the card that always declines', async () => {
    const payments = new FakePayments();
    await typeAndSave(payments, '4000000000000002');
    await typeAndSave(payments, '4242424242424242');
    const [good, declined] = await payments.cards();
    const request = { professionalId: 'p', serviceIds: ['s'], startsAt: new Date() };

    expect((await payments.hold({ ...request, cardId: good.id })).status).toBe('authorized');
    expect(await payments.hold({ ...request, cardId: declined.id })).toEqual({
      status: 'failed',
      code: 'card_declined',
    });
    expect(await payments.hold({ ...request, cardId: 'pm_unknown' })).toEqual({
      status: 'failed',
      code: 'card_declined',
    });
  });
});
