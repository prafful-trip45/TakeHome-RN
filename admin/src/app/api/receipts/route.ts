import { requireAdmin } from '@/lib/auth';
import { getReceipts, isDeadTokenError } from '@/lib/expo-push';
import { fail, ok, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/receipts — check delivery receipts for ticket ids returned by a
 * prior /send (Bonus: delivered analytics). Expo tickets only confirm the push
 * service accepted the message; receipts confirm the push provider (FCM/APNs)
 * delivered it. Body: { ticketIds: string[] }.
 */
export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (!guard.ok) return fail(guard.status, 'Unauthorized.');

  const raw = await readJson(req);
  const ids = (raw as { ticketIds?: unknown } | null)?.ticketIds;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
    return fail(400, 'ticketIds must be an array of strings.');
  }

  const receipts = await getReceipts(ids as string[]);

  // Summarize so the UI doesn't have to walk the map itself.
  let delivered = 0;
  let errored = 0;
  let dead = 0;
  for (const r of Object.values(receipts)) {
    if (r.status === 'ok') delivered++;
    else {
      errored++;
      if (isDeadTokenError(r.details?.error)) dead++;
    }
  }

  return ok({ receipts, summary: { checked: ids.length, delivered, errored, dead } });
}
