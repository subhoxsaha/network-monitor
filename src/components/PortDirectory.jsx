import React from 'react';
import { Server, Lock, Unlock, BookOpen } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';

const PORTS = [
  [20, 'TCP', 'FTP Data', 'File Transfer', 'std'],
  [21, 'TCP', 'FTP Control', 'File Transfer', 'std'],
  [22, 'TCP', 'SSH', 'Remote Access', 'std'],
  [23, 'TCP', 'Telnet', 'Remote Access', 'rest'],
  [25, 'TCP', 'SMTP', 'Email', 'std'],
  [53, 'TCP/UDP', 'DNS', 'Name Resolution', 'std'],
  [67, 'UDP', 'DHCP Server', 'Network', 'std'],
  [68, 'UDP', 'DHCP Client', 'Network', 'std'],
  [80, 'TCP', 'HTTP', 'Web', 'std'],
  [110, 'TCP', 'POP3', 'Email', 'std'],
  [123, 'UDP', 'NTP', 'Time Sync', 'std'],
  [143, 'TCP', 'IMAP', 'Email', 'std'],
  [443, 'TCP', 'HTTPS', 'Web (Secure)', 'std'],
  [465, 'TCP', 'SMTPS', 'Email (Secure)', 'std'],
  [514, 'UDP', 'Syslog', 'Logging', 'rest'],
  [587, 'TCP', 'SMTP Submit', 'Email', 'std'],
  [631, 'TCP', 'IPP (Printing)', 'Printing', 'std'],
  [993, 'TCP', 'IMAPS', 'Email (Secure)', 'std'],
  [995, 'TCP', 'POP3S', 'Email (Secure)', 'std'],
  [1433, 'TCP', 'MS SQL Server', 'Database', 'rest'],
  [1723, 'TCP', 'PPTP VPN', 'VPN', 'rest'],
  [3306, 'TCP', 'MySQL', 'Database', 'rest'],
  [3389, 'TCP', 'RDP', 'Remote Desktop', 'rest'],
  [5432, 'TCP', 'PostgreSQL', 'Database', 'rest'],
  [5900, 'TCP', 'VNC', 'Remote Desktop', 'rest'],
  [6379, 'TCP', 'Redis', 'Cache / DB', 'rest'],
  [8080, 'TCP', 'HTTP Alternate', 'Web / Proxy', 'std'],
  [8443, 'TCP', 'HTTPS Alternate', 'Web (Secure)', 'std'],
  [27017, 'TCP', 'MongoDB', 'Database', 'rest'],
];

const PortDirectory = () => {
  return (
    <>
      <div className="section-label flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5" />
        Reference
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <Server className="w-5 h-5 text-ink" />
          <h2 className="text-lg font-semibold text-ink">Well-Known Port Directory</h2>
          <span className="ml-auto text-xs text-ink-quaternary">{PORTS.length} ports</span>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-light)' }}>
                <th className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-semibold text-ink-secondary uppercase tracking-wider">Port</th>
                <th className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-semibold text-ink-secondary uppercase tracking-wider">Protocol</th>
                <th className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-semibold text-ink-secondary uppercase tracking-wider">Service</th>
                <th className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-semibold text-ink-secondary uppercase tracking-wider">Category</th>
                <th className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-semibold text-ink-secondary uppercase tracking-wider">Class</th>
              </tr>
            </thead>
            <tbody>
              {PORTS.map(([port, protocol, service, category, cl], idx) => (
                <tr key={idx} className="hover:bg-surface-light transition-colors" style={{ borderBottom: '1px solid var(--row-border)' }}>
                  <td className="px-3 sm:px-6 py-3 font-mono font-bold text-xs sm:text-sm text-ink">{port}</td>
                  <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-ink-tertiary">{protocol}</td>
                  <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-ink font-medium">{service}</td>
                  <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-ink-tertiary">{category}</td>
                  <td className="px-3 sm:px-6 py-3">
                    {cl === 'std' ? (
                      <Badge dot>
                        <Unlock className="w-3 h-3 mr-1" />
                        Standard
                      </Badge>
                    ) : (
                      <Badge dot>
                        <Lock className="w-3 h-3 mr-1" />
                        Restricted
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="note-box mx-4 sm:mx-6 mb-4 mt-4 text-[10px] sm:text-xs">
          Port classification shown is standard reference, not actively probed. Browsers cannot perform live port scanning — use <code>nmap</code> or <code>netstat</code> for live auditing.
        </div>
      </Card>
    </>
  );
};

export default PortDirectory;
