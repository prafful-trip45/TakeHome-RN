/**
 * Tiny server-side logger. Route handlers use this instead of bare console.* so
 * the log surface is consistent and greppable. In production only warn/error are
 * emitted; debug/info are silenced to keep function logs quiet.
 */
const isProd = process.env.NODE_ENV === 'production';

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, meta?: unknown) {
  if (isProd && (level === 'debug' || level === 'info')) return;
  const line = `[admin:${level}] ${msg}`;
  // eslint-disable-next-line no-console
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) sink(line, meta);
  else sink(line);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
