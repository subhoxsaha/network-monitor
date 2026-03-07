import React, { useState } from 'react';
import { Eye, Cookie, Database, HardDrive, Shield, AlertTriangle, Download, Users } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import TooltipText from './TooltipText';

const RevealBrowserData = () => {
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [includeSensitive, setIncludeSensitive] = useState(true);

  const scanReveal = async () => {
    setLoading(true);
    setDetails(null);
    setShowConfirm(false);

    const summaryData = {
      cookies: false, localStorageCount: 0, sessionStorageCount: 0,
      indexedDBCount: 0, serviceWorkerCount: 0, grantedPermissions: [],
    };

    try { summaryData.cookies = !!document.cookie && document.cookie.length > 0; } catch {}
    try { summaryData.localStorageCount = localStorage.length; } catch {}
    try { summaryData.sessionStorageCount = sessionStorage.length; } catch {}
    try {
      if ('indexedDB' in window && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        summaryData.indexedDBCount = dbs ? dbs.length : 0;
      }
    } catch {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        summaryData.serviceWorkerCount = regs ? regs.length : 0;
      }
    } catch {}

    for (const p of ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write', 'persistent-storage']) {
      try {
        if (!navigator.permissions || !navigator.permissions.query) break;
        const st = await navigator.permissions.query({ name: p });
        if (st.state === 'granted') summaryData.grantedPermissions.push(p);
      } catch {}
    }

    setSummary(summaryData);

    const sensitiveDetected =
      summaryData.cookies || summaryData.localStorageCount || summaryData.sessionStorageCount ||
      summaryData.indexedDBCount || summaryData.serviceWorkerCount || summaryData.grantedPermissions.length > 0;

    if (sensitiveDetected && includeSensitive) {
      setShowConfirm(true);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const revealDetails = async () => {
    setShowConfirm(false);
    setLoading(true);

    const detailsData = { cookies: null, localStorage: null, sessionStorage: null, indexedDB: null, serviceWorkers: null, permissions: null };

    try { detailsData.cookies = document.cookie || '(none)'; } catch { detailsData.cookies = 'Unavailable'; }
    try {
      const ls = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
      detailsData.localStorage = ls;
    } catch { detailsData.localStorage = 'Unavailable'; }
    try {
      const ss = {};
      for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); ss[k] = sessionStorage.getItem(k); }
      detailsData.sessionStorage = ss;
    } catch { detailsData.sessionStorage = 'Unavailable'; }
    try {
      if ('indexedDB' in window && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        const out = {};
        for (const db of dbs) { try { out[db.name] = '(listing skipped)'; } catch {} }
        detailsData.indexedDB = out;
      } else { detailsData.indexedDB = 'Not supported'; }
    } catch { detailsData.indexedDB = 'Unavailable'; }
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        detailsData.serviceWorkers = regs.map((r) => ({ scope: r.scope }));
      } else { detailsData.serviceWorkers = 'Not supported'; }
    } catch { detailsData.serviceWorkers = 'Unavailable'; }

    const permDetails = {};
    for (const p of ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write', 'persistent-storage']) {
      try {
        if (!navigator.permissions || !navigator.permissions.query) { permDetails[p] = 'Unknown'; continue; }
        const st = await navigator.permissions.query({ name: p });
        permDetails[p] = st.state;
      } catch { permDetails[p] = 'Unsupported'; }
    }
    detailsData.permissions = permDetails;

    setDetails(detailsData);
    setLoading(false);
  };

  const clearReveal = () => { setSummary(null); setDetails(null); setShowConfirm(false); };

  const SummaryRow = ({ icon: Icon, label, value, danger, docId }) => (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--row-border)' }}>
      <span className="flex items-center gap-2 text-ink-secondary text-sm">
        <Icon className="w-4 h-4 text-ink-quaternary" />
        {docId ? (
          <TooltipText word={label} docId={docId} />
        ) : (
          label
        )}
      </span>
      <span className={`text-sm font-mono ${danger ? 'text-ink font-bold' : 'text-ink'}`}>{value}</span>
    </div>
  );

  return (
    <Card className="p-4 sm:p-6 animate-rise-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)', border: '1px solid var(--icon-border)' }}>
          <Eye className="w-5 h-5 text-ink" />
        </div>
        <h2 className="text-xl font-semibold text-ink">Reveal Browser Data</h2>
      </div>

      <div className="space-y-4 pb-4 mb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Button variant="primary" onClick={scanReveal} disabled={loading} loading={loading} className="min-w-max">
            {loading ? 'Scanning…' : 'Scan & Reveal'}
          </Button>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary">
            <input type="checkbox" checked={includeSensitive} onChange={(e) => setIncludeSensitive(e.target.checked)} className="rounded" />
            Reveal sensitive values
          </label>
          <Button variant="secondary" onClick={clearReveal} className="sm:ml-auto min-w-max">
            Clear
          </Button>
        </div>
      </div>

      {summary && (
        <div className="space-y-0 mb-4 rounded-lg p-4" style={{ backgroundColor: 'var(--color-surface-light)' }}>
          <SummaryRow icon={Cookie} label="Cookies" value={summary.cookies ? 'Present' : 'None'} danger={summary.cookies} docId="cookies" />
          <SummaryRow icon={HardDrive} label="LocalStorage" value={`${summary.localStorageCount} key(s)`} docId="local-storage" />
          <SummaryRow icon={HardDrive} label="SessionStorage" value={`${summary.sessionStorageCount} key(s)`} docId="session-storage" />
          <SummaryRow icon={Database} label="IndexedDB" value={`${summary.indexedDBCount} DB(s)`} docId="indexed-db" />
          <SummaryRow icon={Users} label="ServiceWorkers" value={`${summary.serviceWorkerCount} reg(s)`} docId="service-workers" />
          <SummaryRow icon={Shield} label="Permissions (granted)" value={summary.grantedPermissions.join(', ') || 'None'} />
        </div>
      )}

      {showConfirm && (
        <div className="flex items-start gap-3 rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--badge-bg)', border: '1px solid var(--icon-border)' }}>
          <AlertTriangle className="w-5 h-5 text-ink-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-ink mb-3">
              Potentially sensitive browser data was detected. Revealing detailed values may expose cookies, storage contents, and service worker info.
            </p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={revealDetails}>Reveal details</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {details && (
        <div className="rounded-lg p-4 mb-4 max-h-96 overflow-auto" style={{ backgroundColor: 'var(--color-surface-light)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-ink-quaternary font-medium uppercase tracking-wider">Raw Data</span>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(details, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'browser-data.json'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
          <pre className="text-xs font-mono text-ink-secondary whitespace-pre-wrap break-words">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}

      <div className="p-4 text-sm text-ink-secondary rounded-lg" style={{ backgroundColor: 'var(--badge-bg)', borderLeft: '4px solid var(--color-ink-quaternary)' }}>
        <p>
          <strong>Note:</strong> Reads same-origin cookies, localStorage, sessionStorage, indexedDB & service workers. Cannot access browser-managed secrets or cross-origin cookies.
        </p>
      </div>
    </Card>
  );
};

export default RevealBrowserData;
