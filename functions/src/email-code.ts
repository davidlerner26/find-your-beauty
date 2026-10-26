import { FieldValue, Firestore } from 'firebase-admin/firestore';

export const MAX_ATTEMPTS = 5;

export type CodeResult = 'ok' | 'wrong' | 'expired';

// Checks a guess against the saved code of emailCodes/{uid}. It runs in a transaction so that parallel
// guesses can't get past MAX_ATTEMPTS: each wrong one is counted before the next is read.
export async function checkEmailCode(db: Firestore, uid: string, hash: string, now = Date.now()) {
  const ref = db.doc(`emailCodes/${uid}`);

  return db.runTransaction(async (transaction): Promise<CodeResult> => {
    const saved = (await transaction.get(ref)).data();
    if (
      !saved ||
      now > (saved['expiresAt'] as number) ||
      (saved['attempts'] as number) >= MAX_ATTEMPTS
    ) {
      return 'expired';
    }
    if (saved['hash'] !== hash) {
      transaction.update(ref, { attempts: FieldValue.increment(1) });
      return 'wrong';
    }
    transaction.delete(ref);
    return 'ok';
  });
}
