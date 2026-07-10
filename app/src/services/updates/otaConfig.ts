import * as Updates from 'expo-updates';

/**
 * OTA is inert in debug builds and Expo Go, where `Updates.isEnabled` is false
 * (updates apply only to release builds, or debug builds with
 * EX_UPDATES_NATIVE_DEBUG). Gate every entry point on this so nothing throws in
 * development.
 */
export function isOtaActive(): boolean {
  return Updates.isEnabled;
}

/** Read-only snapshot for an in-app debug row. */
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
