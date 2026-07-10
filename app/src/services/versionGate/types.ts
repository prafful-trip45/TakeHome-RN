/**
 * Contracts for the native/binary update gate.
 * `VersionConfig` mirrors `admin/src/lib/types.ts` — the shape served by
 * GET /api/version-config. Keep the two in sync.
 */
export interface VersionConfig {
  /** Newest binary available to install. */
  latestVersion: string;
  /** Below this, usage is blocked until updated (forced). */
  minSupportedVersion: string;
  /** Hard override: force even users at/above minSupportedVersion. */
  forceUpdate: boolean;
  /** Store/landing fallback URL. */
  downloadUrl: string;
  /** Optional copy shown in the update prompt. */
  message?: string;
  /** ISO timestamp of the last admin edit. */
  updatedAt?: string;
}

/** Pure gate outcome; dismissals etc. are inputs, not state. */
export enum GateDecision {
  None = 'none',
  Optional = 'optional',
  Forced = 'forced',
}
