import { requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getStore } from '@/lib/store';
import { isExpoPushToken, normalizeToken } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/tokens — list registered devices for the admin UI. */
export async function GET() {
  try {
    const store = getStore();
    const tokens = await store.listTokens();
    return ok({ tokens, count: tokens.length, driver: store.driver });
  } catch (err) {
    logger.error('list tokens failed', err);
    return fail(503, 'Token storage is temporarily unavailable.');
  }
}

/** DELETE /api/tokens — remove a token (guarded). Body: { token }. */
export async function DELETE(req: Request) {
  const guard = requireAdmin(req);
  if (!guard.ok) return fail(guard.status, 'Unauthorized.');

  const raw = await readJson(req);
  const token = (raw as { token?: unknown } | null)?.token;
  if (!isExpoPushToken(token)) return fail(400, 'A valid token is required.');

  try {
    await getStore().deleteToken(normalizeToken(token));
    return ok({ deleted: normalizeToken(token) });
  } catch (err) {
    logger.error('delete token failed', err);
    return fail(503, 'Token storage is temporarily unavailable.');
  }
}
