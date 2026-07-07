'use client';

import { useCallback, useEffect, useState } from 'react';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import SendForm from '@/components/SendForm';
import TokenList from '@/components/TokenList';
import VersionConfigForm from '@/components/VersionConfigForm';
import { api } from '@/lib/api-client';
import type { DeviceToken } from '@/lib/types';

const ADMIN_TOKEN_KEY = 'swag.adminToken';

export default function Page() {
  const [adminToken, setAdminToken] = useState('');
  const [tokens, setTokens] = useState<DeviceToken[]>([]);
  const [driver, setDriver] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastTicketIds, setLastTicketIds] = useState<string[]>([]);

  // Restore the admin token from localStorage (not sensitive to store locally on
  // the operator's own machine; it's never bundled or logged).
  useEffect(() => {
    const saved = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (saved) setAdminToken(saved);
  }, []);

  function onAdminTokenChange(value: string) {
    setAdminToken(value);
    window.localStorage.setItem(ADMIN_TOKEN_KEY, value);
  }

  const loadTokens = useCallback(() => {
    setLoading(true);
    api
      .listTokens()
      .then((r) => {
        setTokens(r.tokens);
        setDriver(r.driver);
      })
      .catch(() => {
        setTokens([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadTokens, [loadTokens]);

  return (
    <main>
      <header className="app-header">
        <div>
          <h1>SWAG · Admin</h1>
        </div>
        <div style={{ minWidth: 240, flex: 1, maxWidth: 340 }}>
          <label htmlFor="admin" style={{ marginTop: 0 }}>
            Admin token (sent as x-admin-token)
          </label>
          <input
            id="admin"
            type="password"
            placeholder="required in production"
            value={adminToken}
            onChange={(e) => onAdminTokenChange(e.target.value)}
          />
        </div>
      </header>
      <p className="sub">
        Send push notifications, manage the device registry, and control the native update gate. All
        secrets stay server-side.
      </p>

      <SendForm
        tokens={tokens}
        adminToken={adminToken}
        onSent={setLastTicketIds}
        onChanged={loadTokens}
      />
      <TokenList
        tokens={tokens}
        driver={driver}
        adminToken={adminToken}
        loading={loading}
        onRefresh={loadTokens}
        onChanged={loadTokens}
      />
      <VersionConfigForm adminToken={adminToken} />
      <AnalyticsPanel adminToken={adminToken} lastTicketIds={lastTicketIds} />
    </main>
  );
}
