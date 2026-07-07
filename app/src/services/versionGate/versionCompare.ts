import type { GateDecision, VersionConfig } from './types';

/**
 * Pure version helpers (no native imports → unit-testable in isolation, like
 * navigation/deeplinks.ts). `compareVersions` is a copy of the canonical
 * implementation in `admin/src/lib/validation.ts` — keep them in sync.
 */

const VERSION_RE = /^\d+(\.\d+){0,3}$/;

/** Dotted numeric versions only (1, 1.0, 1.2.3, 1.2.3.4). */
export function isVersionString(value: unknown): value is string {
  return typeof value === 'string' && VERSION_RE.test(value.trim());
}

/** Compare dotted numeric versions; missing segments are 0 ("1.2" === "1.2.0"). */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.trim().split('.').map(Number);
  const pb = b.trim().split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * The gate decision, as a pure function of its inputs:
 *
 *   effective = max(installed, simulatedInstalled)   // mock "install" bumps this
 *   effective >= latest                    → none
 *   effective <  minSupported || force     → forced
 *   otherwise (newer exists)               → optional, unless the user already
 *                                            dismissed THIS latestVersion
 *
 * A malformed config never throws — callers pre-validate with isVersionString
 * and treat invalid as "no update" (fail-open; documented assumption).
 */
export function evaluateGate(
  config: VersionConfig,
  installedVersion: string,
  simulatedInstalledVersion: string | null,
  dismissedVersion: string | null,
): GateDecision {
  const effective =
    simulatedInstalledVersion && compareVersions(simulatedInstalledVersion, installedVersion) > 0
      ? simulatedInstalledVersion
      : installedVersion;

  if (compareVersions(effective, config.latestVersion) >= 0) return 'none';
  if (config.forceUpdate || compareVersions(effective, config.minSupportedVersion) < 0) {
    return 'forced';
  }
  if (dismissedVersion === config.latestVersion) return 'none';
  return 'optional';
}
