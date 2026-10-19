// Digits of a Brazilian phone number without the country code, at most 11 (DDD + 9 digits)
export const nationalDigits = (value: string) => {
  let digits = value.replace(/\D/g, '');

  // Autofill and paste usually bring the country code: +55 21 99747-2878
  if (value.trim().startsWith('+55') || (digits.startsWith('55') && digits.length > 11)) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

// Formats as (21) 99747-2878, or (21) 3974-2878 for landlines
export const formatPhone = (value: string) => {
  const digits = nationalDigits(value);
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = digits.length > 10 ? 5 : 4;

  if (digits.length > 2) {
    const masked = `(${area}) ${rest.slice(0, split)}`;
    return rest.length > split ? `${masked}-${rest.slice(split)}` : masked;
  }
  return digits.length ? `(${area}` : '';
};
