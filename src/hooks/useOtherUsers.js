import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../lib/api';

/**
 * Hook to fetch and poll other users' locations from the backend.
 * 
 * @param {boolean} mapActive - Whether the map is currently active/visible. Polling pauses if false.
 * @param {number} pollIntervalMs - How often to poll the server (default 30s)
 */
export const useOtherUsers = (mapActive = true, pollIntervalMs = 30000) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const timerRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchUsers = useCallback(async (isBackground = false) => {
    // Only fetch if authenticated and we aren't already fetching
    if (!user?.sub || isFetchingRef.current) return;
    
    if (!isBackground) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    
    try {
      const response = await apiCall('GET', user.sub, '/api/presence');
      
      if (response.error) {
        throw new Error(response.message || 'Failed to fetch presence data');
      }
      
      setUsers(response.users || []);
      setError(null);
    } catch (err) {
      console.error('[useOtherUsers] Error fetching users:', err);
      // We don't want to clear existing users on a transient network error
      if (!isBackground) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.sub]);

  // Initial load and polling setup
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!user?.sub) {
      setUsers([]);
      setLoading(false);
      return;
    }

    if (mapActive) {
      // Fetch immediately on mount or map becoming active
      fetchUsers(false);

      // Set up polling
      timerRef.current = setInterval(() => {
        // Pass true to indicate it's a background refresh (don't show big loader)
        fetchUsers(true);
      }, pollIntervalMs);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user?.sub, mapActive, pollIntervalMs, fetchUsers]);

  return { users, loading, error, refresh: () => fetchUsers(false) };
};
