import React from 'react';
import { Monitor, ShieldAlert } from 'lucide-react';
import { useDeviceInfo, useLocalIP } from '../hooks/useNetwork';
import Card from './Card';
import Badge from './Badge';

const DeviceAndWebRTC = () => {
  const deviceData = useDeviceInfo();
  const { webrtcData, loading } = useLocalIP();

  const TableRow = ({ label, value }) => (
    <div className="py-3 flex justify-between" style={{ borderBottom: '1px solid var(--row-border)' }}>
      <span className="text-ink-secondary font-medium">{label}</span>
      <span className="text-right break-all font-mono text-ink">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-rise-in">
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)', border: '1px solid var(--icon-border)' }}>
            <Monitor className="w-5 h-5 text-ink" />
          </div>
          <h2 className="text-xl font-semibold text-ink">Device &amp; Browser</h2>
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

      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)', border: '1px solid var(--row-border)' }}>
            <ShieldAlert className="w-5 h-5 text-ink-tertiary" />
          </div>
          <h2 className="text-xl font-semibold text-ink">WebRTC Leak Detection</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-ink-quaternary">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-3"></div>
            <p>Probing…</p>
          </div>
        ) : webrtcData ? (
          <div className="space-y-0 text-sm">
            <div className="py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium">WebRTC API</span>
              <span className="text-ink">{webrtcData.webrtcAPI || 'N/A'}</span>
            </div>
            <div className="py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium">IPv4 Exposed</span>
              <Badge>{webrtcData.ipv4 || 'N/A'}</Badge>
            </div>
            <div className="py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium">IPv6 Exposed</span>
              <Badge>{webrtcData.ipv6 || 'N/A'}</Badge>
            </div>
            <div className="py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <span className="text-ink-secondary font-medium">mDNS Aliases</span>
              <span className="text-ink text-right">{webrtcData.mdnsAliases || 'None'}</span>
            </div>
            <div className="py-3" style={{ borderBottom: '1px solid var(--row-border)' }}>
              <p className="text-ink-secondary font-medium mb-2">What is .local?</p>
              <p className="text-ink-tertiary text-xs">{webrtcData.mdnsExplain || 'N/A'}</p>
            </div>
            <div className="py-3">
              <p className="text-ink-secondary font-medium mb-2">Leak Assessment</p>
              <Badge>{webrtcData.leakAssessment || 'Unknown'}</Badge>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default DeviceAndWebRTC;
