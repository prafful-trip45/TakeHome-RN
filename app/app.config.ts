import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Task 10 (M7): Firebase native config activates automatically once the
// credential files exist — until then prebuild/EAS stays green without them.
// Local path: app/src/firebase/*; on EAS the file-type env vars override so the
// gitignored files don't need to be committed.
const androidGoogleServices =
  process.env.GOOGLE_SERVICES_JSON ?? './src/firebase/google-services.json';
const iosGoogleServices =
  process.env.GOOGLE_SERVICE_INFO_PLIST ?? './src/firebase/GoogleService-Info.plist';
const hasGoogleServicesAndroid = existsSync(androidGoogleServices);
const hasGoogleServicesIos = existsSync(iosGoogleServices);
const firebaseEnabled = hasGoogleServicesAndroid || hasGoogleServicesIos;

/** Firebase plugin entries, typed to match ExpoConfig['plugins'] (no readonly). */
const firebasePlugins: (string | [string, Record<string, unknown>])[] = firebaseEnabled
  ? ['@react-native-firebase/app', ['expo-build-properties', { ios: { useFrameworks: 'static' } }]]
  : [];

// Task 4: https App Links (Android) / Universal Links (iOS) host. MUST match the
// deployed domain that serves /.well-known/assetlinks.json + /apple-app-site-association
// (both stubbed in admin/public). Env-overridable so the real Vercel domain can be
// set without a code change; keep in sync with linkPrefixes in linkingConfig.ts.
const appLinkHost = process.env.EXPO_PUBLIC_APP_LINK_HOST ?? 'take-home-rn.vercel.app';

/**
 * Dynamic Expo config (single source of truth — replaces app.json).
 * Env/secrets flow in via `extra` and are read through src/config/env.ts.
 * Native feature plugins (splash, notifications, sentry, firebase) are added in
 * their respective milestones (M2, M4, M7).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SWAG',
  // Must match the EAS project's slug (the server has this spelling for projectId
  // d4fb6c21-…). Don't "correct" the missing 'n' without renaming the project on
  // expo.dev, or `eas build` fails the slug-match check. Cosmetic only — OTA/build
  // routing use projectId, not slug.
  slug: 'swag-rn-assigment',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'swagassignment',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'gg.swag.assignment',
    // Task 4: Universal Links. Verification is Apple-account-gated (needs the real
    // TEAMID in apple-app-site-association + Associated Domains entitlement) — see
    // DECISIONS O2/O3. Harmless to declare on a simulator build.
    associatedDomains: [`applinks:${appLinkHost}`],
    ...(hasGoogleServicesIos ? { googleServicesFile: iosGoogleServices } : {}),
  },
  android: {
    package: 'gg.swag.assignment',
    ...(hasGoogleServicesAndroid ? { googleServicesFile: androidGoogleServices } : {}),
    // Task 4: Android App Links for https://<host>/screen/N. `autoVerify` makes
    // Android verify against /.well-known/assetlinks.json (fill its SHA-256 from
    // `eas credentials`). The custom swagassignment:// filter is auto-generated
    // from `scheme` above — only the https filter is declared here. These are what
    // populate the app's "Open by default" links once verified.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: appLinkHost, pathPrefix: '/screen' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#000000',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  // Task 6 (M5): OTA via expo-updates / EAS Update.
  // runtimeVersion gates update<->binary compatibility. `appVersion` policy: an
  // update is served only to a binary whose version matches — bump `version`
  // above on ANY native change so we never ship JS referencing an absent module.
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    // Public (non-secret) EAS Update endpoint; env override lets CI/preview point
    // elsewhere. Written canonically by `eas update:configure`.
    url:
      process.env.EXPO_PUBLIC_UPDATES_URL ??
      'https://u.expo.dev/d4fb6c21-5466-4298-8317-2f1355ce97a6',
    // Don't block first paint on the network → fast cold start, offline-safe.
    fallbackToCacheTimeout: 0,
    // useOtaUpdates owns the normal-path check; keep only the native crash-recovery
    // auto-check as a safety net (valid SDK 57 value — not the old 'WIP').
    checkAutomatically: 'ON_ERROR_RECOVERY',
  },
  plugins: [
    'expo-dev-client',
    [
      // Task 10 (M7): Sentry — source-map upload on EAS builds. org/project via
      // env; SENTRY_AUTH_TOKEN is an EAS secret (absent locally → upload skipped,
      // build still succeeds). DSN is runtime config (extra.sentryDsn), not here.
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        organization: process.env.SENTRY_ORG ?? 'swagapp',
        project: process.env.SENTRY_PROJECT ?? 'react-native',
      },
    ],
    // Task 10 (M7): RN-Firebase requires the app plugin + static frameworks on
    // iOS. Both activate only once the google-services files exist (see top).
    ...firebasePlugins,
    [
      // Task 5: Android notification icon must be a white/transparent monochrome
      // silhouette (generated by scripts/gen-icons.mjs), not the full-color logo.
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#000000',
      },
    ],
    [
      'expo-splash-screen',
      {
        // Task 2: full-black native splash, SWAG logo centered.
        // resizeMode 'contain' — the wordmark must never crop on any aspect
        // ratio (notch/tall/tablet); edge-to-edge black comes from
        // backgroundColor, so 'cover' would only risk cropping the logo.
        backgroundColor: '#000000',
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        // Explicit dark variant: identical full-black splash in dark mode.
        dark: {
          backgroundColor: '#000000',
          image: './assets/splash-icon.png',
        },
      },
    ],
  ],
  extra: {
    // Deployed admin panel base URL (Expo push trigger + version-config endpoint).
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? null,
    // Task 10: Sentry DSN via env — never committed (spec). Null → Sentry off.
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
    // EAS project link — the OTA update URL derives from this id; M4 push tokens
    // reuse it (getExpoPushTokenAsync({ projectId })). Public, not a secret.
    eas: { projectId: 'd4fb6c21-5466-4298-8317-2f1355ce97a6' },
  },
});
