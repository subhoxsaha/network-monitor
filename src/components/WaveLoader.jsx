import React from 'react';

const WaveLoader = ({ text = 'Loading…', className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
    <div className="wave-loader text-accent-primary mb-3">
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
    </div>
    <p className="text-sm text-ink-quaternary">{text}</p>
  </div>
);

export default WaveLoader;
