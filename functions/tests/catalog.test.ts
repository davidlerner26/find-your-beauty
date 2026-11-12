import { describe, expect, it } from 'vitest';
import { serviceName } from '../src/catalog';

describe('serviceName', () => {
  it('names a simple service in the language, and keeps Portuguese as it is', () => {
    expect(serviceName('Escova', 'en')).toBe('Blow-dry');
    expect(serviceName('Escova', 'pt')).toBe('Escova');
    expect(serviceName('Outro serviço', 'en')).toBe('Outro serviço');
  });

  it('names a combo half by half', () => {
    expect(serviceName('Maquiagem de noiva + Escova', 'en')).toBe('Bridal makeup + Blow-dry');
    expect(serviceName('Maquiagem de noiva + Escova', 'es')).toBe(
      'Maquillaje de novia + Cepillado',
    );
    expect(serviceName('Maquiagem de noiva + Escova', 'pt')).toBe('Maquiagem de noiva + Escova');
  });
});
