import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The browser calls these functions signed in or not: Cloud Run must let anyone invoke them (a function without
// this answered 403 to the browser even though it was deployed)
describe('callable functions', () => {
  const dir = join(__dirname, '..', 'src');
  const sources = readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

  // The functions that the app calls are in this region (src/app/services/firebase.ts). A file that is loaded before
  // index.ts sets the global options does not get it: it has to say it itself.
  it('every callable of a file other than index.ts says its region', () => {
    for (const { name, text } of sources.filter((source) => source.name !== 'index.ts')) {
      if (!/\bonCall\(/.test(text)) continue;
      expect(/region:\s*(REGION|'southamerica-east1')/.test(text), name).toBe(true);
    }
  });

  it('every callable says it can be invoked publicly', () => {
    const callables = sources.flatMap(({ name, text }) =>
      [...text.matchAll(/export const (\w+) = onCall\(([^]*?)async/g)].map((match) => ({
        name: `${name}: ${match[1]}`,
        options: match[2],
      })),
    );

    expect(callables.length).toBeGreaterThanOrEqual(12);
    for (const { name, options } of callables) {
      // Either the options say it, or they are the `options` object of the file, which does
      const file = sources.find((source) => name.startsWith(`${source.name}:`))!.text;
      const shared =
        /^\s*options\s*,\s*$/.test(options) &&
        /options:\s*CallableOptions\s*=\s*\{[^}]*invoker:\s*'public'/.test(file);
      expect(/invoker:\s*'public'|\.\.\.PUBLIC/.test(options) || shared, name).toBe(true);
    }
  });
});
