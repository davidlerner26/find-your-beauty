import { missingProfileData, UserProfile } from './user';

const complete: UserProfile = {
  firstName: 'Maria',
  lastName: 'Silva',
  email: 'maria@example.com',
  phone: '(21) 99747-2878',
  cpf: '529.982.247-25',
  address: 'Rua A, 1',
};

describe('missingProfileData', () => {
  it('is empty for a complete profile', () => {
    expect(missingProfileData(complete)).toEqual([]);
  });

  it('lists everything for no profile at all', () => {
    expect(missingProfileData(null)).toEqual(['nome', 'sobrenome', 'celular', 'CPF', 'endereço']);
    expect(missingProfileData(undefined)).toHaveLength(5);
  });

  it('lists only what is missing, treating blanks as missing', () => {
    expect(missingProfileData({ ...complete, lastName: '   ' })).toEqual(['sobrenome']);
    expect(missingProfileData({ ...complete, address: '' })).toEqual(['endereço']);
  });

  it('wants a phone with at least 10 digits and a valid CPF', () => {
    expect(missingProfileData({ ...complete, phone: '(21) 9974' })).toEqual(['celular']);
    expect(missingProfileData({ ...complete, cpf: '111.111.111-11' })).toEqual(['CPF']);
    expect(missingProfileData({ ...complete, cpf: undefined })).toEqual(['CPF']);
  });
});
