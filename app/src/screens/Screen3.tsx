import { ScreenScaffold } from './ScreenScaffold';

/**
 * Screen 3 — COLORED / TRANSLUCENT status bar: a semi-transparent indigo band
 * (the shared body shows through → translucent) + light icons (task 9).
 */
export function Screen3() {
  return (
    <ScreenScaffold title="Screen 3" statusBarColor="rgba(99,102,241,0.6)" statusBarStyle="light" />
  );
}
