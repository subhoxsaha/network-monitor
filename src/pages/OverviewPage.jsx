import React from 'react';
import IPTrio from '../components/IPTrio';
import GeoAndConnection from '../components/GeoAndConnection';
import DeviceAndWebRTC from '../components/DeviceAndWebRTC';

const OverviewPage = () => {
  return (
    <div className="space-y-6 animate-fade-in px-0.5">
      <div className="animate-rise-in stagger-1"><IPTrio /></div>
      <div className="animate-rise-in stagger-2"><GeoAndConnection /></div>
      <div className="animate-rise-in stagger-3"><DeviceAndWebRTC /></div>
    </div>
  );
};

export default OverviewPage;
