// ESLint 9 flat config for the Expo app (SDK 57).
// - eslint-config-expo: the RN/Expo + TypeScript rule set (SDK-matched, v57).
// - eslint-config-prettier: turns OFF stylistic rules so Prettier owns formatting
//   (run `npm run format`); ESLint stays focused on correctness, not style.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    // Generated / native / vendored — not ours to lint.
    ignores: ['android/*', 'ios/*', '.expo/*', 'dist/*', 'node_modules/*'],
  },
]);
