import { ScreenScaffold } from './ScreenScaffold';

/** Screen 3 — translucent status bar: semi-transparent indigo band + light icons. */
export function Screen3() {
  return (
    <ScreenScaffold title="Screen 3" statusBarColor="rgba(99,102,241,0.6)" statusBarStyle="light" />
  );
}
