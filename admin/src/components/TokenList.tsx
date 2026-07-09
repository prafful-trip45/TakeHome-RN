'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api-client';
import type { DeviceToken } from '@/lib/types';

interface Props {
  tokens: DeviceToken[];
  driver: string;
  adminToken: string;
  loading: boolean;
  onRefresh: () => void;
  onChanged: () => void;
}

export default function TokenList({
  tokens,
  driver,
  adminToken,
  loading,
  onRefresh,
  onChanged,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(token: string) {
    setDeleting(token);
    setError(null);
    try {
      await api.deleteToken(token, adminToken);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Registered devices ({tokens.length})</h2>
        <button className="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <p className="sub" style={{ margin: '8px 0 0' }}>
        Storage driver:{' '}
        <span className={`badge ${driver === 'upstash' ? 'ok' : 'warn'}`}>
          {driver === 'upstash' ? 'persistent (KV)' : 'in-memory (ephemeral)'}
        </span>
      </p>

      {error && <div className="alert err">{error}</div>}

      {tokens.length === 0 ? (
        <p className="empty">
          No devices yet. Launch the app — it POSTs its Expo token to /api/register on startup.
        </p>
      ) : (
        <ul className="token-list">
          {tokens.map((t) => (
            <li key={t.token}>
              <div style={{ minWidth: 0 }}>
                <div className="mono">{t.token}</div>
                <div className="token-meta">
                  {t.platform}
                  {t.deviceName ? ` · ${t.deviceName}` : ''}
                  {t.appVersion ? ` · v${t.appVersion}` : ''} · updated{' '}
                  {new Date(t.updatedAt).toLocaleString()}
                </div>
              </div>
              <button
                className="danger"
                onClick={() => remove(t.token)}
                disabled={deleting === t.token}
              >
                {deleting === t.token ? '…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
