import type { VersionConfig } from './types';

/**
 * Safe default for the native-update gate. Returned by GET /api/version-config
 * whenever nothing has been written yet, so the app ALWAYS gets a well-formed,
 * non-blocking config — a fresh deploy can never accidentally brick the app with
 * a forced update. The admin edits this via PUT; edits persist in the store.
 */
export const DEFAULT_VERSION_CONFIG: VersionConfig = {
  latestVersion: '1.0.0',
  minSupportedVersion: '1.0.0',
  forceUpdate: false,
  downloadUrl: 'https://swag.gg/app', // placeholder store/landing URL
  message: 'A new version of SWAG is available.',
};
