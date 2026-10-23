import { MatIconModule } from '@angular/material/icon';
import { Component, input, output, signal } from '@angular/core';
import { formatDuration, Service } from '../../models/professional';
import { PricePipe } from '../../utils/price.pipe';
import { ruleLabel } from '../../utils/pricing';

// The screen of a service: a sheet over the page with the photos (swipe sideways, with slide dots),
// the price, the duration and the whole description. Opened by "Ler mais" in the card of the service.
@Component({
  selector: 'app-service-sheet',
  imports: [MatIconModule, PricePipe],
  templateUrl: './service-sheet.html',
  styleUrl: './service-sheet.scss',
})
export class ServiceSheet {
  readonly service = input.required<Service>();
  // The service is already in the booking
  readonly selected = input(false);

  readonly toggle = output<void>();
  readonly closed = output<void>();

  protected readonly slide = signal(0);
  protected readonly formatDuration = formatDuration;
  protected readonly ruleLabel = ruleLabel;

  protected onScroll(event: Event) {
    const strip = event.target as HTMLElement;
    this.slide.set(Math.round(strip.scrollLeft / strip.clientWidth));
  }
}
