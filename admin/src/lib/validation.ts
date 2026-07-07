import { SCREEN_TARGETS, type ScreenTarget } from './types';

/**
 * Pure request validators. Kept free of Next/Node imports so they are trivially
 * unit-testable and reusable across routes. Each returns a discriminated result
 * so callers can branch without throwing.
 */

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** Expo tokens look like `ExponentPushToken[xxxxxxxx]` (or the older
 *  `ExpoPushToken[...]`). We validate shape, not authenticity — an unknown token
 *  simply comes back from Expo as `DeviceNotRegistered` and gets pruned. */
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && EXPO_TOKEN_RE.test(value.trim());
}

export function normalizeToken(value: string): string {
  return value.trim();
}

export function isScreenTarget(value: unknown): value is ScreenTarget {
  return typeof value === 'string' && (SCREEN_TARGETS as readonly string[]).includes(value);
}

/** Expo caps a single notification's payload at ~4 KiB. Guard title+body+data
 *  well under that so we return a clean 400 instead of an opaque MessageTooBig. */
const MAX_TITLE = 200;
const MAX_BODY = 2000;

export function validateSendBody(raw: unknown): Validated<{
  title: string;
  body: string;
  screen: ScreenTarget;
  highlight: boolean;
  tokens?: string[];
  toAll: boolean;
}> {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Body must be an object.' };
  const b = raw as Record<string, unknown>;

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const body = typeof b.body === 'string' ? b.body.trim() : '';
  if (!title && !body) return { ok: false, error: 'A title or body is required.' };
  if (title.length > MAX_TITLE) return { ok: false, error: `Title exceeds ${MAX_TITLE} chars.` };
  if (body.length > MAX_BODY) return { ok: false, error: `Body exceeds ${MAX_BODY} chars.` };

  if (!isScreenTarget(b.screen)) return { ok: false, error: 'screen must be "1", "2", or "3".' };

  const toAll = b.toAll === true;
  let tokens: string[] | undefined;
  if (Array.isArray(b.tokens)) {
    const cleaned = b.tokens.filter(isExpoPushToken).map(normalizeToken);
    tokens = Array.from(new Set(cleaned)); // de-dupe
  }
  if (!toAll && (!tokens || tokens.length === 0)) {
    return { ok: false, error: 'Provide at least one valid token, or set toAll.' };
  }

  return {
    ok: true,
    value: {
      title,
      body,
      screen: b.screen,
      highlight: b.highlight === true,
      tokens,
      toAll,
    },
  };
}

/** Accepts dotted numeric versions (1, 1.0, 1.2.3). Rejects junk so a bad admin
 *  edit can't brick the gate with an uncomparable string. */
const VERSION_RE = /^\d+(\.\d+){0,3}$/;

export function isVersionString(value: unknown): value is string {
  return typeof value === 'string' && VERSION_RE.test(value.trim());
}

/**
 * Compare dotted numeric versions. Returns -1 | 0 | 1. Missing segments are
 * treated as 0 so "1.2" === "1.2.0". Used by the app-side gate too (documented),
 * but lives here as the canonical reference implementation.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.trim().split('.').map(Number);
  const pb = b.trim().split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
