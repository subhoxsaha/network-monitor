import React, { createContext, useContext } from 'react';
import { usePublicIP } from '../hooks/useNetwork';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const publicIP = usePublicIP();
  return (
    <NetworkContext.Provider value={publicIP}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useSharedPublicIP = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useSharedPublicIP must be used within NetworkProvider');
  return ctx;
};
