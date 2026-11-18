// The wheels of the time picker (the working hours and the prices by time): hours and minutes of a time "HH:MM".
// The same rules as the app (utils/time-wheel.ts of find-your-beauty-mobile).
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const STEP = 5;

export const pad2 = (n: number) => String(n).padStart(2, '0');

// "09:30" -> { hour: 9, minute: 30 }; anything that is not a time is the default (08:00)
export const splitTime = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return { hour: 8, minute: 0 };
  return { hour: Math.min(23, Number(match[1])), minute: Math.min(59, Number(match[2])) };
};

export const joinTime = (hour: number, minute: number) => `${pad2(hour)}:${pad2(minute)}`;

// The minutes the wheel offers: every 5, plus the one already saved when it is not a multiple of 5 (so a time saved before is
// never lost by opening the picker)
export const minuteOptions = (current: number) => {
  const minutes = Array.from({ length: 60 / STEP }, (_, i) => i * STEP);
  return minutes.includes(current) ? minutes : [...minutes, current].sort((a, b) => a - b);
};
