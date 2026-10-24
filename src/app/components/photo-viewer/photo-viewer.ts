import { Component, HostListener, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// Photos in full screen: arrows, keys and swipe go to the next one
@Component({
  selector: 'app-photo-viewer',
  imports: [MatIconModule],
  templateUrl: './photo-viewer.html',
  styleUrl: './photo-viewer.scss',
})
export class PhotoViewer {
  readonly photos = input.required<string[]>();
  readonly start = input(0);
  readonly alt = input('');
  readonly closed = output<void>();

  protected readonly index = signal<number | null>(null);
  private touchX = 0;

  protected get current() {
    return this.index() ?? this.start();
  }

  protected go(step: number) {
    const total = this.photos().length;
    this.index.set((this.current + step + total) % total);
  }

  protected onTouchStart(event: TouchEvent) {
    this.touchX = event.changedTouches[0].clientX;
  }

  protected onTouchEnd(event: TouchEvent) {
    const distance = event.changedTouches[0].clientX - this.touchX;
    if (Math.abs(distance) > 50 && this.photos().length > 1) this.go(distance < 0 ? 1 : -1);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') this.closed.emit();
    else if (event.key === 'ArrowRight' && this.photos().length > 1) this.go(1);
    else if (event.key === 'ArrowLeft' && this.photos().length > 1) this.go(-1);
  }
}
