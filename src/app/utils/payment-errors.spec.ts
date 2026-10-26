import { cardBrandLabel, paymentErrorMessage } from './payment-errors';

describe('paymentErrorMessage', () => {
  it('says something specific for the reasons the client can act on', () => {
    expect(paymentErrorMessage('insufficient_funds')).toContain('saldo');
    expect(paymentErrorMessage('expired_card')).toContain('vencido');
    expect(paymentErrorMessage('incorrect_cvc')).toContain('incorretos');
    expect(paymentErrorMessage('authentication_failed')).toContain('banco');
  });

  it('has a general message for every other reason, and never shows the code', () => {
    const general = paymentErrorMessage('card_declined');
    expect(paymentErrorMessage('processing_error')).toBe(general);
    expect(paymentErrorMessage('something_new')).toBe(general);
    expect(general).not.toContain('card_declined');
  });

  it('puts the same wrong-data message on every wrong-data reason', () => {
    const wrong = paymentErrorMessage('incorrect_number');
    for (const code of ['incorrect_cvc', 'invalid_cvc', 'invalid_number']) {
      expect(paymentErrorMessage(code)).toBe(wrong);
    }
  });
});

describe('cardBrandLabel', () => {
  it('names the brands, and has a word for one it does not know', () => {
    expect(cardBrandLabel('visa')).toBe('Visa');
    expect(cardBrandLabel('amex')).toBe('American Express');
    expect(cardBrandLabel('mastercard')).toBe('Mastercard');
    expect(cardBrandLabel('unknown-brand')).toBe('Cartão');
  });
});
