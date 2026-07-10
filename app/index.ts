import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';

import { initSentry } from './src/services/sentry/sentryService';
import App from './App';

// Sentry first — before any component renders — so every JS error, unhandled
// rejection, and native crash from the very first frame is captured.
initSentry();

// Sentry.wrap adds the touch-event breadcrumb + error boundary around the root.
// registerRootComponent calls AppRegistry.registerComponent('main', ...) and sets
// the environment up for both dev builds and production.
registerRootComponent(Sentry.wrap(App));
