import * as Updates from 'expo-updates';

/**
 * OTA (task 6 / M5) is inert in debug builds and Expo Go: `Updates.isEnabled` is
 * false there (per the SDK 57 docs, updates apply only to release builds — and
 * debug builds with EX_UPDATES_NATIVE_DEBUG). Gate EVERY entry point on this so
 * nothing throws in development.
 */
export function isOtaActive(): boolean {
  return Updates.isEnabled;
}

/** Read-only snapshot for an in-app debug row (channel / runtimeVersion / update id). */
export function otaDebugInfo(): {
  channel: string;
  runtimeVersion: string;
  updateId: string;
  isEmbeddedLaunch: boolean;
} {
  return {
    channel: Updates.channel ?? 'n/a',
    runtimeVersion: Updates.runtimeVersion ?? 'n/a',
    updateId: Updates.updateId ?? 'embedded',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
