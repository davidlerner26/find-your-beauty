import { ErrorHandler, inject, Injectable } from '@angular/core';
import { Feedback } from './services/feedback';
import { log } from './utils/log';

// Not to repeat the message when one failure throws many errors
const MESSAGE_GAP_MS = 10_000;

// A lazy chunk that can't be loaded: the page is from an older deploy (or the connection dropped)
const isChunkLoadError = (error: unknown) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    String((error as { message?: string } | null)?.message ?? error),
  );

// What Angular does with an error that nobody caught: it is logged, and the user is told something went wrong
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly feedback = inject(Feedback);
  private lastMessageAt = 0;

  handleError(error: unknown) {
    log.error('Unhandled error', error);

    const now = Date.now();
    if (now - this.lastMessageAt < MESSAGE_GAP_MS) return;
    this.lastMessageAt = now;

    this.feedback.show(
      isChunkLoadError(error)
        ? $localize`Há uma nova versão do app. Recarregue a página.`
        : $localize`Algo deu errado. Tente novamente.`,
      5000,
    );
  }
}
