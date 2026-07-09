import { logger } from './logger';
import type { ScreenTarget, SendResult } from './types';

/**
 * Server-side client for the Expo push service. This is the ONLY place that talks
 * to exp.host, and it runs exclusively in route handlers — the EXPO_ACCESS_TOKEN
 * never reaches the browser.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

// Expo accepts up to 100 messages per request; we chunk to respect that.
const CHUNK_SIZE = 100;

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: { screen: ScreenTarget; highlight?: boolean };
  sound: 'default';
  priority: 'high';
  channelId: 'default';
}

/** A single Expo ticket from the /send response, index-aligned to the request. */
interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoSendResponse {
  data?: ExpoTicket[];
  errors?: { code?: string; message?: string }[];
}

export interface ExpoReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

export function buildMessage(
  token: string,
  title: string,
  body: string,
  screen: ScreenTarget,
  highlight: boolean,
): ExpoMessage {
  return {
    to: token,
    title,
    body,
    // `data.screen` is what the app's notification linking reads to deep-navigate.
    data: highlight ? { screen, highlight: true } : { screen },
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Send a batch of messages. Returns one SendResult per input message, in order,
 * so the UI can show per-recipient status. `ticketId`s on ok results can be fed
 * to {@link getReceipts} later to check actual delivery.
 *
 * Never throws for per-message failures — a transport error for a whole chunk
 * marks every message in that chunk as errored and reports why.
 */
export async function sendPush(messages: ExpoMessage[]): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (const batch of chunk(messages, CHUNK_SIZE)) {
    try {
      const res = await fetch(SEND_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(batch),
      });

      const json = (await res.json().catch(() => null)) as ExpoSendResponse | null;

      // Request-level rejection (bad access token, malformed request, 5xx…).
      if (!res.ok || !json?.data) {
        const reason =
          json?.errors?.[0]?.message ?? `Expo push service returned HTTP ${res.status}.`;
        logger.error('Expo /send request failed', { status: res.status, errors: json?.errors });
        for (const m of batch) {
          results.push({ token: m.to, status: 'error', error: 'RequestFailed', message: reason });
        }
        continue;
      }

      // Tickets are index-aligned with the messages we sent.
      json.data.forEach((ticket, i) => {
        const token = batch[i]?.to ?? 'unknown';
        if (ticket.status === 'ok') {
          results.push({ token, status: 'ok', ticketId: ticket.id });
        } else {
          results.push({
            token,
            status: 'error',
            error: ticket.details?.error ?? 'Unknown',
            message: ticket.message,
          });
        }
      });
    } catch (err) {
      // Network failure / Expo unreachable — degrade, don't crash the route.
      logger.error('Expo /send threw', err);
      const message = err instanceof Error ? err.message : 'Network error reaching Expo.';
      for (const m of batch) {
        results.push({ token: m.to, status: 'error', error: 'NetworkError', message });
      }
    }
  }

  return results;
}

/**
 * Poll delivery receipts for previously-issued ticket ids (Bonus: delivered
 * analytics). Expo only guarantees receipts for a limited window; missing ids
 * simply aren't in the map. Errors here are non-fatal.
 */
export async function getReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>> {
  const ids = ticketIds.filter(Boolean);
  if (ids.length === 0) return {};

  const merged: Record<string, ExpoReceipt> = {};
  for (const batch of chunk(ids, 300)) {
    try {
      const res = await fetch(RECEIPTS_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ids: batch }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: Record<string, ExpoReceipt>;
      } | null;
      if (res.ok && json?.data) Object.assign(merged, json.data);
    } catch (err) {
      logger.error('Expo getReceipts threw', err);
    }
  }
  return merged;
}

/** Error codes that mean "this token is dead — stop sending to it". */
export function isDeadTokenError(error?: string): boolean {
  return error === 'DeviceNotRegistered';
}
