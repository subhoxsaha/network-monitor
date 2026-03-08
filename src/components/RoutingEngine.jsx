import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Suppress OSRM demo server console spam
const _origWarn = console.warn.bind(console);
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('OSRM')) return;
  _origWarn(...args);
};

/**
 * RoutingEngine – Persists route across re-renders.
 * 
 * Key design:
 *   - Uses useRef to hold the L.Routing.control instance
 *   - Serialises waypoints to a JSON key so re-renders with the same data are no-ops
 *   - Only creates / destroys the control when `enabled` toggles or waypoints genuinely change
 *   - Loading spinner fires only during the XHR fetch, not on idle re-renders
 */
const RoutingEngine = ({ waypoints, enabled = true, onSummary, onLoading, onRouteSegments }) => {
  const map = useMap();
  const controlRef = useRef(null);
  const prevKeyRef = useRef('');

  // Serialise waypoints to a stable string key for shallow comparison
  const waypointKey = (waypoints && waypoints.length >= 2)
    ? waypoints.map(p => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|')
    : '';

  // Tear down the existing routing control
  const destroyControl = useCallback(() => {
    if (controlRef.current) {
      try { controlRef.current.off(); } catch (_) {}
      if (controlRef.current._map) {
        try { map?.removeControl(controlRef.current); } catch (_) {}
      }
      controlRef.current = null;
    }
  }, [map]);

  // Create a new routing control with current waypoints
  const createControl = useCallback(() => {
    if (!map || !L.Routing || !waypoints || waypoints.length < 2) return;

    if (onLoading) onLoading(true);

    const latlngs = waypoints.map(p => L.latLng(p.lat, p.lng));

    const plan = L.Routing.plan(latlngs, {
      createMarker: () => false,
      draggableWaypoints: false,
      addWaypoints: false,
    });

    const ctrl = L.Routing.control({
      plan,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://routing.openstreetmap.de/routed-car/route/v1',
        timeout: 15000,
      }),
      routeLine: () => L.layerGroup(), // Suppress default Leaflet Routing Machine line
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
    }).addTo(map);

    ctrl.on('routesfound', (e) => {
      if (onLoading) onLoading(false);
      const route = e.routes?.[0];
      if (route) {
        if (onSummary) onSummary(route.summary);
        
        // Extract segments using waypointIndices
        if (onRouteSegments && route.coordinates) {
          const segments = [];
          const indices = route.waypointIndices || [];
          if (indices.length >= 2) {
            for (let i = 1; i < indices.length; i++) {
              segments.push(route.coordinates.slice(indices[i - 1], indices[i] + 1));
            }
          } else {
            segments.push(route.coordinates);
          }
          onRouteSegments(segments);
        }
      }
    });

    ctrl.on('routingerror', () => {
      if (onLoading) onLoading(false);
    });

    controlRef.current = ctrl;
  }, [map, waypoints, onSummary, onLoading, onRouteSegments]);

  // ── Main effect: reacts to enable toggle or waypoint changes ──
  useEffect(() => {
    // Case 1: Disabled or not enough points → tear down and exit
    if (!enabled || !waypointKey) {
      destroyControl();
      prevKeyRef.current = '';
      if (onLoading) onLoading(false);
      return;
    }

    // Case 2: Waypoints haven't changed → do nothing
    if (waypointKey === prevKeyRef.current && controlRef.current) {
      return;
    }

    // Case 3: Waypoints changed or first render → rebuild
    destroyControl();
    prevKeyRef.current = waypointKey;
    createControl();

    return () => destroyControl();
  }, [enabled, waypointKey, destroyControl, createControl, onLoading]);

  return null;
};

export default RoutingEngine;
