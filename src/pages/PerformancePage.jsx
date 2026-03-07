import React from 'react';
import LatencyAndPing from '../components/LatencyAndPing';
import PortDirectory from '../components/PortDirectory';

const PerformancePage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <LatencyAndPing />
      <PortDirectory />
    </div>
  );
};

export default PerformancePage;
