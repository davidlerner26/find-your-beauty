import { describe, expect, it } from 'vitest';
import {
  claimedPhotoPath,
  cpfOf,
  hashToken,
  inviteState,
  newToken,
  photoUrls,
  profileFromDraft,
  storagePathOf,
  tokenMatches,
} from '../src/claim';

const url = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/bucket/o/${encodeURIComponent(path)}?alt=media&token=abc`;

const draft = {
  name: 'Ana',
  claimEmail: ' Ana@Example.com ',
  image: url('professionalDrafts/d1/profile/1.jpg'),
  gallery: [url('professionalDrafts/d1/gallery/2.jpg'), 'https://example.com/outside.jpg'],
  services: [{ id: 's1', name: 'Make', photos: [url('professionalDrafts/d1/services/3.jpg')] }],
  inviteHash: 'secret',
  inviteExpiresAt: 123,
  createdBy: 'admin1',
};

describe('invite token', () => {
  it('is random and only its hash matches', () => {
    const token = newToken();
    expect(token).not.toBe(newToken());
    expect(tokenMatches(hashToken('d1', token), 'd1', token)).toBe(true);
    expect(tokenMatches(hashToken('d1', token), 'd2', token)).toBe(false);
    expect(tokenMatches(hashToken('d1', token), 'd1', 'other')).toBe(false);
    expect(tokenMatches(undefined, 'd1', token)).toBe(false);
    expect(tokenMatches(hashToken('d1', token), 'd1', '')).toBe(false);
  });
});

describe('inviteState', () => {
  const token = newToken();
  const saved = { inviteHash: hashToken('d1', token), inviteExpiresAt: 1000 };

  it('accepts the right token before it expires', () => {
    expect(inviteState(saved, 'd1', token, 999)).toBe('ok');
  });

  it('refuses an expired invite', () => {
    expect(inviteState(saved, 'd1', token, 1001)).toBe('expired');
  });

  it('refuses a wrong token, a draft without invite and a missing draft', () => {
    expect(inviteState(saved, 'd1', 'nope', 10)).toBe('wrong');
    expect(inviteState(saved, 'd1', undefined, 10)).toBe('wrong');
    expect(inviteState({ name: 'Ana' }, 'd1', token, 10)).toBe('missing');
    expect(inviteState(undefined, 'd1', token, 10)).toBe('missing');
  });

  it('reads a Firestore timestamp as the expiry', () => {
    const timestamp = { toMillis: () => 1000 };
    expect(inviteState({ ...saved, inviteExpiresAt: timestamp }, 'd1', token, 1001)).toBe(
      'expired',
    );
  });
});

describe('photos', () => {
  it('reads the storage path of a download URL and ignores other links', () => {
    expect(storagePathOf(url('professionalDrafts/d1/profile/1.jpg'))).toBe(
      'professionalDrafts/d1/profile/1.jpg',
    );
    expect(storagePathOf('https://example.com/a.jpg')).toBeNull();
    expect(storagePathOf(undefined)).toBeNull();
  });

  it('moves a draft photo to the folder of the account, and nothing else', () => {
    expect(claimedPhotoPath('d1', 'professionalDrafts/d1/gallery/2.jpg', 'u1')).toBe(
      'professionals/u1/gallery/2.jpg',
    );
    expect(claimedPhotoPath('d1', 'professionalDrafts/d2/gallery/2.jpg', 'u1')).toBeNull();
    expect(claimedPhotoPath('d1', 'professionals/x/gallery/2.jpg', 'u1')).toBeNull();
  });

  it('lists the photos of the profile, the gallery and the services once', () => {
    expect(photoUrls(draft)).toHaveLength(4);
    expect(photoUrls({ image: 'a', gallery: ['a'] })).toEqual(['a']);
  });
});

describe('cpfOf', () => {
  it('only takes a CPF written the way the form saves it', () => {
    expect(cpfOf({ cpf: '529.982.247-25' })).toBe('529.982.247-25');
    expect(cpfOf({ cpf: '52998224725' })).toBe('');
    expect(cpfOf({})).toBe('');
  });
});

describe('profileFromDraft', () => {
  const photos = new Map([[draft.image, 'NEW-PROFILE']]);
  const profile = profileFromDraft(draft, 'u1', 'd1', photos, ' Ana@Example.com ');

  it('makes an approved, public profile owned by the account', () => {
    expect(profile).toMatchObject({
      ownerUid: 'u1',
      email: 'ana@example.com',
      approved: true,
      rejected: false,
      submitted: true,
      admin: false,
      // Hidden until the professional completes it (the draft is not marked complete)
      published: false,
      visible: true,
      rating: 0,
      reviewsCount: '0',
      views: '0',
      claimedFromDraft: 'd1',
      name: 'Ana',
    });
  });

  it('never carries the invite fields', () => {
    expect(profile).not.toHaveProperty('inviteHash');
    expect(profile).not.toHaveProperty('inviteExpiresAt');
    expect(profile).not.toHaveProperty('claimEmail');
    expect(profile).not.toHaveProperty('createdBy');
  });

  it('keeps the CPF and the flag of the admin out of the public profile', () => {
    const complete = profileFromDraft(
      { ...draft, cpf: '529.982.247-25', complete: true },
      'u1',
      'd1',
      photos,
      'a@b.c',
    );
    expect(complete).not.toHaveProperty('cpf');
    expect(complete).not.toHaveProperty('complete');
  });

  it('is public right away only when the admin filled everything', () => {
    expect(
      profileFromDraft({ ...draft, complete: true }, 'u1', 'd1', photos, 'a@b.c'),
    ).toMatchObject({ published: true });
    expect(
      profileFromDraft({ ...draft, complete: false }, 'u1', 'd1', photos, 'a@b.c'),
    ).toMatchObject({ published: false });
  });

  it('swaps the copied photos and keeps the others', () => {
    expect(profile['image']).toBe('NEW-PROFILE');
    expect(profile['gallery']).toEqual([draft.gallery[0], 'https://example.com/outside.jpg']);
    const copied = new Map([
      [draft.gallery[0], 'NEW-GALLERY'],
      [draft.services[0].photos[0], 'NEW-SERVICE'],
    ]);
    const full = profileFromDraft(draft, 'u1', 'd1', copied, 'ana@example.com');
    expect(full['gallery']).toEqual(['NEW-GALLERY', 'https://example.com/outside.jpg']);
    expect((full['services'] as { photos: string[] }[])[0].photos).toEqual(['NEW-SERVICE']);
  });
});
