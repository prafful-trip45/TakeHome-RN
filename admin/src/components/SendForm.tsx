'use client';

import { useMemo, useState } from 'react';
import { api, errorMessage } from '@/lib/api-client';
import { buildDeepLink, buildPreviewPayload, PRESETS, type Preset } from '@/lib/preview';
import type { DeviceToken, ScreenTarget, SendResult } from '@/lib/types';

interface Props {
  tokens: DeviceToken[];
  adminToken: string;
  /** Bubble up ticket ids from the last successful send for receipt checking. */
  onSent?: (ticketIds: string[]) => void;
  /** A send may prune dead tokens — let the parent refresh the registry. */
  onChanged?: () => void;
}

const SCREENS: ScreenTarget[] = ['1', '2', '3'];

/**
 * Notification Builder — compose a push, see the exact Expo payload and the deep
 * link it will trigger BEFORE sending, then dispatch to selected devices / all.
 */
export default function SendForm({ tokens, adminToken, onSent, onChanged }: Props) {
  const [title, setTitle] = useState('Hello from SWAG');
  const [body, setBody] = useState('Tap to open Screen 2');
  const [screen, setScreen] = useState<ScreenTarget>('2');
  const [highlight, setHighlight] = useState(false);
  const [toAll, setToAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState('');
  const [showPayload, setShowPayload] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const manualTokens = useMemo(
    () =>
      manual
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    [manual],
  );

  // Live preview — recomputes as you type.
  const deepLink = useMemo(() => buildDeepLink(screen, highlight), [screen, highlight]);
  const payload = useMemo(
    () => buildPreviewPayload(title, body, screen, highlight),
    [title, body, screen, highlight],
  );

  function applyPreset(p: Preset) {
    setTitle(p.title);
    setBody(p.body);
    setScreen(p.screen);
    setHighlight(p.highlight);
  }

  function toggle(token: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  async function handleSend() {
    setBusy(true);
    setError(null);
    setResults(null);
    setSummary(null);
    try {
      const explicit = toAll ? undefined : [...selected, ...manualTokens];
      const res = await api.send(
        { title, body, screen, highlight, toAll, tokens: explicit },
        adminToken,
      );
      setResults(res.results);
      setSummary(
        `Sent ${res.summary.sent}/${res.summary.total} · failed ${res.summary.failed}` +
          (res.summary.pruned ? ` · pruned ${res.summary.pruned} dead token(s)` : ''),
      );
      const ticketIds = res.results
        .filter((r) => r.status === 'ok' && r.ticketId)
        .map((r) => r.ticketId as string);
      onSent?.(ticketIds);
      if (res.summary.pruned > 0) onChanged?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const recipientCount = toAll ? tokens.length : selected.size + manualTokens.length;

  return (
    <section className="card">
      <h2>Notification builder</h2>

      {/* Presets */}
      <div className="row" style={{ gap: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="secondary"
            style={{ marginTop: 0, flex: '0 0 auto' }}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label htmlFor="title">Title</label>
      <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label htmlFor="body">Body</label>
      <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} />

      <div className="row">
        <div>
          <label htmlFor="screen">Deep-link target (data.screen)</label>
          <select
            id="screen"
            value={screen}
            onChange={(e) => setScreen(e.target.value as ScreenTarget)}
          >
            {SCREENS.map((s) => (
              <option key={s} value={s}>
                Screen {s}
              </option>
            ))}
          </select>
        </div>
        <div className="inline" style={{ alignItems: 'flex-end' }}>
          <input
            id="highlight"
            type="checkbox"
            checked={highlight}
            onChange={(e) => setHighlight(e.target.checked)}
          />
          <label htmlFor="highlight">highlight=true (deep-link param)</label>
        </div>
      </div>

      {/* Live preview — what the tap will route to + the exact Expo payload */}
      <div className="alert" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 12, color: 'var(--muted)' }}>PREVIEW · resolves to</strong>
          <button
            type="button"
            className="secondary"
            style={{ marginTop: 0, padding: '2px 10px', fontSize: 12 }}
            onClick={() => setShowPayload((v) => !v)}
          >
            {showPayload ? 'Hide payload' : 'Show Expo payload'}
          </button>
        </div>
        <div className="mono" style={{ marginTop: 6 }}>
          {deepLink}
        </div>
        {showPayload && (
          <pre
            className="mono"
            style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </div>

      {/* Recipients */}
      <div className="inline">
        <input
          id="toAll"
          type="checkbox"
          checked={toAll}
          onChange={(e) => setToAll(e.target.checked)}
        />
        <label htmlFor="toAll">Send to all registered devices ({tokens.length})</label>
      </div>

      {!toAll && (
        <>
          <label>Select registered devices</label>
          {tokens.length === 0 ? (
            <p className="empty">No devices registered yet. Paste a token below instead.</p>
          ) : (
            <ul className="token-list">
              {tokens.map((t) => (
                <li key={t.token}>
                  <div className="inline" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(t.token)}
                      onChange={() => toggle(t.token)}
                    />
                    <span className="mono">{t.token}</span>
                  </div>
                  <span className="token-meta">{t.platform}</span>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="manual">Or paste token(s) — comma / space / newline separated</label>
          <textarea
            id="manual"
            value={manual}
            placeholder="ExponentPushToken[...]"
            onChange={(e) => setManual(e.target.value)}
          />
        </>
      )}

      <button onClick={handleSend} disabled={busy || recipientCount === 0}>
        {busy ? 'Sending…' : `Send to ${recipientCount} device(s)`}
      </button>

      {summary && <div className="alert ok">{summary}</div>}
      {error && <div className="alert err">{error}</div>}

      {results && results.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {results.map((r, i) => (
            <div className="result-line" key={`${r.token}-${i}`}>
              <span className={`dot ${r.status === 'ok' ? 'ok' : 'err'}`} />
              <span className="mono" style={{ flex: 1 }}>
                {r.token}
              </span>
              <span className="token-meta">
                {r.status === 'ok' ? 'accepted' : `${r.error ?? 'error'}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
