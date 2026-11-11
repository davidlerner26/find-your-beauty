import { draftFields, draftProblems, DraftForm, inviteStatus, instagramUsername } from './drafts';

const form: DraftForm = {
  name: ' Ana Souza ',
  email: ' Ana@Example.com ',
  phone: '',
  lang: 'pt',
  instagram: '@ana.makeup',
  about: 'Primeiro.\n\nSegundo.',
  image: '',
};

describe('inviteStatus', () => {
  it('is none before the link is made', () => {
    expect(inviteStatus({ invited: false, inviteExpiresAt: null })).toBe('none');
  });

  it('is sent until the date, then expired', () => {
    expect(inviteStatus({ invited: true, inviteExpiresAt: 1000 }, 999)).toBe('sent');
    expect(inviteStatus({ invited: true, inviteExpiresAt: 1000 }, 1001)).toBe('expired');
  });
});

describe('draftProblems', () => {
  it('asks for a name, and for a valid e-mail only when there is one', () => {
    expect(draftProblems(form)).toEqual([]);
    expect(draftProblems({ ...form, email: '' })).toEqual([]);
    expect(draftProblems({ ...form, name: 'An' })).toEqual(['name']);
    expect(draftProblems({ ...form, email: 'ana@' })).toEqual(['email']);
  });
});

describe('instagramUsername', () => {
  it('takes the username out of a handle or a link', () => {
    expect(instagramUsername('@ana.makeup')).toBe('ana.makeup');
    expect(instagramUsername('https://www.instagram.com/ana.makeup/?hl=pt')).toBe('ana.makeup');
    expect(instagramUsername(' ana.makeup ')).toBe('ana.makeup');
    expect(instagramUsername('')).toBe('');
  });
});

describe('draftFields', () => {
  it('cleans what was typed', () => {
    expect(draftFields(form)).toEqual({
      name: 'Ana Souza',
      claimEmail: 'ana@example.com',
      phone: '',
      lang: 'pt',
      instagram: 'ana.makeup',
      about: ['Primeiro.', 'Segundo.'],
      image: '',
    });
  });
});
