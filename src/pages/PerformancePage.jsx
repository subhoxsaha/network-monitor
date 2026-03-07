import React from 'react';
import LatencyAndPing from '../components/LatencyAndPing';
import DeviceTelemetry from '../components/DeviceTelemetry';

const PerformancePage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <LatencyAndPing />
      <DeviceTelemetry />
    </div>
  );
};

export default PerformancePage;
