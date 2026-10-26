// The addresses of the screens, as they are written in app.routes.ts. Use these instead of writing the text again.
export const PATHS = {
  home: '/',
  explore: '/explore',
  search: '/busca',
  login: '/entrar',
  signup: '/cadastro',
  verifyEmail: '/verificar-email',
  agenda: '/agenda',
  admin: '/admin',
  // The professional area
  proHome: '/pro',
  proLogin: '/pro/entrar',
  proSignup: '/pro/cadastro',
  proProfile: '/pro/perfil',
  // The page of a professional, and its booking screen
  professionals: '/profissionais',
  professional: (id: string) => `/profissionais/${id}`,
  booking: (id: string) => `/profissionais/${id}/agendar`,
  // The cards of the client (test environment)
  cards: '/cartoes',
  // The payment that comes before a booking in the test environment
  checkout: (id: string) => `/profissionais/${id}/pagamento`,
} as const;
