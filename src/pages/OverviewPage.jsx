import React from 'react';
import IPTrio from '../components/IPTrio';
import GeoAndConnection from '../components/GeoAndConnection';
import DeviceAndWebRTC from '../components/DeviceAndWebRTC';

const OverviewPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <IPTrio />
      <GeoAndConnection />
      <DeviceAndWebRTC />
    </div>
  );
};

export default OverviewPage;
