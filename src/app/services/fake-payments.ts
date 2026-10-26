import { CardFormHandle, Hold, HoldRequest, PaymentsApi, SavedCard } from './payments.types';

const KEY = 'fake-cards';

// Payments for the end to end tests: the cards live in the browser and nothing is charged. A card that ends in 0002
// is refused, like the test card of Stripe that always declines.
export class FakePayments implements PaymentsApi {
  readonly available = true;

  private read(): SavedCard[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private write(cards: SavedCard[]) {
    localStorage.setItem(KEY, JSON.stringify(cards));
  }

  async cards() {
    return this.read();
  }

  async removeCard(id: string) {
    this.write(this.read().filter((card) => card.id !== id));
  }

  async cardForm(): Promise<CardFormHandle> {
    let input: HTMLInputElement;
    return {
      mount: (element) => {
        element.innerHTML = '';
        input = document.createElement('input');
        input.setAttribute('aria-label', 'Número do cartão (teste)');
        input.placeholder = 'Número do cartão (teste)';
        input.inputMode = 'numeric';
        element.appendChild(input);
      },
      save: async () => {
        const digits = input.value.replace(/\D/g, '');
        if (digits.length < 12) return 'Número do cartão inválido.';
        this.write([
          {
            id: `pm_fake_${crypto.randomUUID()}`,
            brand: 'visa',
            last4: digits.slice(-4),
            expMonth: 12,
            expYear: 2099,
          },
          ...this.read(),
        ]);
        return null;
      },
    };
  }

  async hold(request: HoldRequest): Promise<Hold> {
    const card = this.read().find((saved) => saved.id === request.cardId);
    if (!card || card.last4 === '0002') return { status: 'failed', code: 'card_declined' };
    return { status: 'authorized', paymentIntentId: `pi_fake_${crypto.randomUUID()}`, total: 0 };
  }

  async release() {
    // Nothing was held
  }
}
