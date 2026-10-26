import { Location } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CardForm } from '../../components/card-form/card-form';
import { Spinner } from '../../components/spinner/spinner';
import { Cards } from '../../services/cards';
import { Feedback } from '../../services/feedback';
import { SavedCard } from '../../services/payments.types';
import { log } from '../../utils/log';
import { cardBrandLabel } from '../../utils/payment-errors';

// The cards of the client. Opened from the payment screen (`escolher`), tapping a card chooses it and goes back.
@Component({
  selector: 'app-cards',
  imports: [CardForm, MatIconModule, Spinner],
  templateUrl: './cards.html',
  styleUrl: './cards.scss',
})
export class CardsPage {
  private readonly location = inject(Location);
  private readonly feedback = inject(Feedback);
  protected readonly cards = inject(Cards);

  // Set by the address of the payment screen: ?escolher=1
  readonly escolher = input<string>();

  protected readonly adding = signal(false);
  protected readonly removing = signal<string | null>(null);
  protected readonly brandLabel = cardBrandLabel;

  constructor() {
    void this.cards.load();
  }

  protected goBack() {
    this.location.back();
  }

  protected choose(card: SavedCard) {
    this.cards.select(card.id);
    if (this.escolher()) this.location.back();
  }

  // The card was saved: the list is read again, and the new one (the latest) is the chosen one
  protected async onSaved() {
    this.adding.set(false);
    await this.cards.load();
    const latest = this.cards.list()[0];
    if (latest) this.cards.select(latest.id);
    this.feedback.show($localize`Cartão salvo`);
    if (this.escolher()) this.location.back();
  }

  protected async remove(card: SavedCard) {
    const brand = cardBrandLabel(card.brand);
    if (!confirm($localize`Remover o cartão ${brand}:brand: final ${card.last4}:last4:?`)) return;
    this.removing.set(card.id);
    try {
      await this.cards.remove(card.id);
      this.feedback.show($localize`Cartão removido`);
    } catch (error) {
      log.error('Failed to remove the card', error);
      this.feedback.show($localize`Não foi possível remover o cartão. Tente novamente.`);
    } finally {
      this.removing.set(null);
    }
  }
}
