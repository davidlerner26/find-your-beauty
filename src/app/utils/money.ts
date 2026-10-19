// Price typed like a money field: digits fill from the right, starting at 0,00.
// Typing 1, 0, 0 shows 0,01, 0,10, 1,00. Up to 8 digits (999.999,99).
const format = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const maskMoney = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return format(Number(digits || 0));
};

// "1.234,50" -> 1234.5
export const parseMoney = (text: string) => Number(text.replace(/\D/g, '') || 0) / 100;

// 15.5 -> "15,50"
export const moneyToText = (value: number) => format(Math.round(value * 100));

// Sums prices without float noise (0.1 + 0.2 stays 0.3)
export const roundMoney = (value: number) => Math.round(value * 100) / 100;
