const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const isValidEmail = (email: string) => EMAIL.test(email.trim());

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/weak-password': 'A senha é muito fraca.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/pending-approval': 'Seu cadastro ainda está em análise. Você poderá entrar assim que for aprovado.',
  'auth/not-professional': 'Esta conta não é de profissional. Use o login de cliente.',
  'auth/expired-action-code': 'Este link expirou. Peça um novo link de redefinição.',
  'auth/invalid-action-code': 'Este link é inválido ou já foi usado. Peça um novo link de redefinição.',
  'auth/operation-not-allowed': 'Login por e-mail não está ativado no Firebase.',
};

export const authErrorMessage = (error: unknown) =>
  AUTH_ERRORS[(error as { code?: string }).code ?? ''] ??
  'Algo deu errado. Tente novamente.';
