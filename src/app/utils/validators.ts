import { errorCode } from './error-code';

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const isValidEmail = (email: string) => EMAIL.test(email.trim());

// At least 6 characters, with a letter, a number and a special character
export const isValidPassword = (password: string) =>
  password.length >= 6 &&
  /\p{L}/u.test(password) &&
  /\d/.test(password) &&
  /[^\p{L}\d\s]/u.test(password);

export const PASSWORD_RULE = $localize`A senha precisa ter pelo menos 6 caracteres, com letras, 1 número e 1 caractere especial.`;

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': $localize`Este e-mail já está cadastrado.`,
  'auth/invalid-email': $localize`Digite um e-mail válido.`,
  'auth/weak-password': $localize`A senha é muito fraca.`,
  'auth/invalid-credential': $localize`E-mail ou senha incorretos.`,
  'auth/user-not-found': $localize`E-mail ou senha incorretos.`,
  'auth/wrong-password': $localize`E-mail ou senha incorretos.`,
  'auth/too-many-requests': $localize`Muitas tentativas. Tente novamente mais tarde.`,
  'auth/network-request-failed': $localize`Sem conexão. Verifique sua internet.`,
  'auth/pending-approval': $localize`Seu cadastro ainda está em análise. Você poderá entrar assim que for aprovado.`,
  'auth/not-professional': $localize`Esta conta não é de profissional. Use o login de cliente.`,
  'auth/professional-not-registered': $localize`Esta conta do Google ainda não está cadastrada. Faça o cadastro de profissional primeiro.`,
  'auth/account-is-client': $localize`Esta conta do Google já é de cliente. Use outra conta para se cadastrar como profissional.`,
  'auth/not-client': $localize`Esta conta é de profissional. Use o login da área profissional.`,
  'auth/expired-action-code': $localize`Este link expirou. Peça um novo link de redefinição.`,
  'auth/invalid-action-code': $localize`Este link é inválido ou já foi usado. Peça um novo link de redefinição.`,
  'auth/operation-not-allowed': $localize`Login por e-mail não está ativado no Firebase.`,
};

export const authErrorMessage = (error: unknown) =>
  AUTH_ERRORS[errorCode(error) ?? ''] ?? $localize`Algo deu errado. Tente novamente.`;
