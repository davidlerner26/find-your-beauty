import { asLang, Lang } from '../../../shared/domain';
import {
  Availability,
  DEFAULT_AVAILABILITY,
  ImagePosition,
  Service,
  ServiceMode,
} from '../models/professional';
import {
  aboutToParagraphs,
  invalidDayKeys,
  missingFields,
  paragraphsToAbout,
  toAvailabilityDraft,
} from '../pages/pro-profile/profile-form';
import {
  isServiceComplete,
  ServiceDraft,
  toService,
  toServiceDraft,
} from '../pages/pro-profile/service-draft';
import { WEEKDAYS } from '../pages/pro-profile/weekdays';
import { formatCpf, isValidCpf } from './cpf';
import { isValidEmail } from './validators';

export type DraftPosition = { lat: number; lng: number };
export const NO_POSITION: DraftPosition = { lat: 0, lng: 0 };

// What the admin types to make a profile for a professional who has no account yet: everything the professional
// types when she signs up. The e-mail is optional.
export type DraftForm = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  lang: Lang;
  // A link (or @user) to her profile: the Instagram cannot be connected without her, so no photos come from it
  instagram: string;
  about: string;
  image: string;
  imagePosition: ImagePosition;
  gallery: string[];
  serviceMode: ServiceMode | null;
  address: string;
  position: DraftPosition;
  // The address only counts once a suggestion was chosen (that is what gives it a place on the map)
  addressConfirmed: boolean;
  services: ServiceDraft[];
  availability: Availability;
};

export const emptyDraftForm = (): DraftForm => ({
  name: '',
  email: '',
  cpf: '',
  phone: '',
  lang: 'pt',
  instagram: '',
  about: '',
  image: '',
  imagePosition: { x: 50, y: 50 },
  gallery: [],
  serviceMode: null,
  address: '',
  position: NO_POSITION,
  addressConfirmed: false,
  services: [],
  availability: toAvailabilityDraft(DEFAULT_AVAILABILITY),
});

// Same rule as the profile form: only a home-only professional has no address
export const draftNeedsAddress = (form: Pick<DraftForm, 'serviceMode'>) =>
  form.serviceMode !== 'home';

// What is missing for the profile to be shown to clients once she claims it (the same list as the profile form)
export const draftMissing = (form: DraftForm) =>
  missingFields({
    name: form.name,
    cpf: form.cpf,
    image: form.image,
    hasServiceMode: !!form.serviceMode,
    needsAddress: draftNeedsAddress(form),
    address: form.address,
    addressConfirmed: form.addressConfirmed,
    services: form.services,
  });

export type InviteStatus = 'none' | 'sent' | 'expired';

// The invite link of a draft: not made yet, waiting for the professional, or past its date
export const inviteStatus = (
  draft: { invited: boolean; inviteExpiresAt: number | null },
  now = Date.now(),
): InviteStatus => {
  if (!draft.invited) return 'none';
  return draft.inviteExpiresAt !== null && now > draft.inviteExpiresAt ? 'expired' : 'sent';
};

// What is wrong before the draft can be saved. The rest (CPF, services, hours...) may be left for later: the draft
// is saved as it is, and `draftMissing` says what is left.
export const draftProblems = (form: DraftForm) => {
  const problems: string[] = [];
  if (form.name.trim().length < 3) problems.push('name');
  // Optional: with one only that account can claim the profile, without one whoever has the link can
  if (form.email.trim() && !isValidEmail(form.email.trim())) problems.push('email');
  if (form.cpf.trim() && !isValidCpf(form.cpf)) problems.push('cpf');
  if (!form.services.every(isServiceComplete)) problems.push('services');
  if (
    invalidDayKeys(
      form.availability,
      WEEKDAYS.map(({ key }) => key),
    ).length
  ) {
    problems.push('hours');
  }
  return problems;
};

// "@ana.makeup" and "https://instagram.com/ana.makeup/" both become "ana.makeup"
export const instagramUsername = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');

// The fields saved in the draft (the same names as the professional document, plus the e-mail of the invite)
export const draftFields = (form: DraftForm) => {
  const services = form.services.filter(isServiceComplete).map(toService);
  const needsAddress = draftNeedsAddress(form);
  return {
    name: form.name.trim(),
    claimEmail: form.email.trim().toLowerCase(),
    // Private: the claim moves it to professionals/{uid}/private/identity. Only a valid one is kept.
    cpf: isValidCpf(form.cpf) ? form.cpf : '',
    phone: form.phone.trim(),
    lang: form.lang,
    instagram: instagramUsername(form.instagram),
    about: aboutToParagraphs(form.about),
    image: form.image,
    imagePosition: form.imagePosition,
    gallery: form.gallery,
    serviceMode: form.serviceMode,
    // Home-only professionals have no address on the map
    address: needsAddress ? form.address.trim() : '',
    position: needsAddress ? form.position : NO_POSITION,
    services,
    tags: [...new Set(services.map((service) => service.category))],
    availability: {
      slotMinutes: Number(form.availability.slotMinutes),
      weekly: form.availability.weekly,
      blockedRanges: form.availability.blockedRanges,
    },
    // The profile goes public by itself when she claims a complete one (the admin is the only one who writes this)
    complete: draftMissing(form).length === 0,
  };
};

const hasPosition = ({ lat, lng }: DraftPosition) => lat !== 0 || lng !== 0;

// The form of a saved draft (the Firestore document), the way the profile form fills itself from a profile
export const draftToForm = (data: Record<string, unknown>): DraftForm => {
  const empty = emptyDraftForm();
  const text = (field: string) => (typeof data[field] === 'string' ? (data[field] as string) : '');
  const list = <T>(field: string) => (Array.isArray(data[field]) ? (data[field] as T[]) : []);
  const position = { ...NO_POSITION, ...(data['position'] as Partial<DraftPosition> | undefined) };
  const mode = data['serviceMode'];
  return {
    name: text('name'),
    email: text('claimEmail'),
    cpf: formatCpf(text('cpf')),
    phone: text('phone'),
    lang: asLang(data['lang']),
    instagram: text('instagram'),
    about: paragraphsToAbout(list<string>('about')),
    image: text('image'),
    imagePosition: (data['imagePosition'] as ImagePosition | undefined) ?? empty.imagePosition,
    gallery: list<string>('gallery'),
    serviceMode: mode === 'studio' || mode === 'home' || mode === 'both' ? mode : null,
    address: text('address'),
    position,
    addressConfirmed: hasPosition(position),
    services: list<Service>('services').map(toServiceDraft),
    availability: data['availability']
      ? toAvailabilityDraft(data['availability'] as Availability)
      : empty.availability,
  };
};
