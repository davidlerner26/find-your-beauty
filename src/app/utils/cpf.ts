// Formats as 160.490.697-94 while typing (digits only, at most 11)
export const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)];
  const masked = parts.filter(Boolean).join('.');
  return digits.length > 9 ? `${masked}-${digits.slice(9)}` : masked;
};

// 11 digits that pass the two check digits (and aren't all the same digit)
export const isValidCpf = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
};
