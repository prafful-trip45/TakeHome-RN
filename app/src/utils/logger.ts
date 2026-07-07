import * as Sentry from '@sentry/react-native';

/**
 * Lightweight logger. Debug/info are gated by __DEV__ so no stray console noise
 * ships in prod critical paths. warn/error always fire and forward to Sentry
 * (task 10): warn → breadcrumb (context on the next event), error → captured
 * event. Sentry APIs are safe no-ops before/without init, so this file depends
 * only on the SDK — no service import, no cycle.
 */
type LogArgs = readonly unknown[];

function tag(scope: string, message: string): string {
  return `[${scope}] ${message}`;
}

export const logger = {
  debug(scope: string, message: string, ...args: LogArgs): void {
    if (__DEV__) console.log(tag(scope, message), ...args);
  },
  info(scope: string, message: string, ...args: LogArgs): void {
    if (__DEV__) console.info(tag(scope, message), ...args);
  },
  warn(scope: string, message: string, ...args: LogArgs): void {
    console.warn(tag(scope, message), ...args);
    Sentry.addBreadcrumb({ level: 'warning', category: scope, message });
  },
  error(scope: string, message: string, ...args: LogArgs): void {
    console.error(tag(scope, message), ...args);
    const err = args.find((a): a is Error => a instanceof Error);
    if (err) {
      Sentry.captureException(err, { tags: { scope }, extra: { message } });
    } else {
      Sentry.captureMessage(tag(scope, message), 'error');
    }
  },
};
