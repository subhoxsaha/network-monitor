import React from 'react';
import {
  Cpu, Radio, Video, Download, Globe2, Cog, Bell, MapPin, Bluetooth, Usb, Cable, Nfc,
  Rss, Users, Megaphone, Server, CheckCircle2, XCircle
} from 'lucide-react';
import { useBrowserCapabilities } from '../hooks/useNetwork';
import Card from './Card';

const API_ICONS = {
  'WebSocket': Radio, 'WebRTC': Video, 'Fetch API': Download, 'XMLHttpRequest': Globe2,
  'Service Worker': Cog, 'Push API': Megaphone, 'Beacon API': Rss, 'Server-Sent Events': Server,
  'Shared Worker': Users, 'Broadcast Channel': Rss, 'Notifications': Bell, 'Geolocation': MapPin,
  'Web Bluetooth': Bluetooth, 'WebUSB': Usb, 'Web Serial': Cable, 'Web NFC': Nfc,
};

const Capabilities = () => {
  const caps = useBrowserCapabilities();

  return (
    <Card className="p-4 sm:p-6 animate-rise-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)', border: '1px solid var(--icon-border)' }}>
          <Cpu className="w-5 h-5 text-ink" />
        </div>
        <h2 className="text-xl font-semibold text-ink">Browser Capabilities</h2>
        {caps && (
          <span className="ml-auto text-xs text-ink-quaternary font-mono">
            {caps.filter(([, s]) => s).length}/{caps.length} supported
          </span>
        )}
      </div>
      {caps ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {caps.map(([name, supported], idx) => {
            const Icon = API_ICONS[name] || Cpu;
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-surface-light rounded-lg transition-all duration-200 hover:bg-surface-lighter"
                style={{ border: '1px solid var(--row-border)' }}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${supported ? 'text-ink' : 'text-ink-quaternary'}`} />
                  <span className="text-ink font-medium text-sm">{name}</span>
                </div>
                {supported ? (
                  <CheckCircle2 className="w-5 h-5 text-ink" />
                ) : (
                  <XCircle className="w-5 h-5 text-ink-quaternary opacity-50" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-ink-quaternary">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-3"></div>
          <p>Checking…</p>
        </div>
      )}
    </Card>
  );
};

export default Capabilities;
