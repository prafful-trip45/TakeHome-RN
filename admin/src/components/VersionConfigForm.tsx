'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api-client';
import type { VersionConfig } from '@/lib/types';

interface Props {
  adminToken: string;
}

const EMPTY: VersionConfig = {
  latestVersion: '1.0.0',
  minSupportedVersion: '1.0.0',
  forceUpdate: false,
  downloadUrl: 'https://swag.gg/app',
  message: '',
};

/**
 * Edits the remote native-update gate (Task 8 source). The app reads this on
 * launch to choose forced vs optional vs no-update — this form is how you flip
 * those states at runtime with no app rebuild.
 */
export default function VersionConfigForm({ adminToken }: Props) {
  const [cfg, setCfg] = useState<VersionConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api
      .getVersionConfig()
      .then((r) => setCfg({ ...EMPTY, ...r.config }))
      .catch((e) => setMsg({ kind: 'err', text: errorMessage(e) }))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof VersionConfig>(key: K, value: VersionConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.putVersionConfig(cfg, adminToken);
      setCfg({ ...EMPTY, ...r.config });
      setMsg({ kind: 'ok', text: 'Saved. The app will pick this up on its next launch/resume.' });
    } catch (e) {
      setMsg({ kind: 'err', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  // Client-side hint mirroring the app's gate logic, so the operator sees the
  // effect before saving.
  const gate = cfg.forceUpdate
    ? 'FORCED for everyone below latestVersion'
    : 'OPTIONAL prompt above minSupportedVersion, FORCED below it';

  return (
    <section className="card">
      <h2>Native update gate (Task 8 remote config)</h2>
      <p className="sub" style={{ margin: '0 0 6px' }}>
        Effect: <span className="badge">{gate}</span>
      </p>

      {loading ? (
        <p className="empty">Loading current config…</p>
      ) : (
        <>
          <div className="row">
            <div>
              <label htmlFor="latest">latestVersion</label>
              <input
                id="latest"
                type="text"
                value={cfg.latestVersion}
                onChange={(e) => set('latestVersion', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="min">minSupportedVersion</label>
              <input
                id="min"
                type="text"
                value={cfg.minSupportedVersion}
                onChange={(e) => set('minSupportedVersion', e.target.value)}
              />
            </div>
          </div>

          <label htmlFor="dl">downloadUrl (store fallback — placeholder ok)</label>
          <input
            id="dl"
            type="url"
            value={cfg.downloadUrl}
            onChange={(e) => set('downloadUrl', e.target.value)}
          />

          <label htmlFor="vmsg">message (shown in the update prompt)</label>
          <input
            id="vmsg"
            type="text"
            value={cfg.message ?? ''}
            onChange={(e) => set('message', e.target.value)}
          />

          <div className="inline">
            <input
              id="force"
              type="checkbox"
              checked={cfg.forceUpdate}
              onChange={(e) => set('forceUpdate', e.target.checked)}
            />
            <label htmlFor="force">forceUpdate (block usage until updated)</label>
          </div>

          <button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save config'}
          </button>

          {cfg.updatedAt && (
            <p className="token-meta" style={{ marginTop: 10 }}>
              Last updated {new Date(cfg.updatedAt).toLocaleString()}
            </p>
          )}
          {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        </>
      )}
    </section>
  );
}
