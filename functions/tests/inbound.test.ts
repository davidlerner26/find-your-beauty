import { describe, expect, it } from 'vitest';
import { addressOf, forwardBody, forwardSubject } from '../src/inbound';

describe('forwardSubject', () => {
  it('puts Fwd: in front, once', () => {
    expect(forwardSubject('hello')).toBe('Fwd: hello');
    expect(forwardSubject('Fwd: hello')).toBe('Fwd: hello');
    expect(forwardSubject('ENC: oi')).toBe('ENC: oi');
  });

  it('copes with a missing subject', () => {
    expect(forwardSubject(null)).toBe('Fwd: (sem assunto)');
    expect(forwardSubject('  ')).toBe('Fwd: (sem assunto)');
  });
});

describe('forwardBody', () => {
  const mail = {
    from: 'Ana <ana@x.com>',
    to: ['contato@findyourbeauty.com.br'],
    html: '<p>Oi!</p>',
    text: 'Oi!',
  };

  it('says who wrote and to which address, above the e-mail', () => {
    const body = forwardBody(mail);
    expect(body.text).toBe('De: Ana <ana@x.com>\nPara: contato@findyourbeauty.com.br\n\nOi!');
    expect(body.html).toContain('De: Ana &lt;ana@x.com&gt;');
    expect(body.html.endsWith('<p>Oi!</p>')).toBe(true);
  });

  it('keeps a text-only e-mail readable and never lets its text become markup', () => {
    const body = forwardBody({ ...mail, html: null, text: '<script>x</script>' });
    expect(body.html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(body.html).not.toContain('<script>');
  });
});

describe('addressOf', () => {
  it('takes the address out of a name and an address', () => {
    expect(addressOf('Ana <ana@x.com>')).toBe('ana@x.com');
    expect(addressOf(' ana@x.com ')).toBe('ana@x.com');
  });
});
