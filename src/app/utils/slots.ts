import { Availability } from '../models/professional';

const pad = (n: number) => String(n).padStart(2, '0');

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export const toTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const isWorkingDay = (date: Date, availability: Availability) =>
  !!availability.weekly[date.getDay()]?.enabled && !availability.blockedDates.includes(toDateKey(date));

// How many slots a service of `durationMinutes` takes
const slotCount = (durationMinutes: number, slotMinutes: number) =>
  Math.max(1, Math.ceil(durationMinutes / slotMinutes));

// Start times ("HH:mm") a client can pick on `date`, given the slots already taken ("HH:mm")
export const freeStartTimes = (
  date: Date,
  availability: Availability,
  durationMinutes: number,
  taken: Set<string>,
  now = new Date(),
) => {
  if (!isWorkingDay(date, availability)) return [];

  const { start, end } = availability.weekly[date.getDay()];
  const { slotMinutes } = availability;
  const count = slotCount(durationMinutes, slotMinutes);
  const times: string[] = [];

  for (let t = toMinutes(start); t + count * slotMinutes <= toMinutes(end); t += slotMinutes) {
    const startsAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, t);
    if (startsAt <= now) continue;

    const covered = Array.from({ length: count }, (_, i) => toTime(t + i * slotMinutes));
    if (covered.every((time) => !taken.has(time))) times.push(toTime(t));
  }
  return times;
};

// Ids of the busy documents a booking occupies: "yyyy-mm-dd_HH:mm", one per slot
export const busyIdsFor = (
  dateKey: string,
  startTime: string,
  durationMinutes: number,
  slotMinutes: number,
) => {
  const count = slotCount(durationMinutes, slotMinutes);
  return Array.from({ length: count }, (_, i) => `${dateKey}_${toTime(toMinutes(startTime) + i * slotMinutes)}`);
};
