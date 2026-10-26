import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PAYMENTS } from '../../services/payments';
import { CardFormHandle } from '../../services/payments.types';
import { log } from '../../utils/log';

// The form to save a card. With Stripe it is their own form, shown inside this one: the number, the date and the
// code are typed there and never reach this app. This only shows it and asks it to save.
@Component({
  selector: 'app-card-form',
  templateUrl: './card-form.html',
  styleUrl: './card-form.scss',
})
export class CardForm {
  private readonly payments = inject(PAYMENTS);
  private readonly mountPoint = viewChild.required<ElementRef<HTMLElement>>('mount');
  private form: CardFormHandle | null = null;

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly state = signal<'loading' | 'ready' | 'saving' | 'unavailable'>('loading');
  protected readonly error = signal('');

  constructor() {
    afterNextRender(async () => {
      try {
        this.form = await this.payments.cardForm();
        this.form.mount(this.mountPoint().nativeElement);
        this.state.set('ready');
      } catch (error) {
        log.error('Failed to open the card form', error);
        this.state.set('unavailable');
      }
    });
  }

  protected async save() {
    if (!this.form || this.state() !== 'ready') return;
    this.error.set('');
    this.state.set('saving');
    try {
      const problem = await this.form.save();
      if (problem) {
        this.error.set(problem);
        this.state.set('ready');
        return;
      }
      this.saved.emit();
    } catch (error) {
      log.error('Failed to save the card', error);
      this.error.set($localize`Não foi possível salvar o cartão. Tente novamente.`);
      this.state.set('ready');
    }
  }
}
