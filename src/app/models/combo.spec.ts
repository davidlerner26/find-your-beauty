import {
  categoryOfService,
  COMBO_CATEGORY,
  comboName,
  comboParts,
  servicePartsOf,
  tagsOf,
} from './professional';
import { catalogLabel } from '../utils/catalog.pipe';

describe('combo of makeup and hair', () => {
  it('joins and splits the two services', () => {
    expect(comboName('Maquiagem social', 'Escova')).toBe('Maquiagem social + Escova');
    expect(comboName('', '')).toBe('');
    expect(comboParts('Maquiagem social + Escova')).toEqual(['Maquiagem social', 'Escova']);
    expect(comboParts('Maquiagem social + ')).toEqual(['Maquiagem social', '']);
    expect(comboParts('Escova')).toEqual(['', '']);
  });

  it('says which simple services are behind a name', () => {
    expect(servicePartsOf('Maquiagem social + Escova')).toEqual(['Maquiagem social', 'Escova']);
    expect(servicePartsOf('Escova')).toEqual(['Escova']);
  });

  it('knows the category of a simple service', () => {
    expect(categoryOfService('Maquiagem social')).toBe('Maquiagem');
    expect(categoryOfService('Escova')).toBe('Cabelo');
    expect(categoryOfService('Outro')).toBe('');
  });

  it('makes a combo count for makeup and for hair in the tags', () => {
    expect(tagsOf([{ category: COMBO_CATEGORY }])).toEqual(['Maquiagem', 'Cabelo']);
    expect(tagsOf([{ category: 'Maquiagem' }, { category: COMBO_CATEGORY }])).toEqual([
      'Maquiagem',
      'Cabelo',
    ]);
    expect(tagsOf([{ category: 'Cabelo' }, { category: '' }])).toEqual(['Cabelo']);
  });

  it('is shown half by half in the language of the page', () => {
    expect(catalogLabel(COMBO_CATEGORY)).toBe(
      `${catalogLabel('Maquiagem')} + ${catalogLabel('Cabelo')}`,
    );
    expect(catalogLabel('Maquiagem social + Escova')).toBe(
      `${catalogLabel('Maquiagem social')} + ${catalogLabel('Escova')}`,
    );
  });
});
