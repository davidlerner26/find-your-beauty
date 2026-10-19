// Duration typed as H:MM ("1:30" is one hour and a half). Digits fill from the right, like a clock
// or a money field: typing 1, 3, 0 shows 0:01, 0:13, 1:30. Up to 4 digits (HH:MM).
export const maskDuration = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  const padded = digits.padStart(3, '0');
  const minutes = padded.slice(-2);
  const hours = String(Number(padded.slice(0, -2)));
  return `${hours}:${minutes}`;
};

// "1:30" -> 90. Null when empty or when the minutes are not between 00 and 59.
export const parseDuration = (text: string) => {
  const match = /^(\d+):(\d{2})$/.exec(text);
  if (!match) return null;

  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  return minutes < 60 ? hours * 60 + minutes : null;
};

// 90 -> "1:30"
export const durationToText = (totalMinutes: number) =>
  `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
