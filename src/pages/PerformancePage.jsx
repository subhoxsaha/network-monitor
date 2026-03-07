import React from 'react';
import LatencyAndPing from '../components/LatencyAndPing';

const PerformancePage = () => {
  return (
    <div className="space-y-6 animate-fade-in px-0.5">
      <div className="animate-rise-in stagger-1"><LatencyAndPing /></div>
    </div>
  );
};

export default PerformancePage;
