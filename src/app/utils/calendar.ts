import { INTL_LOCALE } from './locale';

export type CalendarDay = { date: Date; weekday: string; number: number; disabled: boolean };

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

// The days of the month of `month`, ready for a strip of days. `isDisabled` says which ones can't be picked.
export const monthDays = (month: Date, isDisabled: (date: Date) => boolean): CalendarDay[] => {
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weekday = new Intl.DateTimeFormat(INTL_LOCALE, { weekday: 'short' });

  return Array.from({ length: total }, (_, i) => {
    const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
    return {
      date,
      weekday: weekday.format(date).replace('.', ''),
      number: i + 1,
      disabled: isDisabled(date),
    };
  });
};
