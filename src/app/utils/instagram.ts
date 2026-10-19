// Accepts "@maria.makeup", "maria.makeup" or a profile link and returns the username.
// Empty text gives "" (no Instagram); an invalid username gives null.
export const parseInstagram = (text: string) => {
  const username = text
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '');

  if (!username) return '';
  return /^(?!.*\.\.)[\w.]{1,30}$/.test(username) ? username : null;
};

export const instagramUrl = (username: string) => `https://instagram.com/${username}`;
