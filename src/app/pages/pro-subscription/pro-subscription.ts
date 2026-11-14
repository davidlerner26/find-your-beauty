import { Location } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Spinner } from '../../components/spinner/spinner';
import { Auth } from '../../services/auth';
import { Feedback } from '../../services/feedback';
import { ProSubscription } from '../../services/pro-subscription';
import { Professionals } from '../../services/professionals';
import { isPro } from '../../models/professional';
import { INTL_LOCALE } from '../../utils/locale';
import { log } from '../../utils/log';
import { planState, ProStatus } from '../../utils/pro-plan';

// The Pro subscription of the professional: what it gives, the state of the plan, and the buttons that take to the pages
// of Stripe (to subscribe, and to change the card or cancel). See docs/assinatura-pro.md.
@Component({
  selector: 'app-pro-subscription',
  imports: [MatIconModule, Spinner],
  templateUrl: './pro-subscription.html',
  styleUrl: './pro-subscription.scss',
})
export class ProSubscriptionPage {
  private readonly auth = inject(Auth);
  private readonly feedback = inject(Feedback);
  private readonly location = inject(Location);
  private readonly professionals = inject(Professionals);
  private readonly subscription = inject(ProSubscription);

  // Coming back from the page of Stripe (?assinatura=ok): the payment was made, the webhook is still on its way
  readonly assinatura = input<string>();

  protected readonly status = signal<ProStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly state = computed(() => planState(this.status()));
  protected readonly justPaid = computed(() => this.assinatura() === 'ok');

  // The profile follows the database: when the webhook turns Pro on, this is true right away
  private readonly livePro = computed(() => {
    const uid = this.auth.user()?.uid;
    const profile = uid ? this.professionals.byId(uid) : undefined;
    return profile ? isPro(profile) : false;
  });

  // Waiting for the webhook after paying: not Pro yet according to the profile
  protected readonly activating = computed(() => this.justPaid() && !this.livePro());

  protected readonly endDate = computed(() => {
    const status = this.status();
    if (!status?.subscribed || status.periodEndMillis === null) return '';
    return new Date(status.periodEndMillis).toLocaleDateString(INTL_LOCALE, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  constructor() {
    // The details (end of the period, cancelled or not) are private: they come from the function. They are read again
    // when the profile turns Pro on or off.
    effect(() => {
      this.livePro();
      void this.load();
    });
  }

  private async load() {
    try {
      this.status.set(await this.subscription.status());
    } catch (error) {
      log.error('Failed to read the subscription', error);
      this.feedback.show($localize`Não foi possível carregar a assinatura. Tente de novo.`);
    } finally {
      this.loading.set(false);
    }
  }

  protected subscribe() {
    return this.goTo(() => this.subscription.checkoutUrl());
  }

  protected manage() {
    return this.goTo(() => this.subscription.portalUrl());
  }

  // Takes the professional to a page of Stripe
  private async goTo(address: () => Promise<string>) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      window.location.assign(await address());
    } catch (error) {
      log.error('Failed to open the page of Stripe', error);
      this.feedback.show($localize`Não foi possível abrir a página de pagamento. Tente de novo.`);
      this.busy.set(false);
    }
  }

  protected goBack() {
    this.location.back();
  }
}
