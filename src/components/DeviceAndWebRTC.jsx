import React from 'react';
import { Monitor, ShieldAlert } from 'lucide-react';
import { useDeviceInfo, useLocalIP } from '../hooks/useNetwork';
import Card from './Card';
import Badge from './Badge';

const DeviceAndWebRTC = () => {
  const deviceData = useDeviceInfo();
  const { webrtcData, loading } = useLocalIP();

  const TableRow = ({ label, value }) => (
    <div 
      className="py-3 px-2 flex justify-between items-center transition-all duration-200 hover:bg-white/[0.02] rounded-lg -mx-2" 
      style={{ borderBottom: '1px solid var(--row-border)' }}
    >
      <span className="text-ink-secondary font-medium text-[13px]">{label}</span>
      <span className="text-right break-all font-mono text-ink text-[13px]">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-rise-in">
      <Card className="p-5 sm:p-6" aria-label="Device and Browser Profiler">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Monitor className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-ink">Device & Browser</h2>
        </div>
        {deviceData ? (
          <div className="space-y-0 text-sm">
            <TableRow label="OS" value={deviceData.os} />
            <TableRow label="Browser" value={deviceData.browser} />
            <TableRow label="Platform" value={deviceData.platform} />
            <TableRow label="CPU Cores" value={deviceData.cpuCores} />
            <TableRow label="Device RAM" value={deviceData.ram} />
            <TableRow label="Screen" value={deviceData.screen} />
            <TableRow label="Viewport" value={deviceData.viewport} />
            <TableRow label="Pixel Ratio" value={deviceData.pixelRatio} />
            <TableRow label="Color Depth" value={deviceData.colorDepth} />
            <TableRow label="Touch Points" value={deviceData.touchPoints} />
            <TableRow label="Language" value={deviceData.language} />
            <TableRow label="Timezone" value={deviceData.timezone} />
            <TableRow label="Cookies" value={deviceData.cookies} />
            <TableRow label="Do Not Track" value={deviceData.dnt} />
          </div>
        ) : (
          <div className="py-8 text-center text-ink-quaternary">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-3"></div>
            <p>Profiling…</p>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-ink">WebRTC Leak Detection</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-ink-quaternary">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-3"></div>
            <p>Probing…</p>
          </div>
        ) : webrtcData ? (
          <div className="space-y-0 text-sm">
            <div className="py-3 px-2 flex justify-between items-center transition-all duration-200 hover:bg-white/[0.02] rounded-lg -mx-2" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium text-[13px]">WebRTC API</span>
              <span className="text-ink text-[13px]">{webrtcData.webrtcAPI || 'N/A'}</span>
            </div>
            <div className="py-3 px-2 flex justify-between items-center transition-all duration-200 hover:bg-white/[0.02] rounded-lg -mx-2" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium text-[13px]">IPv4 Exposed</span>
              <Badge variant="info" className="text-[11px] px-2 py-0.5">{webrtcData.ipv4 || 'N/A'}</Badge>
            </div>
            <div className="py-3 px-2 flex justify-between items-center transition-all duration-200 hover:bg-white/[0.02] rounded-lg -mx-2" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium text-[13px]">IPv6 Exposed</span>
              <Badge variant="info" className="text-[11px] px-2 py-0.5">{webrtcData.ipv6 || 'N/A'}</Badge>
            </div>
            <div className="py-3 px-2 flex justify-between items-center transition-all duration-200 hover:bg-white/[0.02] rounded-lg -mx-2" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium text-[13px]">mDNS Aliases</span>
              <span className="text-ink text-right text-[13px]">{webrtcData.mdnsAliases || 'None'}</span>
            </div>
            <div className="py-4 border-b border-white/[0.06]">
              <p className="text-ink-secondary font-medium mb-2 text-[13px]">What is .local?</p>
              <p className="text-ink-tertiary text-xs leading-relaxed">{webrtcData.mdnsExplain || 'N/A'}</p>
            </div>
            <div className="py-4">
              <p className="text-ink-secondary font-medium mb-3 text-[13px]">Leak Assessment</p>
              <Badge 
                variant={webrtcData.leakAssessment?.includes('SAFE') ? 'success' : 'warning'}
                className="py-1 px-4 text-xs font-bold"
              >
                {webrtcData.leakAssessment || 'Unknown'}
              </Badge>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default DeviceAndWebRTC;
