import React, { useState, useEffect, useRef } from 'react';
import { Activity, Gauge, Zap, Send, Radio, Settings } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import LatencyProbeModal from './LatencyProbeModal';

const DEFAULT_PROBES = [
  { n: 'Google DNS', u: 'https://8.8.8.8' },
  { n: 'Cloudflare', u: 'https://1.1.1.1' },
  { n: 'GitHub', u: 'https://github.com' },
  { n: 'Google', u: 'https://www.google.com' },
  { n: 'AWS', u: 'https://aws.amazon.com' },
  { n: 'CF CDN', u: 'https://cdnjs.cloudflare.com' },
];

const LatencyAndPing = () => {
  const [latencyData, setLatencyData] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const liveIntervalRef = useRef(null);
  const [pingHost, setPingHost] = useState('https://www.google.com');
  const [pingCount, setPingCount] = useState(5);
  const [pinging, setPinging] = useState(false);
  const [pingResults, setPingResults] = useState([]);
  const [pingStats, setPingStats] = useState('Idle');
  
  // Custom Probe State
  const [probes, setProbes] = useState(() => {
    try {
      const saved = localStorage.getItem('latencyProbes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROBES;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    buildLatency();
    try {
      const savedHost = localStorage.getItem('pingHost');
      const savedCount = localStorage.getItem('pingCount');
      if (savedHost) setPingHost(savedHost);
      if (savedCount) setPingCount(parseInt(savedCount));
    } catch {}
  }, []);

  const buildLatency = async (customProbes = probes) => {
    const res = await Promise.all(
      customProbes.map(async ({ n, u }) => {
        try {
          const t = performance.now();
          await fetch(u, { mode: 'no-cors', cache: 'no-store' });
          return { n, ms: Math.round(performance.now() - t), ok: true };
        } catch {
          return { n, ms: null, ok: false };
        }
      })
    );

    const good = res.filter((r) => r.ok);
    const max = Math.max(...good.map((r) => r.ms), 1);
    const avg = good.length ? Math.round(good.reduce((a, b) => a + b.ms, 0) / good.length) : 0;
    const [grade, gradeColor] =
      avg < 80 ? ['Excellent', 'text-ink'] :
      avg < 200 ? ['Good', 'text-ink-secondary'] :
      avg < 400 ? ['Fair', 'text-ink-tertiary'] :
      ['Poor', 'text-ink-quaternary'];

    setLatencyData({ results: res, avg, grade, gradeColor, max });
  };

  useEffect(() => {
    if (isLive) {
      // Run immediately then every 2 seconds
      buildLatency();
      liveIntervalRef.current = setInterval(buildLatency, 2000);
    } else {
      clearInterval(liveIntervalRef.current);
    }
    return () => clearInterval(liveIntervalRef.current);
  }, [isLive]);

  const pingOnce = async (url, signal) => {
    const sep = url.includes('?') ? '&' : '?';
    const u = url + sep + '_ping=' + Date.now();
    const t0 = performance.now();
    try {
      await fetch(u, { mode: 'no-cors', cache: 'no-store', signal });
      return Math.round(performance.now() - t0);
    } catch (err) {
      if (signal && signal.aborted) throw err;
      return null;
    }
  };

  const startPing = async () => {
    let host = pingHost.trim();
    if (!host) return;
    if (!/^https?:\/\//i.test(host)) host = 'https://' + host;

    try { localStorage.setItem('pingHost', host); localStorage.setItem('pingCount', String(pingCount)); } catch {}

    setPinging(true);
    setPingResults([]);
    const abortController = new AbortController();
    const results = [];

    try {
      for (let i = 0; i < pingCount; i++) {
        if (abortController.signal.aborted) break;
        setPingStats(`Pinging ${host} — ${i + 1}/${pingCount}…`);
        let ms = null;
        try { ms = await pingOnce(host, abortController.signal); } catch { break; }
        results.push(ms);
        setPingResults([...results]);
        await new Promise((r) => setTimeout(r, 220));
      }
    } finally {
      setPinging(false);
      const ok = results.filter((t) => typeof t === 'number');
      const fails = results.length - ok.length;
      const min = ok.length ? Math.min(...ok) : 0;
      const max = ok.length ? Math.max(...ok) : 0;
      const avg = ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : 0;
      setPingStats(ok.length ? `min ${min} ms · avg ${avg} ms · max ${max} ms · ${fails} fail(s)` : `${fails} fail(s)`);
    }
  };

  return (
    <>
      <div className="section-label flex items-center gap-2">
        <Activity className="w-3.5 h-3.5" />
        Performance
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Zap className="w-5 h-5 text-ink" />
            <h2 className="text-base sm:text-lg font-semibold text-ink">Latency Probe & Ping</h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 sm:p-2 text-ink-quaternary hover:text-ink transition-colors rounded-lg hover:bg-surface-light group relative"
              title="Edit Probes"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-300 whitespace-nowrap"
              style={{
                background: isLive ? 'rgba(48,209,88,0.15)' : 'var(--icon-bg)',
                color: isLive ? '#30d158' : 'var(--color-ink-tertiary)',
                border: `1px solid ${isLive ? 'rgba(48,209,88,0.3)' : 'var(--icon-border)'}`
              }}
            >
              <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'Live Mode Active' : 'Start Live Mode'}
            </button>
          </div>
        </div>

        {/* Ping controls */}
        <div className="px-4 sm:px-6 py-3 sm:py-4" style={{ borderBottom: '1px solid var(--card-border)', backgroundColor: 'var(--color-surface-light)' }}>
          <div className="flex gap-2 sm:gap-3 items-stretch sm:items-center flex-col sm:flex-row">
            <input
              type="text"
              placeholder="https://www.google.com"
              className="input w-full sm:flex-1 min-w-0 sm:max-w-xs text-sm font-mono"
              value={pingHost}
              onChange={(e) => setPingHost(e.target.value)}
              disabled={pinging}
              onKeyDown={(e) => e.key === 'Enter' && startPing()}
            />
            <input
              type="number"
              min="1"
              max="20"
              value={pingCount}
              onChange={(e) => setPingCount(parseInt(e.target.value))}
              disabled={pinging}
              className="input w-20 text-sm text-center"
            />
            <Button variant="primary" onClick={startPing} disabled={pinging} loading={pinging} className="flex items-center gap-2">
              {!pinging && <Send className="w-4 h-4" />}
              {pinging ? 'Pinging…' : 'Ping'}
            </Button>
            <span className="font-mono text-ink-tertiary text-xs ml-2">{pingStats}</span>
          </div>
        </div>

        {/* Latency results */}
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          {latencyData ? (
            <>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
                <div>
                  <p className="text-[10px] sm:text-xs text-ink-quaternary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" /> Average Latency
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-ink font-mono tracking-tight">
                    {latencyData.avg}<span className="text-xs sm:text-sm text-ink-quaternary font-normal ml-1">ms</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-ink-quaternary uppercase tracking-wider mb-1">Connection Grade</p>
                  <p className={`text-3xl sm:text-4xl font-bold font-sans tracking-tight ${latencyData.gradeColor}`}>
                    {latencyData.grade}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {latencyData.results.map((r, i) => {
                  const pct = r.ok ? Math.round((r.ms / latencyData.max) * 100) : 100;
                  return (
                    <div key={r.n} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-ink-secondary font-medium w-20 sm:w-28 shrink-0 truncate">{r.n}</span>
                      <div className="flex-1 liquid-bar-container h-3">
                        <div
                          className="liquid-fill"
                          style={{
                            width: pct + '%',
                            backgroundColor: r.ok ? (r.ms < 80 ? '#30d158' : r.ms < 200 ? '#ffd60a' : '#ff453a') : 'var(--color-ink-quaternary)',
                            opacity: r.ok ? 1 : 0.3,
                          }}
                        />
                      </div>
                      <span className={`text-sm font-mono w-20 text-right ${r.ok ? 'text-ink' : 'text-ink-quaternary'}`}>
                        {r.ok ? `${r.ms} ms` : 'Error'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-ink-quaternary">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-3"></div>
              <p>Measuring…</p>
            </div>
          )}
        </div>

        {/* Ping results */}
        {pingResults.length > 0 && (
          <div className="mx-6 mb-4 rounded-lg p-4" style={{ backgroundColor: 'var(--color-surface-light)' }}>
            <p className="text-sm font-medium text-ink mb-2">Ping Results</p>
            <div className="font-mono text-xs text-ink-tertiary space-y-1">
              {pingResults.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-ink-quaternary w-6">{i + 1}.</span>
                  <span className={t === null ? 'text-ink-tertiary' : 'text-ink'}>
                    {t === null ? 'Error' : `${t} ms`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <LatencyProbeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        probes={probes}
        onSave={(newProbes) => {
          setProbes(newProbes);
          try { localStorage.setItem('latencyProbes', JSON.stringify(newProbes)); } catch {}
          buildLatency(newProbes);
        }}
      />
    </>
  );
};

export default LatencyAndPing;
