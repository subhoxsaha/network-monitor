import React from 'react';
import HTTPTester from '../components/HTTPTester';
import Capabilities from '../components/Capabilities';
import RevealBrowserData from '../components/RevealBrowserData';

const ToolsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <HTTPTester />
      <Capabilities />
      <RevealBrowserData />
    </div>
  );
};

export default ToolsPage;
