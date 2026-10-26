type Level = 'error' | 'warn';

// Where the logs go. The default is the console; an error tracker can take over with setLogSink.
export type LogSink = (level: Level, message: string, error?: unknown) => void;

const consoleSink: LogSink = (level, message, error) =>
  error === undefined ? console[level](message) : console[level](message, error);

let sink: LogSink = consoleSink;

export const setLogSink = (next: LogSink | null) => {
  sink = next ?? consoleSink;
};

// The one way the app reports a problem: `message` says what failed, `error` is what was caught
export const log = {
  error: (message: string, error?: unknown) => sink('error', message, error),
  warn: (message: string, error?: unknown) => sink('warn', message, error),
};
