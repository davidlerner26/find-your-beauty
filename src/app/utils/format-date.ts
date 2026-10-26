import { INTL_LOCALE } from './locale';
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatClock = (date: Date | null) =>
  date ? date.toLocaleTimeString(INTL_LOCALE, { hour: '2-digit', minute: '2-digit' }) : '';

// Clock for today, "Ontem", "Há N dias" within a week, otherwise "3 mar"
export const formatRelative = (date: Date | null) => {
  if (!date) return '';

  const days = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );
  if (days <= 0) return formatClock(date);
  if (days === 1) return $localize`Ontem`;
  if (days < 7) return $localize`Há ${days}:days: dias`;
  return date.toLocaleDateString(INTL_LOCALE, { day: 'numeric', month: 'short' }).replace('.', '');
};
