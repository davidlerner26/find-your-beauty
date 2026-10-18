import { Component, computed, input } from '@angular/core';
import { Location } from '@angular/common';
import { formatDuration, MAKEUP_ARTISTS } from '../../data/makeup-artists';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  readonly id = input.required<string>();
  readonly servicos = input<string>('');
  readonly data = input<string>('');
  readonly horario = input<string>('');

  protected readonly artist = computed(() =>
    MAKEUP_ARTISTS.find((artist) => artist.id === this.id()),
  );

  protected readonly services = computed(() => {
    const ids = this.servicos().split(',');
    return this.artist()?.services.filter((service) => ids.includes(service.id)) ?? [];
  });

  protected readonly total = computed(() =>
    this.services().reduce((sum, service) => sum + service.price, 0),
  );

  protected readonly duration = computed(() =>
    formatDuration(this.services().reduce((sum, service) => sum + service.durationMinutes, 0)),
  );

  protected readonly dateLabel = computed(() => {
    const [year, month, day] = this.data().split('-').map(Number);
    if (!year) return '-';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
      new Date(year, month - 1, day),
    );
  });

  // Sample payment method until payments are integrated
  protected readonly card = { holder: 'Samantha Martin', number: '3124325***' };

  constructor(private readonly location: Location) {}

  protected goBack() {
    this.location.back();
  }
}
