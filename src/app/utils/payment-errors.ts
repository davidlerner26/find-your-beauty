// What to tell the client when the card did not go through. `code` is the one that Stripe gives.
export const paymentErrorMessage = (code: string) => {
  switch (code) {
    case 'insufficient_funds':
      return $localize`O cartão não tem saldo suficiente. Tente outro cartão.`;
    case 'expired_card':
      return $localize`O cartão está vencido. Tente outro cartão.`;
    case 'incorrect_cvc':
    case 'incorrect_number':
    case 'invalid_cvc':
    case 'invalid_number':
      return $localize`Os dados do cartão estão incorretos. Confira ou tente outro cartão.`;
    case 'authentication_failed':
    case 'authentication_required':
      return $localize`O banco não confirmou o cartão. Tente de novo ou use outro cartão.`;
    default:
      return $localize`O cartão não foi aprovado. Tente outro cartão.`;
  }
};

// "visa" -> "Visa", "amex" -> "American Express"
export const cardBrandLabel = (brand: string) =>
  ({
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    elo: 'Elo',
    diners: 'Diners Club',
    discover: 'Discover',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  })[brand] ?? $localize`Cartão`;
