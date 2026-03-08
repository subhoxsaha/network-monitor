import React from 'react';
import LatencyAndPing from '../components/LatencyAndPing';
import DeviceAndWebRTC from '../components/DeviceAndWebRTC';

const PerformancePage = () => {
  return (
    <div className="space-y-6 animate-fade-in px-0.5">
      <div className="animate-rise-in stagger-1"><LatencyAndPing /></div>
      <div className="animate-rise-in stagger-2"><DeviceAndWebRTC /></div>
    </div>
  );
};

export default PerformancePage;
