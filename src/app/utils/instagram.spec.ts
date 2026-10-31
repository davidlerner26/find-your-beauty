import { instagramUrl } from './instagram';

describe('instagramUrl', () => {
  it('builds the profile link', () => {
    expect(instagramUrl('maria')).toBe('https://instagram.com/maria');
  });
});
