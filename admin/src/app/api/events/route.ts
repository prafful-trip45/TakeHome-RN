import { fail, ok, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getStore } from '@/lib/store';
import type { NotificationEvent } from '@/lib/types';
import { isScreenTarget } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Notification analytics (Bonus: delivered/opened surfaced in admin).
 *
 *   POST — public. The app fires this when a notification is opened (and can also
 *          report a client-side "delivered"). Best-effort: a failure here must
 *          never disrupt the app, so we always 200 unless the body is unusable.
 *   GET  — counts for the admin dashboard.
 */
export async function POST(req: Request) {
  const raw = await readJson(req);
  const type = (raw as { type?: unknown } | null)?.type;
  if (type !== 'opened' && type !== 'delivered') {
    return fail(400, 'type must be "opened" or "delivered".');
  }

  const b = raw as Record<string, unknown>;
  const event: NotificationEvent = {
    type,
    screen: isScreenTarget(b.screen) ? b.screen : undefined,
    token: typeof b.token === 'string' ? b.token : undefined,
    at: new Date().toISOString(),
  };

  try {
    await getStore().recordEvent(event);
  } catch (err) {
    // Analytics is non-critical — swallow so the app's open flow is never blocked.
    logger.warn('event record failed (ignored)', err);
  }
  return ok({ recorded: true });
}

export async function GET() {
  try {
    const counts = await getStore().getEventCounts();
    return ok({ counts });
  } catch (err) {
    logger.error('event counts failed', err);
    return ok({ counts: {} });
  }
}
