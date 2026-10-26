import { instagramUrl, parseInstagram } from './instagram';

describe('parseInstagram', () => {
  it('reads a username with or without @', () => {
    expect(parseInstagram('maria.makeup')).toBe('maria.makeup');
    expect(parseInstagram('  @maria.makeup ')).toBe('maria.makeup');
  });

  it('reads a profile link, dropping paths and queries', () => {
    expect(parseInstagram('https://www.instagram.com/maria.makeup/')).toBe('maria.makeup');
    expect(parseInstagram('instagram.com/maria_makeup?igsh=abc')).toBe('maria_makeup');
  });

  it('is empty for no text and null for an invalid username', () => {
    expect(parseInstagram('')).toBe('');
    expect(parseInstagram('  ')).toBe('');
    expect(parseInstagram('maria..makeup')).toBeNull();
    expect(parseInstagram('maria makeup')).toBeNull();
    expect(parseInstagram('a'.repeat(31))).toBeNull();
    expect(parseInstagram('maria!')).toBeNull();
  });
});

describe('instagramUrl', () => {
  it('builds the profile link', () => {
    expect(instagramUrl('maria')).toBe('https://instagram.com/maria');
  });
});
