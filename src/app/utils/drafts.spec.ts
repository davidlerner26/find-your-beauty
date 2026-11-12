import {
  draftFields,
  draftMissing,
  draftProblems,
  draftToForm,
  emptyDraftForm,
  inviteStatus,
  instagramUsername,
} from './drafts';

const form = {
  ...emptyDraftForm(),
  name: ' Ana Souza ',
  email: ' Ana@Example.com ',
  instagram: '@ana.makeup',
  about: 'Primeiro.\n\nSegundo.',
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
    expect(draftFields(form)).toMatchObject({
      name: 'Ana Souza',
      claimEmail: 'ana@example.com',
      cpf: '',
      instagram: 'ana.makeup',
      about: ['Primeiro.', 'Segundo.'],
      services: [],
      tags: [],
      complete: false,
    });
  });

  it('keeps only a valid CPF, and no address for a home-only professional', () => {
    expect(draftFields({ ...form, cpf: '529.982.247-25' }).cpf).toBe('529.982.247-25');
    expect(draftFields({ ...form, cpf: '111.111.111-11' }).cpf).toBe('');
    const home = draftFields({
      ...form,
      serviceMode: 'home',
      address: 'Rua A, 1',
      position: { lat: 1, lng: 2 },
    });
    expect(home).toMatchObject({ address: '', position: { lat: 0, lng: 0 } });
  });
});

describe('draftProblems of the other fields', () => {
  it('rejects an invalid CPF', () => {
    expect(draftProblems({ ...form, cpf: '123' })).toEqual(['cpf']);
  });
});

describe('draftToForm', () => {
  it('reads what draftFields wrote', () => {
    const saved = {
      ...draftFields({
        ...form,
        cpf: '529.982.247-25',
        serviceMode: 'studio',
        address: 'Rua A, 1',
        position: { lat: 1, lng: 2 },
        gallery: ['g1'],
      }),
    };
    const back = draftToForm(saved);
    expect(back).toMatchObject({
      name: 'Ana Souza',
      email: 'ana@example.com',
      cpf: '529.982.247-25',
      serviceMode: 'studio',
      address: 'Rua A, 1',
      addressConfirmed: true,
      gallery: ['g1'],
      about: 'Primeiro.\n\nSegundo.',
    });
  });

  it('starts empty for a document without the new fields', () => {
    expect(draftToForm({ name: 'Ana' })).toMatchObject({
      name: 'Ana',
      serviceMode: null,
      addressConfirmed: false,
      services: [],
    });
    expect(draftMissing(draftToForm({ name: 'Ana' }))).toContain('CPF');
  });
});
