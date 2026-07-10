const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Resolves the Android manifest-merger conflict between expo-notifications and
 * @react-native-firebase/messaging.
 *
 * Both declare `com.google.firebase.messaging.default_notification_color` (and
 * `_icon`) with different resource values — expo-notifications sets our
 * `@color/notification_icon_color`, RN-Firebase's own manifest sets `@color/white`.
 * The merger can't pick a winner and fails `processReleaseMainManifest` with:
 *   Suggestion: add 'tools:replace="android:resource"' ...
 *
 * This plugin stamps `tools:replace="android:resource"` on the two Firebase
 * meta-data elements so our value wins deterministically. It is order-independent:
 * whether or not expo-notifications has already added the elements when this mod
 * runs, we ensure they exist with the right resource + tools:replace. Applied at
 * prebuild time so it survives `expo prebuild --clean`.
 */
const FIREBASE_META = {
  'com.google.firebase.messaging.default_notification_color': '@color/notification_icon_color',
  'com.google.firebase.messaging.default_notification_icon': '@drawable/notification_icon',
};

module.exports = function withFirebaseNotificationManifestFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app['meta-data'] = app['meta-data'] ?? [];

    for (const [name, resource] of Object.entries(FIREBASE_META)) {
      let el = app['meta-data'].find((m) => m.$?.['android:name'] === name);
      if (!el) {
        el = { $: { 'android:name': name } };
        app['meta-data'].push(el);
      }
      el.$['android:resource'] = resource;
      el.$['tools:replace'] = 'android:resource';
    }

    return cfg;
  });
};
