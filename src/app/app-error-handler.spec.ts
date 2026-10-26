import { TestBed } from '@angular/core/testing';
import { AppErrorHandler } from './app-error-handler';
import { Feedback } from './services/feedback';
import { log, setLogSink } from './utils/log';

describe('AppErrorHandler', () => {
  let handler: AppErrorHandler;
  let feedback: Feedback;
  const sink = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2099, 0, 1));
    sink.mockClear();
    setLogSink(sink);
    TestBed.configureTestingModule({ providers: [AppErrorHandler] });
    handler = TestBed.inject(AppErrorHandler);
    feedback = TestBed.inject(Feedback);
  });

  afterEach(() => {
    setLogSink(null);
    vi.useRealTimers();
  });

  it('logs the error and tells the user something went wrong', () => {
    const error = new Error('boom');
    handler.handleError(error);

    expect(sink).toHaveBeenCalledWith('error', 'Unhandled error', error);
    expect(feedback.text()).toBe('Algo deu errado. Tente novamente.');
  });

  it('asks to reload when a lazy chunk fails to load', () => {
    handler.handleError(new TypeError('Failed to fetch dynamically imported module: /chunk.js'));
    expect(feedback.text()).toBe('Há uma nova versão do app. Recarregue a página.');
  });

  it('shows the message once in a burst of errors, but logs all of them', () => {
    handler.handleError(new Error('one'));
    feedback.dismiss();
    handler.handleError(new Error('two'));

    expect(feedback.text()).toBe('');
    expect(sink).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10_000);
    handler.handleError(new Error('three'));
    expect(feedback.text()).not.toBe('');
  });

  it('copes with errors that are not Error objects', () => {
    expect(() => handler.handleError(null)).not.toThrow();
    expect(log).toBeDefined();
  });
});
