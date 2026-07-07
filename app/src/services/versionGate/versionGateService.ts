import { Linking } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { env } from '../../config/env';
import { analyticsEvents } from '../analytics/analyticsService';
import { useAppStore } from '../../store/useAppStore';
import { logger } from '../../utils/logger';
import { storage } from '../../utils/storage';
import type { VersionConfig } from './types';
import { evaluateGate, isVersionString } from './versionCompare';

const SCOPE = 'versionGate';

/**
 * Native/binary update gate (task 8 / M6). Plain-function service writing to the
 * Zustand store (same idiom as notificationService). Distinct from OTA (task 6):
 * OTA ships JS bundles into the SAME binary via expo-updates; this gate handles a
 * NEW binary via a remotely-controlled config from the admin panel.
 *
 * WHAT IS MOCKED (spec-allowed): the download and install legs. 'downloading'
 * ticks fake progress; 'install' persists a simulated installed version (MMKV)
 * and shows success — no real store round-trip. Everything else (remote config,
 * comparison, forced/optional split, consent, persistence, fallback) is real.
 */

// ── Persistence (MMKV, synchronous) ──────────────────────────────────────────
const KEY_DISMISSED = 'versionGate.dismissedVersion';
const KEY_SIMULATED = 'versionGate.simulatedInstalledVersion';

/** Installed binary version: real native value first (verified SDK 57 API,
 *  null on web), config version as dev/web fallback. */
export function getInstalledVersion(): string {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

// ── Config fetch (offline-safe) ──────────────────────────────────────────────
function parseVersionConfig(raw: unknown): VersionConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = (raw as { config?: unknown }).config;
  if (typeof c !== 'object' || c === null) return null;
  const b = c as Record<string, unknown>;
  // Malformed versions ⇒ reject the whole config (fail-open) rather than risk a
  // nonsensical gate decision.
  if (!isVersionString(b.latestVersion) || !isVersionString(b.minSupportedVersion)) return null;
  return {
    latestVersion: b.latestVersion.trim(),
    minSupportedVersion: b.minSupportedVersion.trim(),
    forceUpdate: b.forceUpdate === true,
    downloadUrl: typeof b.downloadUrl === 'string' ? b.downloadUrl : '',
    message: typeof b.message === 'string' ? b.message : undefined,
    updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : undefined,
  };
}

async function fetchVersionConfig(): Promise<VersionConfig | null> {
  if (!env.apiBaseUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/version-config`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn(SCOPE, `config fetch failed (${res.status})`);
      return null;
    }
    return parseVersionConfig(await res.json());
  } catch (err) {
    // Offline / unreachable: fail-open (app stays usable) — documented assumption.
    logger.warn(SCOPE, 'config unreachable (likely offline) — failing open', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Check orchestration ──────────────────────────────────────────────────────
let checkInFlight = false;

/** Phases during which a re-check must NOT stomp the UI (user mid-flow). */
const BUSY_PHASES = new Set(['downloading', 'ready', 'installing', 'installed']);

/**
 * The launch/resume check: fetch remote config → pure evaluate → store phase.
 * Never throws; every failure lands on a phase the UI can render.
 */
export async function checkVersionGate(): Promise<void> {
  const store = useAppStore.getState();
  if (checkInFlight || BUSY_PHASES.has(store.gatePhase)) return;
  checkInFlight = true;
  try {
    if (!env.apiBaseUrl) {
      store.setGatePhase('skipped');
      logger.info(SCOPE, 'no apiBaseUrl configured — gate skipped');
      return;
    }
    store.setGatePhase('checking');
    const config = await fetchVersionConfig();
    if (!config) {
      // Unreachable or malformed → fail-open.
      store.setGateConfig(null);
      store.setGatePhase('error');
      return;
    }
    store.setGateConfig(config);
    const decision = evaluateGate(
      config,
      getInstalledVersion(),
      storage.getString(KEY_SIMULATED) ?? null,
      storage.getString(KEY_DISMISSED) ?? null,
    );
    store.setGatePhase(decision === 'none' ? 'up-to-date' : decision);
    // Task 10 (D5): update-funnel product event — Firebase only, never Sentry.
    if (decision === 'optional' || decision === 'forced') {
      analyticsEvents.updatePromptShown(decision, config.latestVersion);
    }
    logger.info(SCOPE, `decision=${decision}`, {
      installed: getInstalledVersion(),
      latest: config.latestVersion,
      min: config.minSupportedVersion,
      force: config.forceUpdate,
    });
  } finally {
    checkInFlight = false;
  }
}

// ── Mocked download / install (spec: fake progress → ready → install/reload) ─
let progressTimer: ReturnType<typeof setInterval> | null = null;

function clearProgressTimer(): void {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

/** Simulated download: ~3s of fake progress, then 'ready'. Idempotent. */
export function startMockDownload(): void {
  const store = useAppStore.getState();
  if (store.gatePhase !== 'optional' && store.gatePhase !== 'forced') return;
  clearProgressTimer();
  store.setGateProgress(0);
  store.setGatePhase('downloading');
  analyticsEvents.updatePromptAccepted(store.gateConfig?.latestVersion ?? 'unknown');
  progressTimer = setInterval(() => {
    const { gateProgress, setGateProgress, setGatePhase } = useAppStore.getState();
    const next = Math.min(1, gateProgress + 0.04 + Math.random() * 0.04);
    setGateProgress(next);
    if (next >= 1) {
      clearProgressTimer();
      setGatePhase('ready');
    }
  }, 120);
}

/**
 * Simulated install: persist the "installed" version (MMKV) so the gate stops
 * re-prompting for this latestVersion, then show success. A real app would hand
 * off to Play In-App Updates / TestFlight here.
 */
export function installMockUpdate(): void {
  const store = useAppStore.getState();
  if (store.gatePhase !== 'ready' || !store.gateConfig) return;
  store.setGatePhase('installing');
  const { latestVersion } = store.gateConfig;
  setTimeout(() => {
    storage.set(KEY_SIMULATED, latestVersion);
    storage.remove(KEY_DISMISSED); // a fresh "binary" resets old dismissals
    useAppStore.getState().setGatePhase('installed');
    logger.info(SCOPE, `simulated install of v${latestVersion} complete`);
  }, 800);
}

/** User consent respected: persist the dismissal for THIS latestVersion only —
 *  a future, newer version prompts again. Forced updates never call this. */
export function dismissOptionalUpdate(): void {
  const store = useAppStore.getState();
  if (store.gatePhase !== 'optional' || !store.gateConfig) return;
  storage.set(KEY_DISMISSED, store.gateConfig.latestVersion);
  store.setGatePhase('up-to-date');
  analyticsEvents.updatePromptDismissed(store.gateConfig.latestVersion);
  logger.info(SCOPE, `optional update v${store.gateConfig.latestVersion} dismissed`);
}

/** Post-install acknowledgement: close the modal. */
export function acknowledgeInstalled(): void {
  const store = useAppStore.getState();
  if (store.gatePhase === 'installed') store.setGatePhase('up-to-date');
}

/**
 * Fallback branch (spec-required): open the store listing when the in-app path
 * is unavailable. `downloadUrl` is a documented placeholder in this assignment.
 */
export async function openStoreFallback(): Promise<void> {
  const url = useAppStore.getState().gateConfig?.downloadUrl;
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch (err) {
    logger.warn(SCOPE, 'store fallback failed to open', err);
  }
}

/** Dev/demo helper (DevPanel): wipe persisted gate state so flows can be replayed. */
export function resetGatePersistence(): void {
  storage.remove(KEY_DISMISSED);
  storage.remove(KEY_SIMULATED);
  const store = useAppStore.getState();
  clearProgressTimer();
  store.setGateProgress(0);
  store.setGatePhase('idle');
  logger.info(SCOPE, 'persisted gate state reset');
}
