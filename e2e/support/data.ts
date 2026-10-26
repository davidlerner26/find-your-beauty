// The accounts and professionals the tests start from (see seed.ts)
export const PASSWORD = 'E2e@12345';

export const CLIENT = {
  uid: 'client-e2e-1',
  email: 'maria@e2e.test',
  firstName: 'Maria',
  lastName: 'Cliente',
};

export const PRO = {
  uid: 'pro-e2e-1',
  email: 'ana@e2e.test',
  name: 'Ana Teste',
  service: 'Maquiagem social',
  price: 100,
};

// A second professional that works only at the client's home
export const PRO_HOME = {
  uid: 'pro-e2e-2',
  email: 'bia@e2e.test',
  name: 'Bia Domicílio',
};

export const ADMIN = { uid: 'admin-e2e-1', email: 'admin@e2e.test' };
