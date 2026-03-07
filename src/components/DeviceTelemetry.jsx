import React from 'react';
import { Battery, Rotate3d, Cpu, Activity } from 'lucide-react';
import { useDeviceTelemetry, useDeviceInfo } from '../hooks/useNetwork';
import Card from './Card';
import Badge from './Badge';

const DeviceTelemetry = () => {
  const { requestPermissions, permissionStatus, ...telemetry } = useDeviceTelemetry();
  const deviceInfo = useDeviceInfo();

  // Robust mobile detection: Check OS OR touch points (many mobile browsers mask as Linux)
  const isMobile = deviceInfo && (
    deviceInfo.os === 'Android' || 
    deviceInfo.os === 'iOS / iPadOS' || 
    deviceInfo.os === 'Android / Mobile' ||
    (parseInt(deviceInfo.touchPoints) > 0 && deviceInfo.os !== 'Windows 10 / 11')
  );
  
  if (!isMobile) return null;

  const handleGrant = async () => {
    await requestPermissions();
  };

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

        {/* Orientation & 3D Visualization */}
        <div className="space-y-4 flex flex-col items-center">
          <div className="flex items-center gap-2 text-ink-secondary font-medium w-full">
            <Rotate3d className="w-4 h-4" />
            Motion & Orientation
          </div>
          
          {/* 3D Visualizer Container */}
          <div className="relative h-48 w-full flex items-center justify-center perspective-1000 overflow-hidden">
            {/* Ambient Background Glow */}
            <div 
              className="absolute w-24 h-40 rounded-3xl blur-3xl opacity-20 transition-colors duration-500"
              style={{ backgroundColor: 'var(--ink)' }}
            />
            
            {/* 3D Phone Frame */}
            <div 
              className="relative w-24 h-44 rounded-[2rem] border-2 border-white/20 transition-transform duration-100 ease-out preserve-3d shadow-2xl"
              style={{ 
                transform: `rotateX(${-telemetry.orientation.beta}deg) rotateY(${telemetry.orientation.gamma}deg) rotateZ(${telemetry.orientation.alpha}deg)`,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.1)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {/* Neon Neon Stroke Effect */}
              <div className="absolute inset-0 rounded-[2rem] border-[1.5px] border-ink opacity-40 animate-pulse shadow-[0_0_10px_var(--ink)]" />
              
              {/* Internal Screen Detail */}
              <div className="absolute inset-2 rounded-[1.5rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center space-y-1">
                 <div className="w-8 h-1 bg-white/10 rounded-full mb-4" /> {/* Earpiece */}
                 <div className="text-[10px] font-mono text-ink-tertiary opacity-50 uppercase tracking-widest">Live</div>
                 <div className="w-1.5 h-1.5 rounded-full bg-ink animate-ping" />
              </div>
              
              {/* Side Buttons (Visual Polish) */}
              <div className="absolute -left-[2px] top-12 w-[3px] h-8 bg-white/20 rounded-r-sm" />
              <div className="absolute -right-[2px] top-16 w-[3px] h-12 bg-white/20 rounded-l-sm" />
            </div>

            {/* Permission Overlay */}
            {permissionStatus !== 'granted' && (
              <div className="absolute inset-0 z-10 bg-surface/40 backdrop-blur-md flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-ink-secondary mb-3">Sensor Access Required</p>
                <button 
                  onClick={handleGrant}
                  className="px-4 py-2 bg-ink text-surface text-xs font-bold rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95"
                >
                  Enable Sensors
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full">
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
          <p className="text-[10px] text-ink-quaternary italic text-center">Tilt your device to see spatial movement</p>
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
