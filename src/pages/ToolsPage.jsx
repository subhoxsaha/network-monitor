import React from 'react';
import HTTPTester from '../components/HTTPTester';
import Capabilities from '../components/Capabilities';
import RevealBrowserData from '../components/RevealBrowserData';

const ToolsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in px-0.5">
      <div className="animate-rise-in stagger-1"><HTTPTester /></div>
      <div className="animate-rise-in stagger-2"><Capabilities /></div>
      <div className="animate-rise-in stagger-3"><RevealBrowserData /></div>
    </div>
  );
};

export default ToolsPage;
