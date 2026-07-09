import { logger } from './logger';

/**
 * Lightweight shared-secret guard for MUTATING routes (send, version-config PUT,
 * token delete). Not a real auth system — appropriate for a single-operator
 * admin panel. The secret lives only in `ADMIN_TOKEN` (server env); the UI
 * collects it and sends it as `x-admin-token`.
 *
 * If ADMIN_TOKEN is unset, the gate is OPEN (dev convenience). We warn loudly so
 * an unprotected production deploy is at least visible in the logs.
 */
export function requireAdmin(req: Request): { ok: true } | { ok: false; status: 401 | 403 } {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    logger.warn('ADMIN_TOKEN is not set — mutating routes are UNPROTECTED.');
    return { ok: true };
  }

  const provided = req.headers.get('x-admin-token');
  if (!provided) return { ok: false, status: 401 };
  // Length check first so timingSafeEqual doesn't throw on mismatched sizes.
  if (!constantTimeEqual(provided, expected)) return { ok: false, status: 403 };
  return { ok: true };
}

/** Constant-time string compare to avoid leaking the secret via timing. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
