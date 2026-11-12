import { computed, Injectable, signal } from '@angular/core';

export type FeedbackItem = { id: number; text: string };

// Short messages that float on top of any screen to answer an action of the user (they survive a change of screen,
// like after sending a booking). A message that comes while another is showing does not replace it: both show, one
// under the other, each going away on its own. The same message twice is one message that stays a little longer.
@Injectable({ providedIn: 'root' })
export class Feedback {
  // The messages being shown, the oldest first
  readonly items = signal<FeedbackItem[]>([]);
  // The newest one (empty when there is none)
  readonly text = computed(() => this.items().at(-1)?.text ?? '');
  private id = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  // More than this at once would cover the screen: the oldest goes away
  private static readonly MAX = 4;

  show(text: string, milliseconds = 3500) {
    const same = this.items().find((item) => item.text === text);
    if (same) {
      this.later(same.id, milliseconds);
      return;
    }
    const id = ++this.id;
    const kept = this.items().slice(-(Feedback.MAX - 1));
    for (const gone of this.items().filter((item) => !kept.includes(item))) this.forget(gone.id);
    this.items.set([...kept, { id, text }]);
    this.later(id, milliseconds);
  }

  // Closes one message, or all of them when no id is given
  dismiss(id?: number) {
    if (id === undefined) {
      for (const item of this.items()) this.forget(item.id);
      this.items.set([]);
      return;
    }
    this.forget(id);
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  private later(id: number, milliseconds: number) {
    this.forget(id);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), milliseconds),
    );
  }

  private forget(id: number) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }
}
