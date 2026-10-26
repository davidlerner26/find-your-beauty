import { log, setLogSink } from './log';

describe('log', () => {
  afterEach(() => setLogSink(null));

  it('sends the level, the message and the error to the sink', () => {
    const sink = vi.fn();
    setLogSink(sink);
    const error = new Error('boom');

    log.error('Failed to save', error);
    log.warn('Careful');

    expect(sink).toHaveBeenNthCalledWith(1, 'error', 'Failed to save', error);
    expect(sink).toHaveBeenNthCalledWith(2, 'warn', 'Careful', undefined);
  });

  it('goes to the console by default, without an undefined argument', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('boom');

    log.error('With error', error);
    log.error('Without error');

    expect(spy).toHaveBeenNthCalledWith(1, 'With error', error);
    expect(spy).toHaveBeenNthCalledWith(2, 'Without error');
    spy.mockRestore();
  });
});
