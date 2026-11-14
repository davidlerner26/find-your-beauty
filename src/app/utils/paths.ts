// The addresses of the screens, as they are written in app.routes.ts. Use these instead of writing the text again.
export const PATHS = {
  home: '/',
  explore: '/explorar',
  search: '/busca',
  login: '/entrar',
  signup: '/cadastro',
  verifyEmail: '/verificar-email',
  agenda: '/agenda',
  admin: '/admin',
  // Profiles an admin makes for professionals who have no account yet, and the invite page they receive
  adminDrafts: '/admin/perfis',
  adminUsers: '/admin/usuarios',
  adminDraft: (id: string) => `/admin/perfis/${id}`,
  adminNewDraft: '/admin/perfis/novo',
  invite: (draftId: string, token: string) => `/convite/${draftId}/${token}`,
  // The professional area
  proHome: '/pro',
  proLogin: '/pro/entrar',
  proSignup: '/pro/cadastro',
  proProfile: '/pro/perfil',
  proMessages: '/pro/mensagens',
  proNotifications: '/pro/notificacoes',
  // The page of a professional (on the map screen), and its booking screen
  professional: (id: string) => `/explorar/${id}`,
  booking: (id: string) => `/profissionais/${id}/agendar`,
  // The cards of the client (test environment)
  cards: '/cartoes',
  // The payment that comes before a booking in the test environment
  checkout: (id: string) => `/profissionais/${id}/pagamento`,
} as const;
