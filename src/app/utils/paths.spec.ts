import { routes } from '../app.routes';
import { PATHS } from './paths';

// The paths of the table of routes, with the parameters as they are written (":id")
const declared = new Set(routes.map((route) => `/${route.path}`.replace(/^\/$/, '/')));

describe('PATHS', () => {
  it('names screens that exist in the routes', () => {
    const screens = [
      PATHS.home,
      PATHS.explore,
      PATHS.search,
      PATHS.login,
      PATHS.signup,
      PATHS.verifyEmail,
      PATHS.agenda,
      PATHS.admin,
      PATHS.proHome,
      PATHS.proLogin,
      PATHS.proSignup,
      PATHS.proProfile,
    ];
    for (const path of screens) expect(declared.has(path), path).toBe(true);
  });

  it('builds the paths of a professional the way the routes declare them', () => {
    expect(declared.has('/profissionais/:id')).toBe(true);
    expect(declared.has('/profissionais/:id/agendar')).toBe(true);
    expect(PATHS.professional('p1')).toBe('/profissionais/p1');
    expect(PATHS.booking('p1')).toBe('/profissionais/p1/agendar');
    expect(PATHS.professionals).toBe('/profissionais');
    expect(declared.has('/profissionais/:id/pagamento')).toBe(true);
    expect(PATHS.checkout('p1')).toBe('/profissionais/p1/pagamento');
  });
});
