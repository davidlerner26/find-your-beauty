import { clientAreaGuard, clientEntryGuard, clientGuard } from './guards/client';
import { cardsGuard } from './guards/cards';
import { routes } from './app.routes';

// A signed in professional only has the professional area: every screen of the client sends her away
describe('routes', () => {
  const guardsOf = (path: string) => routes.find((route) => route.path === path)?.canActivate ?? [];

  it.each([
    '',
    'explorar',
    'busca',
    'explorar/:id',
    'boas-vindas',
    'verificar-email',
    'mensagens',
    'mensagens/:id',
    'notificacoes',
    'agenda',
    'perfil',
  ])('keeps professionals out of /%s', (path) => {
    expect(guardsOf(path)).toContain(clientAreaGuard);
  });

  it.each([
    ['profissionais/:id/agendar', clientGuard],
    ['profissionais/:id/pagamento', clientGuard],
    ['cartoes', cardsGuard],
    ['entrar', clientEntryGuard],
    ['cadastro', clientEntryGuard],
  ])('keeps professionals out of /%s', (path, guard) => {
    expect(guardsOf(path)).toContain(guard);
  });
});

describe('the old addresses', () => {
  it.each([
    ['explore', 'explorar'],
    ['profissionais/:id', 'explorar/:id'],
  ])('sends /%s to /%s', (from, to) => {
    const old = routes.find((route) => route.path === from);
    expect(old?.redirectTo).toBe(to);
    expect(old?.pathMatch).toBe('full');
  });
});
