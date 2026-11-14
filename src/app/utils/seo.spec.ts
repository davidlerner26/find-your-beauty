import { Professional } from '../models/professional';
import {
  organizationJsonLd,
  parseAddress,
  professionalJsonLd,
  professionalTitle,
  truncate,
} from './seo';

const ana = {
  id: 'ana',
  name: 'Ana Teste',
  image: 'https://cdn.example.com/ana.jpg',
  address: 'Rua das Flores, 100 - Botafogo, Rio de Janeiro - RJ, 22250-040',
  serviceMode: 'studio',
  tags: ['Maquiagem'],
  rating: 4.5,
  reviewsCount: '2',
  about: ['Ana faz maquiagem há anos.'],
  services: [
    {
      id: 's1',
      name: 'Maquiagem social',
      category: 'Maquiagem',
      price: 100,
      durationMinutes: 60,
      description: '',
    },
    {
      id: 's2',
      name: 'Maquiagem de noiva',
      category: 'Maquiagem',
      price: 250,
      durationMinutes: 90,
      description: '',
    },
  ],
  position: { lat: -22.95, lng: -43.18 },
  instagram: 'ana.makeup',
} as unknown as Professional;

describe('truncate', () => {
  it('keeps a short text and cuts a long one at a word', () => {
    expect(truncate('Texto curto.')).toBe('Texto curto.');
    const long = 'palavra '.repeat(40);
    const cut = truncate(long, 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/palav…$/);
  });
});

describe('parseAddress', () => {
  it('reads the address the way Google writes it', () => {
    expect(parseAddress('Rua das Flores, 100 - Botafogo, Rio de Janeiro - RJ, 22250-040')).toEqual({
      street: 'Rua das Flores, 100',
      neighborhood: 'Botafogo',
      city: 'Rio de Janeiro',
      region: 'RJ',
      postalCode: '22250-040',
    });
  });

  it('keeps an address it does not know whole', () => {
    expect(parseAddress('Algum lugar, 5')).toEqual({ street: 'Algum lugar, 5' });
  });
});

describe('professionalTitle', () => {
  it('has the name, the first category and the neighborhood', () => {
    expect(professionalTitle(ana, (place) => ` em ${place}`)).toBe(
      'Ana Teste · Maquiagem em Botafogo',
    );
  });

  it('has no place for a professional who goes to the client', () => {
    const home = { ...ana, serviceMode: 'home', address: '' } as Professional;
    expect(professionalTitle(home, (place) => ` em ${place}`)).toBe('Ana Teste · Maquiagem');
  });
});

describe('professionalJsonLd', () => {
  it('describes the business with address, position, rating, prices and Instagram', () => {
    const data = professionalJsonLd(ana, 'https://findyourbeauty.com.br/explorar/ana') as Record<
      string,
      unknown
    >;
    expect(data['@type']).toBe('HealthAndBeautyBusiness');
    expect(data['address']).toMatchObject({
      streetAddress: 'Rua das Flores, 100',
      addressLocality: 'Rio de Janeiro',
      addressRegion: 'RJ',
    });
    expect(data['geo']).toEqual({ '@type': 'GeoCoordinates', latitude: -22.95, longitude: -43.18 });
    expect(data['aggregateRating']).toMatchObject({ ratingValue: 4.5, reviewCount: 2 });
    expect(data['priceRange']).toBe('R$ 100 - R$ 250');
    expect(data['sameAs']).toEqual(['https://instagram.com/ana.makeup']);
  });

  it('leaves out what it does not have: no reviews, no address, a photo that is a data URL', () => {
    const bare = {
      ...ana,
      reviewsCount: '0',
      serviceMode: 'home',
      address: '',
      image: 'data:image/png;base64,x',
      instagram: undefined,
    } as unknown as Professional;
    const data = professionalJsonLd(bare, 'https://x/p') as Record<string, unknown>;
    expect(data['aggregateRating']).toBeUndefined();
    expect(data['address']).toBeUndefined();
    expect(data['geo']).toBeUndefined();
    expect(data['image']).toBeUndefined();
    expect(data['sameAs']).toBeUndefined();
  });
});

describe('organizationJsonLd', () => {
  it('names the site and its logo', () => {
    expect(organizationJsonLd('https://findyourbeauty.com.br')).toMatchObject({
      '@type': 'Organization',
      name: 'Find Your Beauty',
      logo: 'https://findyourbeauty.com.br/icons/icon-512.png',
    });
  });
});
