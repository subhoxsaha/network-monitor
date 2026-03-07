import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBrowserGeolocation } from '../hooks/useNetwork';
import { apiCall } from '../lib/api';

const LivePresence = () => {
  const { user } = useAuth();
  const { position, requestLocation, permissionStatus } = useBrowserGeolocation();
  const lastSyncRef = useRef(0);

  // Auto-start tracking if the user is authenticated AND they have previously granted GPS permission
  useEffect(() => {
    if (user?.sub && permissionStatus === 'granted') {
      requestLocation();
    }
  }, [user?.sub, permissionStatus, requestLocation]);

  // Push location updates seamlessly to backend
  useEffect(() => {
    if (!user?.sub || !position?.latitude) return;

    const now = Date.now();
    
    // Throttle: Max 1 background API push per 15 seconds to prevent backend queue flooding
    if (now - lastSyncRef.current < 15000) return;
    lastSyncRef.current = now;

    apiCall('PUT', user.sub, '/api/users/ping', {
      point: {
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy || 10,
        timestamp: now
      },
      email: user.email,
      userName: user.name,
      userPicture: user.picture
    }).catch(err => {
        // Fail silently in background to avoid disrupting UX
        console.warn('Silently suppressed background presence sync failure:', err);
    });

  }, [position, user]);

  return null;
};

export default LivePresence;
