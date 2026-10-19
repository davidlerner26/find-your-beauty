import { Component, model, input, signal } from '@angular/core';
import { ImagePosition } from '../../models/professional';
import { FocusPipe } from '../../utils/focus.pipe';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

// Drag the photo inside the frame to choose which part of it shows when it is cropped
@Component({
  selector: 'app-photo-positioner',
  imports: [FocusPipe],
  templateUrl: './photo-positioner.html',
  styleUrl: './photo-positioner.scss',
})
export class PhotoPositioner {
  readonly src = input.required<string>();
  // profile: round photo used in messages. cover: wide photo used on cards and at the top of the page.
  readonly variant = input<'profile' | 'cover'>('cover');
  readonly position = model<ImagePosition>({ x: 50, y: 50 });

  protected readonly dragging = signal(false);
  private last: { x: number; y: number } | null = null;

  protected onDown(event: PointerEvent) {
    this.last = { x: event.clientX, y: event.clientY };
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onMove(event: PointerEvent, image: HTMLImageElement) {
    if (!this.last) return;

    const dx = event.clientX - this.last.x;
    const dy = event.clientY - this.last.y;
    this.last = { x: event.clientX, y: event.clientY };

    // How much of the photo sticks out of the frame is how far it can be moved
    const frame = event.currentTarget as HTMLElement;
    const scale = Math.max(
      frame.clientWidth / image.naturalWidth,
      frame.clientHeight / image.naturalHeight,
    );
    const overflowX = image.naturalWidth * scale - frame.clientWidth;
    const overflowY = image.naturalHeight * scale - frame.clientHeight;

    const { x, y } = this.position();
    this.position.set({
      // Dragging the photo to the right shows more of its left side, hence the minus
      x: overflowX > 1 ? clamp(x - (dx / overflowX) * 100) : x,
      y: overflowY > 1 ? clamp(y - (dy / overflowY) * 100) : y,
    });
  }

  protected onUp() {
    this.last = null;
    this.dragging.set(false);
  }

  protected onKey(event: KeyboardEvent) {
    const step = 5;
    const { x, y } = this.position();
    const moves: Record<string, ImagePosition> = {
      ArrowLeft: { x: clamp(x + step), y },
      ArrowRight: { x: clamp(x - step), y },
      ArrowUp: { x, y: clamp(y + step) },
      ArrowDown: { x, y: clamp(y - step) },
    };
    if (moves[event.key]) {
      event.preventDefault();
      this.position.set(moves[event.key]);
    }
  }

  protected reset() {
    this.position.set({ x: 50, y: 50 });
  }
}
