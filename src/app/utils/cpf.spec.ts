import { formatCpf, isValidCpf } from './cpf';

describe('formatCpf', () => {
  it('masks while typing and keeps only 11 digits', () => {
    expect(formatCpf('')).toBe('');
    expect(formatCpf('52998')).toBe('529.98');
    expect(formatCpf('529982247')).toBe('529.982.247');
    expect(formatCpf('5299822472')).toBe('529.982.247-2');
    expect(formatCpf('52998224725999')).toBe('529.982.247-25');
  });

  it('ignores anything that is not a digit', () => {
    expect(formatCpf('abc529.982.247-25')).toBe('529.982.247-25');
  });
});

describe('isValidCpf', () => {
  it('accepts a CPF with correct check digits, masked or not', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejects wrong check digits', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('529.982.247-35')).toBe(false);
  });

  it('rejects wrong length and repeated digits', () => {
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });
});
