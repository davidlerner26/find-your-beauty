import { Availability, DateRange, DEFAULT_AVAILABILITY } from '../../models/professional';
import { isValidCpf } from '../../utils/cpf';
import { INTL_LOCALE } from '../../utils/locale';
import { toMinutes } from '../../utils/slots';
import { isServiceComplete, ServiceDraft } from './service-draft';

// The hours of a saved profile as the form edits them: a copy, with the single blocked days of the old
// format turned into one-day periods
export const toAvailabilityDraft = (saved: Availability | undefined): Availability => {
  const availability = structuredClone(saved ?? DEFAULT_AVAILABILITY);
  availability.blockedRanges = [
    ...(availability.blockedRanges ?? []),
    ...(availability.blockedDates ?? []).map((date) => ({ start: date, end: date })),
  ];
  delete availability.blockedDates;
  return availability;
};

// The keys of the days that are open but close at or before the opening time
export const invalidDayKeys = (availability: Availability, keys: string[]) =>
  keys.filter((key) => {
    const day = availability.weekly[key];
    return day.enabled && toMinutes(day.end) <= toMinutes(day.start);
  });

// Adds a period to the blocked ones, in date order and without repeating one. A single day has no end.
export const addBlockedRange = (
  ranges: DateRange[],
  { start, end }: { start: string | null; end: string | null },
) => {
  if (!start) return ranges;

  const range: DateRange = { start, end: end ?? start };
  if (ranges.some((r) => r.start === range.start && r.end === range.end)) return ranges;
  return [...ranges, range].sort((a, b) => a.start.localeCompare(b.start));
};

// "10/03/2026" for a single day, "10/03/2026 a 15/03/2026" for a period
export const rangeLabel = (start: string, end: string | null) => {
  const format = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(INTL_LOCALE);
  };
  return !end || end === start ? format(start) : `${format(start)} a ${format(end)}`;
};

// The text of the profile is written in paragraphs separated by a blank line
export const aboutToParagraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const paragraphsToAbout = (paragraphs: string[]) => paragraphs.join('\n\n');

export type ProfileDraft = {
  name: string;
  cpf: string;
  image: string;
  // Where the professional attends, once chosen
  hasServiceMode: boolean;
  needsAddress: boolean;
  address: string;
  addressConfirmed: boolean;
  services: ServiceDraft[];
};

// What is missing before the profile can be shown to clients
export const missingFields = (draft: ProfileDraft) => {
  const missing: string[] = [];
  if (draft.name.trim().length < 3) missing.push('nome');
  if (!isValidCpf(draft.cpf)) missing.push('CPF');
  if (!draft.image.trim()) missing.push('foto');
  if (!draft.hasServiceMode) missing.push($localize`onde você atende`);
  else if (draft.needsAddress) {
    if (draft.address.trim().length < 5) missing.push($localize`endereço`);
    else if (!draft.addressConfirmed)
      missing.push($localize`escolher o endereço na lista de sugestões`);
  }
  if (!draft.services.some(isServiceComplete)) {
    missing.push($localize`pelo menos 1 serviço completo`);
  }
  return missing;
};
