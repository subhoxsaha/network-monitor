import React, { useState, useEffect } from 'react';
import { Globe, Gauge, Network, Copy, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { useSharedPublicIP } from '../context/NetworkContext';
import { usePublicIPv6, usePublicIPv4 } from '../hooks/useNetwork';
import { useCopy } from '../hooks/useCustom';
import Card from './Card';
import Button from './Button';
import WaveLoader from './WaveLoader';
import toast from 'react-hot-toast';

const useNetworkSpeed = () => {
  const [data, setData] = useState({ loading: true, downlink: null, rtt: null, effectiveType: null, type: null, measured: false });

  useEffect(() => {
    let intervalId;
    let mounted = true;

    // 1) Try Network Information API first (Reacts automatically to changes)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const read = () => setData({
        loading: false,
        downlink: conn.downlink != null ? conn.downlink : null,
        rtt: conn.rtt != null ? conn.rtt : null,
        effectiveType: conn.effectiveType || null,
        type: conn.type || null,
        measured: false,
      });
      read();
      conn.addEventListener('change', read);
      return () => conn.removeEventListener('change', read);
    }

    // 2) Fallback: Live download speed test polling
    const measure = async () => {
      try {
        const url = `https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js?_cb=${Date.now()}`; // Bypass cache
        const t0 = performance.now();
        const resp = await fetch(url, { cache: 'no-store' });
        const blob = await resp.blob();
        const ms = performance.now() - t0;
        const bytes = blob.size;
        const mbps = ((bytes * 8) / (ms / 1000)) / 1_000_000;
        
        if (mounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            downlink: Math.round(mbps * 10) / 10,
            rtt: Math.round(ms),
            effectiveType: mbps > 5 ? '4G' : mbps > 1 ? '3G' : '2G',
            measured: true,
          }));
        }
      } catch {
        if (mounted) {
          setData({ loading: false, downlink: null, rtt: null, effectiveType: null, type: null, measured: false });
        }
      }
    };

    measure();
    intervalId = setInterval(measure, 3500); // Poll every 3.5s

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return data;
};

const IPTrio = () => {
  const { ip, ipSub, loading: pubLoading } = useSharedPublicIP();
  const ipv4 = usePublicIPv4();
  const ipv6 = usePublicIPv6();
  const { copy } = useCopy();
  const speed = useNetworkSpeed();

  // The main IP might be IPv6 if the network prefers it. We force the IPv4 card to show the explicit IPv4 if we have it.
  const displayIp = ipv4 || ip;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-rise-in">
      {/* Public IP (IPv4) */}
      <Card className="p-4 sm:p-6">
        {pubLoading && !ipv4 ? (
          <WaveLoader text="Resolving IP…" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg" style={{ background: 'var(--icon-bg)' }}>
                <Globe className="w-4 h-4" style={{ color: '#30d158' }} />
              </div>
              <h3 className="text-[10px] sm:text-xs font-medium text-ink-secondary uppercase tracking-wide">Public IPv4</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-ink break-all tracking-tight">
              {displayIp || 'N/A'}
            </div>
            <p className="text-sm text-ink-tertiary">
              {ipv4 ? 'Explicit IPv4 address' : ipSub}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                copy(displayIp);
                toast.success('IPv4 copied to clipboard');
              }}
              className="mt-2 w-full"
              aria-label={`Copy public IPv4 address ${displayIp || ''}`}
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copy IPv4
            </Button>
          </div>
        )}
      </Card>

      {/* Live Network Speed */}
      <Card className="p-4 sm:p-6">
        {speed.loading ? (
          <WaveLoader text="Measuring speed…" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-lg" style={{ background: 'var(--icon-bg)' }}>
                <Gauge className="w-4 h-4" style={{ color: '#0a84ff' }} />
              </div>
              <h3 className="text-[10px] sm:text-xs font-medium text-ink-secondary uppercase tracking-wide flex items-center gap-2">
                Network Speed
                <span className="flex items-center gap-1 text-[10px] bg-[var(--icon-bg)] px-1.5 py-0.5 rounded-full text-[#0a84ff]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] animate-pulse"></span>
                  LIVE
                </span>
                {speed.measured && <span className="text-ink-quaternary text-[10px] ml-auto">est.</span>}
              </h3>
            </div>
            
            <div className="flex items-baseline gap-1">
              <div className="text-4xl sm:text-5xl font-mono font-bold text-ink tracking-tight">
                {speed.downlink != null ? speed.downlink : '—'}
              </div>
              {speed.downlink != null && <span className="text-xs sm:text-sm text-ink-tertiary">Mbps</span>}
            </div>

            {/* Dynamic Liquid Wave Bar for Speed */}
            <div className="liquid-bar-container h-3 mt-2 mb-4">
              <div
                className="liquid-fill"
                style={{
                  width: speed.downlink != null ? `${Math.min((speed.downlink / 100) * 100, 100)}%` : '0%',
                  backgroundColor: speed.downlink > 25 ? '#30d158' : speed.downlink > 5 ? '#ffd60a' : '#ff453a',
                }}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-sm">
                <span className="text-ink-quaternary flex items-center gap-1"><Clock className="w-3 h-3" /> Latency</span>
                <span className="text-ink font-mono">{speed.rtt != null ? `${speed.rtt} ms` : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-quaternary flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Effective</span>
                <span className="text-ink font-mono">{speed.effectiveType?.toUpperCase() || '—'}</span>
              </div>
              {speed.type && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-quaternary flex items-center gap-1"><ArrowUp className="w-3 h-3" /> Type</span>
                  <span className="text-ink font-mono capitalize">{speed.type}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* IPv6 */}
      <Card className="p-4 sm:p-6">
        {pubLoading && !ipv6 ? (
          <WaveLoader text="Detecting IPv6…" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg" style={{ background: 'var(--icon-bg)' }}>
                <Network className="w-4 h-4" style={{ color: '#bf5af2' }} />
              </div>
              <h3 className="text-[10px] sm:text-xs font-medium text-ink-secondary uppercase tracking-wide">IPv6 Address</h3>
            </div>
            <div className={`font-mono font-bold text-ink break-all tracking-tight ${ipv6 ? 'text-sm sm:text-base' : 'text-3xl sm:text-4xl'}`}>
              {ipv6 || 'N/A'}
            </div>
            <p className="text-xs text-ink-tertiary">
              {ipv6 ? 'IPv6 connectivity detected' : 'IPv6 not available on this network'}
            </p>
            {ipv6 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  copy(ipv6);
                  toast.success('IPv6 copied to clipboard');
                }}
                className="mt-2 w-full"
                aria-label={`Copy IPv6 address ${ipv6 || ''}`}
              >
                <Copy className="w-3.5 h-3.5 mr-2" />
                Copy IPv6
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default IPTrio;
