// The `code` of a caught error ('auth/wrong-password', 'permission-denied'), or undefined when there is none.
// Anything can be thrown, even null, so this is safe to call on whatever a catch block gets.
export const errorCode = (error: unknown): string | undefined =>
  (error as { code?: string } | null | undefined)?.code;
