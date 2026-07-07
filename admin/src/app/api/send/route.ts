import { requireAdmin } from '@/lib/auth';
import { buildMessage, isDeadTokenError, sendPush } from '@/lib/expo-push';
import { fail, ok, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getStore } from '@/lib/store';
import { validateSendBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/send — compose and send a push notification via the Expo push
 * service (Task 7 core). Guarded by the admin secret. The EXPO_ACCESS_TOKEN is
 * read server-side only and never leaves this function.
 *
 * Recipients: explicit `tokens[]`, or `toAll: true` to blast every registered
 * device. Dead tokens (DeviceNotRegistered) are auto-pruned from the registry.
 */
export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (!guard.ok) return fail(guard.status, 'Unauthorized. Provide the admin token.');

  const parsed = validateSendBody(await readJson(req));
  if (!parsed.ok) return fail(400, parsed.error);
  const { title, body, screen, highlight, tokens, toAll } = parsed.value;

  const store = getStore();

  // Resolve the recipient list.
  let recipients: string[];
  if (toAll) {
    try {
      recipients = (await store.listTokens()).map((t) => t.token);
    } catch (err) {
      logger.error('send: could not read token registry', err);
      return fail(503, 'Could not read the token registry for a broadcast.');
    }
  } else {
    recipients = tokens ?? [];
  }

  if (recipients.length === 0) {
    // Clear, actionable error instead of a confusing empty Expo call.
    return fail(422, 'No recipients. Register a device or enter a token first.');
  }

  const messages = recipients.map((to) => buildMessage(to, title, body, screen, highlight));
  const results = await sendPush(messages);

  // Prune tokens Expo reports as no-longer-registered so the registry stays clean.
  const dead = results.filter((r) => isDeadTokenError(r.error)).map((r) => r.token);
  if (dead.length > 0) {
    logger.info(`Pruning ${dead.length} dead token(s).`);
    await Promise.allSettled(dead.map((t) => store.deleteToken(t)));
  }

  const sent = results.filter((r) => r.status === 'ok').length;
  const failed = results.length - sent;

  return ok({
    summary: { total: results.length, sent, failed, pruned: dead.length },
    results,
  });
}
