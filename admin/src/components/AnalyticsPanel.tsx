'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api-client';

interface Props {
  adminToken: string;
  /** Ticket ids from the most recent send, for a delivery-receipt check. */
  lastTicketIds: string[];
}

/**
 * Bonus: notification analytics. Two independent signals:
 *   • opened/delivered counts the app self-reports to /api/events.
 *   • delivery receipts polled from Expo for the last send's tickets.
 */
export default function AnalyticsPanel({ adminToken, lastTicketIds }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getEventCounts()
      .then((r) => setCounts(r.counts))
      .catch(() => setCounts({}));
  }, []);

  useEffect(load, [load]);

  async function checkReceipts() {
    setBusy(true);
    setReceiptMsg(null);
    try {
      const r = await api.checkReceipts(lastTicketIds, adminToken);
      setReceiptMsg(
        `Checked ${r.summary.checked}: delivered ${r.summary.delivered}, errored ${r.summary.errored}` +
          (r.summary.dead ? `, ${r.summary.dead} dead` : ''),
      );
    } catch (e) {
      setReceiptMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const opened = Object.entries(counts).filter(([k]) => k.startsWith('opened'));
  const openedTotal = opened.reduce((n, [, v]) => n + v, 0);
  const delivered = counts.delivered ?? 0;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Notification analytics (bonus)</h2>
        <button className="secondary" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="counts">
        <div className="metric">
          {openedTotal}
          <span>opened (app-reported)</span>
        </div>
        <div className="metric">
          {delivered}
          <span>delivered (app-reported)</span>
        </div>
      </div>

      {opened.length > 0 && (
        <p className="token-meta" style={{ marginTop: 8 }}>
          By screen: {opened.map(([k, v]) => `${k.replace('opened:', 'Screen ')}=${v}`).join(' · ')}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          className="secondary"
          onClick={checkReceipts}
          disabled={busy || lastTicketIds.length === 0}
        >
          {busy
            ? 'Checking…'
            : `Check Expo delivery receipts (${lastTicketIds.length} from last send)`}
        </button>
        {lastTicketIds.length === 0 && (
          <p className="empty">Send a notification first to get ticket ids to check.</p>
        )}
        {receiptMsg && <div className="alert ok">{receiptMsg}</div>}
      </div>
    </section>
  );
}
