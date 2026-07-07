import { fail, ok, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getStore } from '@/lib/store';
import type { DeviceToken } from '@/lib/types';
import { isExpoPushToken, normalizeToken } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/register — the RN app registers (or refreshes) its Expo push token.
 * Public: the app has no admin secret. Idempotent: re-registering the same token
 * updates its metadata and `updatedAt` rather than duplicating it.
 */
export async function POST(req: Request) {
  const raw = await readJson(req);
  if (typeof raw !== 'object' || raw === null) return fail(400, 'Body must be JSON.');
  const b = raw as Record<string, unknown>;

  if (!isExpoPushToken(b.token)) return fail(400, 'A valid Expo push token is required.');
  const token = normalizeToken(b.token as string);

  const platform: DeviceToken['platform'] =
    b.platform === 'ios' || b.platform === 'android' ? b.platform : 'unknown';

  try {
    const store = getStore();
    const existing = (await store.listTokens()).find((t) => t.token === token);
    const now = new Date().toISOString();

    const record: DeviceToken = {
      token,
      platform,
      deviceName: typeof b.deviceName === 'string' ? b.deviceName.slice(0, 120) : undefined,
      appVersion: typeof b.appVersion === 'string' ? b.appVersion.slice(0, 40) : undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await store.upsertToken(record);
    logger.info(`Registered token (${platform})`);
    return ok({ token: record.token, isNew: !existing });
  } catch (err) {
    // Storage down should not break the app's startup flow — report cleanly.
    logger.error('register failed', err);
    return fail(503, 'Token storage is temporarily unavailable.');
  }
}
