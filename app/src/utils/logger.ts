import * as Sentry from '@sentry/react-native';

/**
 * App logger. Console output is dev-only — release builds stay silent (no terminal
 * noise); warn/error still forward to Sentry (warn → breadcrumb, error → captured).
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
    if (__DEV__) console.warn(tag(scope, message), ...args);
    Sentry.addBreadcrumb({ level: 'warning', category: scope, message });
  },
  error(scope: string, message: string, ...args: LogArgs): void {
    if (__DEV__) console.error(tag(scope, message), ...args);
    const err = args.find((a): a is Error => a instanceof Error);
    if (err) {
      Sentry.captureException(err, { tags: { scope }, extra: { message } });
    } else {
      Sentry.captureMessage(tag(scope, message), 'error');
    }
  },
};
