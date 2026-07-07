import { requireAdmin } from '@/lib/auth';
import { DEFAULT_VERSION_CONFIG } from '@/lib/defaults';
import { fail, ok, readJson } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getStore } from '@/lib/store';
import type { VersionConfig } from '@/lib/types';
import { compareVersions, isVersionString } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The remote source of truth for the native/binary update gate (Task 8). The app
 * fetches this on launch to decide forced vs optional vs no-update — so it must
 * be remotely controllable without an app rebuild (this route is exactly that).
 *
 *   GET  — public. Always returns a well-formed config (defaults if unset), so the
 *          app can never be bricked by a missing/partial config.
 *   PUT  — guarded. Validates before persisting so a bad edit can't ship an
 *          uncomparable version string to every device.
 */
export async function GET() {
  try {
    const stored = await getStore().getVersionConfig();
    return ok({ config: stored ?? DEFAULT_VERSION_CONFIG });
  } catch (err) {
    // Even if storage is down, hand the app a safe, non-blocking config.
    logger.error('version-config GET failed; serving defaults', err);
    return ok({ config: DEFAULT_VERSION_CONFIG });
  }
}

export async function PUT(req: Request) {
  const guard = requireAdmin(req);
  if (!guard.ok) return fail(guard.status, 'Unauthorized.');

  const raw = await readJson(req);
  if (typeof raw !== 'object' || raw === null) return fail(400, 'Body must be JSON.');
  const b = raw as Record<string, unknown>;

  if (!isVersionString(b.latestVersion)) return fail(400, 'latestVersion must be like "1.2.0".');
  if (!isVersionString(b.minSupportedVersion))
    return fail(400, 'minSupportedVersion must be like "1.2.0".');

  // Guard against a self-contradictory gate.
  if (compareVersions(b.minSupportedVersion, b.latestVersion) > 0) {
    return fail(400, 'minSupportedVersion cannot be greater than latestVersion.');
  }

  const config: VersionConfig = {
    latestVersion: b.latestVersion.trim(),
    minSupportedVersion: b.minSupportedVersion.trim(),
    forceUpdate: b.forceUpdate === true,
    downloadUrl:
      typeof b.downloadUrl === 'string' && b.downloadUrl.trim()
        ? b.downloadUrl.trim()
        : DEFAULT_VERSION_CONFIG.downloadUrl,
    message: typeof b.message === 'string' ? b.message.slice(0, 300) : undefined,
    updatedAt: new Date().toISOString(),
  };

  try {
    await getStore().setVersionConfig(config);
    logger.info('version-config updated', config);
    return ok({ config });
  } catch (err) {
    logger.error('version-config PUT failed', err);
    return fail(503, 'Config storage is temporarily unavailable.');
  }
}
