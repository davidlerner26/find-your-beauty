import { createHash } from 'node:crypto';
import { Firestore, Timestamp } from 'firebase-admin/firestore';

export type RateLimit = {
  // What is being limited, e.g. 'reset-email'
  scope: string;
  // Who: an e-mail or an IP. Only its hash is stored.
  key: string;
  max: number;
  windowSeconds: number;
};

// Counters live in rateLimits/{hash}, which no Firestore rule opens: only these functions use them.
// Set a TTL policy on `expiresAt` in the Firestore console to have old counters deleted.
const counterId = ({ scope, key }: RateLimit) =>
  createHash('sha256').update(`${scope}:${key}`).digest('hex');

// Counts one hit in a fixed window. Returns false when the limit was already reached.
export async function hit(db: Firestore, limit: RateLimit, now = Date.now()) {
  const ref = db.doc(`rateLimits/${counterId(limit)}`);
  const windowMs = limit.windowSeconds * 1000;

  return db.runTransaction(async (transaction) => {
    const saved = (await transaction.get(ref)).data();
    const fresh = !saved || now - (saved['windowStart'] as number) >= windowMs;
    if (!fresh && (saved['count'] as number) >= limit.max) return false;

    const windowStart = fresh ? now : (saved['windowStart'] as number);
    transaction.set(ref, {
      scope: limit.scope,
      count: fresh ? 1 : (saved['count'] as number) + 1,
      windowStart,
      expiresAt: Timestamp.fromMillis(windowStart + windowMs),
    });
    return true;
  });
}

// The IP of the caller of a callable function
export const clientIp = (request: { rawRequest?: { ip?: string; headers?: object } }) => {
  const forwarded = (request.rawRequest?.headers as Record<string, unknown> | undefined)?.[
    'x-forwarded-for'
  ];
  return (
    request.rawRequest?.ip ?? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '')
  );
};
