import { Lang } from '../../../shared/domain';
import { aboutToParagraphs } from '../pages/pro-profile/profile-form';
import { isValidEmail } from './validators';

// What the admin types to make a profile for a professional who has no account yet. The e-mail is optional.
export type DraftForm = {
  name: string;
  email: string;
  phone: string;
  lang: Lang;
  instagram: string;
  about: string;
  image: string;
};

export type InviteStatus = 'none' | 'sent' | 'expired';

// The invite link of a draft: not made yet, waiting for the professional, or past its date
export const inviteStatus = (
  draft: { invited: boolean; inviteExpiresAt: number | null },
  now = Date.now(),
): InviteStatus => {
  if (!draft.invited) return 'none';
  return draft.inviteExpiresAt !== null && now > draft.inviteExpiresAt ? 'expired' : 'sent';
};

// What is missing before the draft can be saved
export const draftProblems = (form: DraftForm) => {
  const problems: string[] = [];
  if (form.name.trim().length < 3) problems.push('name');
  // Optional: with one only that account can claim the profile, without one whoever has the link can
  if (form.email.trim() && !isValidEmail(form.email.trim())) problems.push('email');
  return problems;
};

// "@ana.makeup" and "https://instagram.com/ana.makeup/" both become "ana.makeup"
export const instagramUsername = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');

// The fields saved in the draft (the same names as the professional document, plus the e-mail of the invite)
export const draftFields = (form: DraftForm) => ({
  name: form.name.trim(),
  claimEmail: form.email.trim().toLowerCase(),
  phone: form.phone.trim(),
  lang: form.lang,
  instagram: instagramUsername(form.instagram),
  about: aboutToParagraphs(form.about),
  image: form.image,
});
