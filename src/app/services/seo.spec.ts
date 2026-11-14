import { TestBed } from '@angular/core/testing';
import { Seo } from './seo';

const meta = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;

describe('Seo', () => {
  let seo: Seo;

  beforeEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], script[data-seo]')
      .forEach((el) => el.remove());
    seo = TestBed.inject(Seo);
  });

  it('sets the title, the description, the preview of the link and the canonical address', () => {
    seo.set({
      title: 'Ana Teste · Maquiagem',
      description: 'Maquiadora no Rio.',
      path: '/explorar/ana',
    });

    expect(document.title).toBe('Ana Teste · Maquiagem | Find Your Beauty');
    expect(meta('name="description"')).toBe('Maquiadora no Rio.');
    expect(meta('property="og:title"')).toBe('Ana Teste · Maquiagem | Find Your Beauty');
    expect(meta('property="og:url"')).toBe('https://findyourbeauty.com.br/explorar/ana');
    expect(meta('name="twitter:card"')).toBe('summary_large_image');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://findyourbeauty.com.br/explorar/ana',
    );
  });

  it('is indexable by default and noindex when the page asks', () => {
    seo.set({ title: 'Início', path: '/' });
    expect(meta('name="robots"')).toBe('index, follow');

    seo.set({ title: 'Agenda', path: '/agenda', noindex: true });
    expect(meta('name="robots"')).toBe('noindex, nofollow');
  });

  it('uses the image of the site when the page has none, or has a data URL', () => {
    seo.set({ title: 'Início', path: '/' });
    expect(meta('property="og:image"')).toBe('https://findyourbeauty.com.br/og-image.png');

    seo.set({ title: 'Ana', path: '/p', image: 'data:image/svg+xml,abc' });
    expect(meta('property="og:image"')).toBe('https://findyourbeauty.com.br/og-image.png');

    seo.set({ title: 'Ana', path: '/p', image: 'https://cdn.example.com/ana.jpg' });
    expect(meta('property="og:image"')).toBe('https://cdn.example.com/ana.jpg');
  });

  it('writes the structured data and removes it when the next page has none', () => {
    seo.set({
      title: 'Ana',
      path: '/p',
      jsonLd: { '@type': 'HealthAndBeautyBusiness', name: 'Ana </script>' },
    });
    const script = document.head.querySelector('script[data-seo]');
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(script?.textContent).not.toContain('</script>');
    expect(JSON.parse(script?.textContent ?? '{}')['name']).toBe('Ana </script>');

    seo.set({ title: 'Início', path: '/' });
    expect(document.head.querySelector('script[data-seo]')).toBeNull();
  });

  it('keeps the brand alone as the title of the home of the brand', () => {
    seo.set({ title: 'Find Your Beauty', path: '/' });
    expect(document.title).toBe('Find Your Beauty');
  });
});
