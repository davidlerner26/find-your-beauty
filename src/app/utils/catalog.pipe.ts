import { Pipe, PipeTransform } from '@angular/core';

// The categories and the services of the catalog are saved in Portuguese (it is what the professionals pick
// and what the database has): this is how they are shown in the language of the page
const CATALOG: Record<string, string> = {
  Maquiagem: $localize`Maquiagem`,
  Cabelo: $localize`Cabelo`,
  'Maquiagem social': $localize`Maquiagem social`,
  'Maquiagem para festa': $localize`Maquiagem para festa`,
  'Maquiagem de noiva': $localize`Maquiagem de noiva`,
  'Maquiagem para madrinhas': $localize`Maquiagem para madrinhas`,
  'Maquiagem para formatura': $localize`Maquiagem para formatura`,
  'Maquiagem artística': $localize`Maquiagem artística`,
  'Maquiagem para fotos e ensaios': $localize`Maquiagem para fotos e ensaios`,
  'Automaquiagem (aula)': $localize`Automaquiagem (aula)`,
  'Design de sobrancelhas': $localize`Design de sobrancelhas`,
  'Aplicação de cílios': $localize`Aplicação de cílios`,
  'Corte feminino': $localize`Corte feminino`,
  'Corte masculino': $localize`Corte masculino`,
  Escova: $localize`Escova`,
  'Penteado para festa': $localize`Penteado para festa`,
  'Penteado de noiva': $localize`Penteado de noiva`,
  Coloração: $localize`Coloração`,
  'Mechas e luzes': $localize`Mechas e luzes`,
  Hidratação: $localize`Hidratação`,
  Cauterização: $localize`Cauterização`,
  Progressiva: $localize`Progressiva`,
  'Cronograma capilar': $localize`Cronograma capilar`,
};

export const catalogLabel = (name: string) => CATALOG[name] ?? name;

// "Corte feminino" -> "Women's haircut". A list is joined with " . ", like the tags of the cards.
@Pipe({ name: 'catalog' })
export class CatalogPipe implements PipeTransform {
  transform(value: string | string[] | null | undefined) {
    if (Array.isArray(value)) return value.map(catalogLabel).join(' . ');
    return value ? catalogLabel(value) : '';
  }
}
