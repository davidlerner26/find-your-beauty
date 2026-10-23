import { MatIconModule } from '@angular/material/icon';
import { Component, computed, input, output, signal } from '@angular/core';
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

  // Pull down to close: the sheet follows the finger, and goes away when it is pulled far enough
  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);
  protected readonly backdropOpacity = computed(() => Math.max(0, 1 - this.offset() / 400));
  private startX = 0;
  private startY = 0;
  private moved = false;
  private tracking = false;

  protected onDown(event: PointerEvent) {
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.moved = false;
    this.tracking = true;
  }

  protected onMove(event: PointerEvent) {
    if (!this.tracking) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    // A sideways move is the photos scrolling: not ours
    if (!this.dragging() && (Math.abs(dx) > Math.abs(dy) || dy < 6)) return;
    if (!this.dragging()) {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      this.dragging.set(true);
    }
    this.moved = true;
    this.offset.set(Math.max(0, dy));
  }

  protected onUp() {
    this.tracking = false;
    if (!this.dragging()) return;

    this.dragging.set(false);
    if (this.offset() > 120) {
      // Goes the rest of the way down, then closes
      this.offset.set(window.innerHeight);
      setTimeout(() => this.closed.emit(), 250);
    } else {
      this.offset.set(0);
    }
  }

  // The bar closes with a tap, but not at the end of a pull
  protected onHandleClick() {
    if (!this.moved) this.closed.emit();
  }

  protected onScroll(event: Event) {
    const strip = event.target as HTMLElement;
    this.slide.set(Math.round(strip.scrollLeft / strip.clientWidth));
  }
}
