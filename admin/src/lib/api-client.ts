'use client';

import type { DeviceToken, SendRequest, SendResult, VersionConfig } from './types';

/**
 * Browser-side API client. Type-only imports from ./types, so no server code
 * leaks into the bundle. Every mutating call attaches the admin token as
 * `x-admin-token`; the token itself lives only in component state / localStorage.
 */

export interface ApiError {
  ok: false;
  error: string;
  status: number;
}

async function request<T>(
  path: string,
  init: RequestInit & { adminToken?: string } = {},
): Promise<T> {
  const { adminToken, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
      ...headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    const err: ApiError = {
      ok: false,
      error: json?.error ?? `Request failed (HTTP ${res.status}).`,
      status: res.status,
    };
    throw err;
  }
  return json as T;
}

export const api = {
  listTokens: () =>
    request<{ tokens: DeviceToken[]; count: number; driver: string }>('/api/tokens'),

  deleteToken: (token: string, adminToken: string) =>
    request<{ deleted: string }>('/api/tokens', {
      method: 'DELETE',
      adminToken,
      body: JSON.stringify({ token }),
    }),

  send: (payload: SendRequest, adminToken: string) =>
    request<{
      summary: { total: number; sent: number; failed: number; pruned: number };
      results: SendResult[];
    }>('/api/send', { method: 'POST', adminToken, body: JSON.stringify(payload) }),

  getVersionConfig: () => request<{ config: VersionConfig }>('/api/version-config'),

  putVersionConfig: (config: VersionConfig, adminToken: string) =>
    request<{ config: VersionConfig }>('/api/version-config', {
      method: 'PUT',
      adminToken,
      body: JSON.stringify(config),
    }),

  getEventCounts: () => request<{ counts: Record<string, number> }>('/api/events'),

  checkReceipts: (ticketIds: string[], adminToken: string) =>
    request<{ summary: { checked: number; delivered: number; errored: number; dead: number } }>(
      '/api/receipts',
      { method: 'POST', adminToken, body: JSON.stringify({ ticketIds }) },
    ),
};

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'error' in e) return String((e as ApiError).error);
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
