import type { Lang } from './email';

// The services of the catalog are saved in Portuguese: this is how they are named in the e-mails of the other languages
const NAMES: Record<string, { en: string; es: string }> = {
  'Maquiagem social': { en: 'Everyday makeup', es: 'Maquillaje social' },
  'Maquiagem para festa': { en: 'Party makeup', es: 'Maquillaje para fiesta' },
  'Maquiagem de noiva': { en: 'Bridal makeup', es: 'Maquillaje de novia' },
  'Maquiagem para madrinhas': { en: 'Bridesmaid makeup', es: 'Maquillaje para damas de honor' },
  'Maquiagem para formatura': { en: 'Graduation makeup', es: 'Maquillaje para graduación' },
  'Maquiagem artística': { en: 'Artistic makeup', es: 'Maquillaje artístico' },
  'Maquiagem para fotos e ensaios': {
    en: 'Photo shoot makeup',
    es: 'Maquillaje para fotos y sesiones',
  },
  'Automaquiagem (aula)': { en: 'Self-makeup (lesson)', es: 'Automaquillaje (clase)' },
  'Design de sobrancelhas': { en: 'Eyebrow design', es: 'Diseño de cejas' },
  'Aplicação de cílios': { en: 'Eyelash application', es: 'Aplicación de pestañas' },
  'Corte feminino': { en: "Women's haircut", es: 'Corte de cabello de mujer' },
  'Corte masculino': { en: "Men's haircut", es: 'Corte de cabello de hombre' },
  Escova: { en: 'Blow-dry', es: 'Cepillado' },
  'Penteado para festa': { en: 'Party hairstyle', es: 'Peinado para fiesta' },
  'Penteado de noiva': { en: 'Bridal hairstyle', es: 'Peinado de novia' },
  Coloração: { en: 'Hair coloring', es: 'Coloración' },
  'Mechas e luzes': { en: 'Highlights', es: 'Mechas y reflejos' },
  Hidratação: { en: 'Hydration treatment', es: 'Hidratación' },
  Cauterização: { en: 'Hair cauterization', es: 'Cauterización' },
  Progressiva: { en: 'Keratin straightening', es: 'Alisado progresivo' },
  'Cronograma capilar': { en: 'Hair care schedule', es: 'Cronograma capilar' },
  Maquiagem: { en: 'Makeup', es: 'Maquillaje' },
  Cabelo: { en: 'Hair', es: 'Cabello' },
};

export const serviceName = (name: string, lang: Lang) =>
  lang === 'pt' ? name : (NAMES[name]?.[lang] ?? name);
