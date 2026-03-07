import React from 'react';
import { Battery, Rotate3d, Cpu, Activity } from 'lucide-react';
import { useDeviceTelemetry } from '../hooks/useNetwork';
import Card from './Card';
import Badge from './Badge';

const DeviceTelemetry = () => {
  const telemetry = useDeviceTelemetry();

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)', border: '1px solid var(--icon-border)' }}>
          <Activity className="w-5 h-5 text-ink" />
        </div>
        <h2 className="text-xl font-semibold text-ink">Live Hardware Telemetry</h2>
        <Badge className="ml-auto">Real-time</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Battery */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-ink-secondary font-medium">
            <Battery className="w-4 h-4" />
            Battery Status
          </div>
          {telemetry.battery ? (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold text-ink font-mono">{telemetry.battery.level}%</span>
                <span className="text-xs text-ink-tertiary">{telemetry.battery.charging ? 'Charging' : 'Discharging'}</span>
              </div>
              <div className="h-2 w-full bg-surface-light rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ 
                    width: `${telemetry.battery.level}%`,
                    backgroundColor: telemetry.battery.level > 20 ? '#30d158' : '#ff453a'
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-quaternary italic">Battery API not supported</p>
          )}
        </div>

        {/* Orientation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-ink-secondary font-medium">
            <Rotate3d className="w-4 h-4" />
            Motion & Orientation
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-light p-2 rounded border border-white/5 text-center">
              <p className="text-[10px] text-ink-quaternary uppercase">Alpha</p>
              <p className="text-sm font-mono font-bold text-ink">{telemetry.orientation.alpha}°</p>
            </div>
            <div className="bg-surface-light p-2 rounded border border-white/5 text-center">
              <p className="text-[10px] text-ink-quaternary uppercase">Beta</p>
              <p className="text-sm font-mono font-bold text-ink">{telemetry.orientation.beta}°</p>
            </div>
            <div className="bg-surface-light p-2 rounded border border-white/5 text-center">
              <p className="text-[10px] text-ink-quaternary uppercase">Gamma</p>
              <p className="text-sm font-mono font-bold text-ink">{telemetry.orientation.gamma}°</p>
            </div>
          </div>
          <p className="text-[10px] text-ink-quaternary italic text-center">Tilt your device to see real-time updates</p>
        </div>

        {/* Memory */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-ink-secondary font-medium">
            <Cpu className="w-4 h-4" />
            Memory Usage
          </div>
          {telemetry.memory ? (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold text-ink font-mono">{telemetry.memory.used} <span className="text-xs font-normal">MB</span></span>
                <span className="text-xs text-ink-tertiary">of {telemetry.memory.total} MB</span>
              </div>
              <div className="h-2 w-full bg-surface-light rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full transition-all duration-500 bg-ink-tertiary rounded-full"
                  style={{ width: `${(telemetry.memory.used / telemetry.memory.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-ink-quaternary text-right">JS Heap Limit: {telemetry.memory.limit} MB</p>
            </div>
          ) : (
            <p className="text-sm text-ink-quaternary italic">Memory metrics only available in Chromium</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default DeviceTelemetry;
