import { Lang } from '../../../shared/domain';

// The language of this build of the app ('pt' at the root, 'en' under /en, 'es' under /es)
export const APP_LANGUAGE: Lang = (($localize.locale ?? 'pt').slice(0, 2) as Lang) || 'pt';

// The locale for the dates, the numbers and the Google services
export const INTL_LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es' }[APP_LANGUAGE];
