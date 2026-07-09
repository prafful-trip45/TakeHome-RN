# SWAG — React Native Developer Assignment

An Expo (SDK 57) React Native app + a Next.js admin panel demonstrating the platform
fundamentals: navigation, native splash/icons, push notifications, deep linking &
App Links, OTA updates, in-app/forced version gating, crash/error reporting, and
performance hygiene.

**Mono-repo:**

```
app/     Expo React Native app (SDK 57, TypeScript strict, New Architecture, Hermes)
admin/   Next.js (App Router) admin panel — push sender, token registry, version-gate config
tech/    Planning + per-task solution docs + the on-device verification checklist
```

## Live links

| | |
|---|---|
| **Admin panel (Vercel)** | https://take-home-rn.vercel.app |
| **Repo** | https://github.com/prafful-trip45/TakeHome-RN |
| **App test build** | Dev-client via `npm run rebuild:android` (below), or an EAS build (`eas build -p android`) |

## App identity

| | |
|---|---|
| Display name | **SWAG** |
| Android package / iOS bundle id | `gg.swag.assignment` |
| Custom scheme | `swagassignment://` |
| App Links host | `take-home-rn.vercel.app` |
| Expo/EAS slug · projectId | `swag-rn-assigment` · `d4fb6c21-5466-4298-8317-2f1355ce97a6` |

---

## Prerequisites

- **Node 20+**, **npm**
- For local Android builds: **JDK 17**, **Android SDK** + `ANDROID_HOME`, a device/emulator (`adb`)
- **EAS CLI** (`npm i -g eas-cli`) for cloud builds / OTA publishing
- A physical Android device with **USB debugging** on (or an emulator)

> Not runnable in **Expo Go** — the app uses native modules (Sentry, RN-Firebase,
> notification channels, MMKV) and features that require a dev/release build.

---

## Setup & run

### App

```bash
cd app
npm install
cp .env.example .env        # then fill values (see "Environment" below)
npm run rebuild:android     # prebuild (clean) + build + install on the connected device
```

Subsequent JS-only changes hot-reload via Metro (`npm start`). Re-run
`npm run rebuild:android` only after **native config** changes (plugins, intent-filters,
permissions, icons, splash).

**Scripts** ([app/package.json](app/package.json)):

| Script | Command | When |
|---|---|---|
| `npm start` | `expo start` | Metro dev server (JS reloads) |
| `npm run android` | `expo run:android` | build + run (picks device/emulator) |
| `npm run android:device` | `expo run:android --device` | build + run on the **connected phone** |
| `npm run prebuild:android` | `expo prebuild --clean -p android` | regenerate native project from `app.config.ts` |
| `npm run rebuild:android` | prebuild + run:android:device | **after any native-config change** |
| `npm run icons:gen` | `node scripts/gen-icons.mjs` | regenerate all icon variants from the SWAG logo |
| `npm run lint` · `lint:fix` | `eslint .` | lint (`eslint-config-expo`, ESLint 9 flat config) |
| `npm run format` · `format:check` | `prettier --write .` | format (single-quote, 100-col — matches admin) |

### Admin

```bash
cd admin
npm install
cp .env.example .env.local   # set ADMIN_TOKEN + Upstash creds (see below)
npm run dev                  # → http://localhost:3000
```

Already deployed at **https://take-home-rn.vercel.app** (see [admin/README.md](admin/README.md)
for the full Vercel deploy guide — set **Root Directory = `admin`**).

---

## Build / where the test build lives

- **Local dev-client (fastest):** `cd app && npm run rebuild:android` → installs onto the
  connected device. Debug-signed (`~/.android/debug.keystore`).
- **EAS (shareable APK / OTA-capable):**
  ```bash
  cd app
  eas build --profile preview -p android     # internal-distribution APK
  ```
  Install the resulting `.apk` (`adb install` or the build QR). A **preview** build is
  required to test **OTA** (inert in debug) and clean unhandled-JS crash capture.

---

## Environment

Nothing sensitive is committed. `EXPO_PUBLIC_*` values are inlined into the JS bundle
(client-visible by design); everything in `admin/.env.local` is server-only.

**app/.env** ([template](app/.env.example)):

| Key | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Admin base URL — `https://take-home-rn.vercel.app` (push registry, version-gate, events) |
| `EXPO_PUBLIC_APP_LINK_HOST` | App Links / Universal Links host — `take-home-rn.vercel.app` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (empty ⇒ Sentry off) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | source-map upload at build time (EAS secret) |
| `EXPO_PUBLIC_UPDATES_URL` | optional override for the EAS Update endpoint |
| Firebase | `app/src/firebase/google-services.json` + `GoogleService-Info.plist` (files, gitignored) |

**admin/.env.local** ([template](admin/.env.example)):

| Key | Purpose |
|---|---|
| `ADMIN_TOKEN` | shared secret guarding mutating routes (UI sends it as `x-admin-token`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | durable token registry + version-config (else in-memory, resets on cold start) |
| `EXPO_ACCESS_TOKEN` | optional — only if Expo "Enhanced push security" is enabled |

---

## How to test each feature

### 1. Deep links & App Links
Scheme `swagassignment://`, routes `screen/1|2|3` (+ `?highlight=true` — the screen reacts
by highlighting its title).

```bash
# custom scheme (works on any dev/preview build)
npx uri-scheme open "swagassignment://screen/2" --android
npx uri-scheme open "swagassignment://screen/3?highlight=true" --android

# cold start: kill first, then open
adb shell am force-stop gg.swag.assignment
adb shell am start -a android.intent.action.VIEW -d "swagassignment://screen/1" gg.swag.assignment

# https App Links (after admin deploy + rebuild + verification)
adb shell pm get-app-links gg.swag.assignment            # → take-home-rn.vercel.app: verified
adb shell am start -a android.intent.action.VIEW -d "https://take-home-rn.vercel.app/screen/2"
```

### 2. Push notifications
1. Open the app → grant the notification permission → tap the **DevPanel** pill (top-left) →
   confirm **Admin registration: registered** and copy the Expo push token.
2. In the admin (**Send** form): title, body, **screen target (1/2/3)**, pick the token (or "all") → **Send**.
3. Tap the notification → it deep-navigates to the target screen. Test **foreground /
   background / killed** states.

### 3. OTA update *(preview build)*
```bash
cd app
# edit Screen1.tsx text, then:
eas update --channel preview --message "Screen 1 (OTA)"
```
Relaunch the installed build → banner "A new version is ready" → **Reload** → new JS runs,
**without a store build**.

### 4. In-app / forced update (native version gate) — mocked, admin-driven
Drive it from the admin **Version-config** form (`latestVersion`, `minSupportedVersion`,
`forceUpdate`), then DevPanel → **Re-check update gate**:
- `latestVersion` > installed, `forceUpdate: false` → **optional** modal (Update now / Not now, dismissal persists)
- installed < `minSupportedVersion` → **forced** blocking modal (no dismiss)
- Accept → simulated download (progress) → install → success. **Reset gate persistence** (DevPanel) replays it.

> Distinct from OTA: OTA ships **JS** into the same binary; the version gate handles a
> **new binary** (download/install mocked per spec). Config is remotely controllable via the admin.

### 5. Crash & error reporting
DevPanel (top-left) →
- **Send test error (captured)** → lands in **Sentry**
- **Throw unhandled JS error** → Sentry (on a preview build; dev RedBox intercepts first)
- **Trigger native crash** → relaunch → native crash in Sentry (symbolicated, tagged release/version/platform/non-PII id)
- **Firebase Analytics** events (`screen_view`, `notification_opened`, `ota_applied`, `update_prompt_*`) appear in DebugView

Division of responsibility (**D5**): **Sentry owns all errors/crashes; Firebase owns analytics only** → no duplicate reporting.

---

## Architecture overview & key decisions

| Area | Choice | Why |
|---|---|---|
| Navigation | React Navigation v7 (native-stack → floating tabs) | direct control of the floating bar + `navigationRef`/queue for killed-state routing |
| Deep-link/notification routing | one unified React Navigation `linking` resolver (no redux) | auth-less, client-known destinations → one declarative resolver covers URLs + notification taps across fg/bg/killed |
| State | Zustand + MMKV | tiny global state; sync MMKV persistence (never AsyncStorage) |
| OTA | `expo-updates` (EAS Update), `runtimeVersion: appVersion`, consent banner | spec-mandated; observed via `useUpdates()` (SDK 57 removed the event-listener API) |
| Version gate | mocked download/install driven by remote admin config | spec allows simulation; distinct from OTA |
| Observability | Sentry (errors/crashes) + Firebase Analytics only | zero-overlap, clean "no duplicate reporting" story |
| Status bar | shared body + painted top-inset band + `barStyle` on focus | edge-to-edge has no settable bar background; verifiable per-screen |
| Types | string **enums** for all state machines | named, refactor-safe, no magic strings |

Full detail: per-task solution docs in **[tech/tasks/](tech/tasks/)**, decisions in
**[tech/DECISIONS.md](tech/DECISIONS.md)**, and the on-device runbook in
**[tech/VERIFICATION.md](tech/VERIFICATION.md)**.

## Performance notes

- Hermes on (New Architecture default; shown live in DevPanel; bundle → `.hbc`).
- Fast cold start: OTA + notification + version-gate checks run **after** first paint
  (`fallbackToCacheTimeout: 0`), never blocking the JS thread.
- Notification/deep-link listeners registered **once** (in the linking resolver) and torn
  down on unmount; resume checks use a single `AppState` subscription each.
- `memo`/`useCallback` where it matters; no Zustand mirroring of native update state.

## Known limitations / what I'd improve

- **iOS** is Android-first here; Universal Links + push need a paid Apple account (declared, not verified).
- **App Links** verify against the **debug** keystore fingerprint; add the EAS keystore SHA-256 to
  `assetlinks.json` for release builds.
- **Version gate** download/install is simulated (spec-permitted); a real build would wire Play In-App Updates.
- **EAS slug** carries a typo (`swag-rn-assigment`) to match the existing EAS project — cosmetic only.
- No CI yet; a few services (`deeplinks`, `versionCompare`) are pure and unit-test-ready.

---

## Docs

- **[tech/VERIFICATION.md](tech/VERIFICATION.md)** — ordered on-device test runbook (debug vs preview build matrix)
- **[tech/tasks/](tech/tasks/)** — per-task solution docs (requirements → architecture → implementation → diagram)
- **[tech/DECISIONS.md](tech/DECISIONS.md)** · **[tech/TASKS.md](tech/TASKS.md)** · **[tech/MILESTONES.md](tech/MILESTONES.md)** · **[tech/PROGRESS.md](tech/PROGRESS.md)**
- **[admin/README.md](admin/README.md)** — admin panel setup, API routes, Vercel deploy
