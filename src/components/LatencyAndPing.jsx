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
        <div className="px-5 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-ink">Latency Probe & Ping</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 text-ink-tertiary hover:text-ink transition-all rounded-xl hover:bg-white/5 active:scale-95 group"
              title="Edit Probes"
            >
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all duration-300 active:scale-95 border
                ${isLive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-ink-tertiary border-white/10'}`}
            >
              <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'LIVE ANALYTICS' : 'START PROBING'}
            </button>
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

        {/* Ping Section - Footer */}
        <div className="bg-white/[0.01] border-t border-white/[0.06]">
          <div className="px-5 py-6 sm:px-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Radio className="w-4 h-4 text-ink-secondary" />
              Custom Ping Test
            </div>
            
            <div className="flex gap-2 sm:gap-3 items-stretch sm:items-center flex-col sm:flex-row">
              <input
                type="text"
                placeholder="https://www.google.com"
                className="input w-full sm:flex-1 min-w-0 text-xs sm:text-sm font-mono shadow-inner"
                style={{ backgroundColor: 'var(--color-surface)' }}
                value={pingHost}
                onChange={(e) => setPingHost(e.target.value)}
                disabled={pinging}
                onKeyDown={(e) => e.key === 'Enter' && startPing()}
              />
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={pingCount}
                  onChange={(e) => setPingCount(parseInt(e.target.value))}
                  disabled={pinging}
                  className="input w-16 sm:w-20 text-xs sm:text-sm text-center shadow-inner"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                />
                <Button variant="primary" onClick={startPing} disabled={pinging} loading={pinging} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs sm:text-sm px-4">
                  {!pinging && <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  {pinging ? 'Pinging…' : 'Ping Target'}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-ink-tertiary text-[10px] sm:text-xs bg-surface px-2 py-1 rounded-md border" style={{ borderColor: 'var(--card-border)' }}>
                {pingStats}
              </span>
            </div>

            {/* Ping results Grid */}
            {pingResults.length > 0 && (
              <div className="mt-2 rounded-lg p-3 sm:p-4 border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--card-border)' }}>
                <div className="font-mono text-[10px] sm:text-xs grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {pingResults.map((t, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md shadow-sm" style={{ backgroundColor: 'var(--color-surface-light)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span className="text-ink-quaternary">#{i + 1}</span>
                      <span className={t === null ? 'text-red-400 font-bold' : 'text-ink font-medium'}>
                        {t === null ? 'ERR' : `${t}ms`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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
