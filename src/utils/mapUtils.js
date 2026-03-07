import L from 'leaflet';
import { useMapEvents } from 'react-leaflet';
import { useEffect } from 'react';

// ── Shared Helpers ──────────────────────────────────────────────
export const todayKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `nm_trail_${today}`;
};

export const getTrailFromStorage = () => {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const generateWavyPath = (points, style) => {
  if (points.length < 2) return points;
  if (style === 'solid-vector' || style === 'dashed-stream') return points;
  
  const wavy = [];
  const segments = style === 'turbulent-flow' ? 48 : 32; 

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    // Deterministic seed based on exact coordinates so the wave doesn't jitter
    const seed = (p1[0] * 1000 + p1[1] * 1000 + p2[0] * 1000 + p2[1] * 1000);
    const ampMult = style === 'turbulent-flow' ? 0.00008 : 0.00004;
    const freqMult = style === 'turbulent-flow' ? 2.5 : 1.2;
    
    const amplitude = (0.00002 + (Math.abs(Math.sin(seed)) * 0.00002)) * (style === 'turbulent-flow' ? 2.5 : 1); 
    const frequency = freqMult + (Math.abs(Math.cos(seed)) * freqMult);
    const phase = seed % Math.PI;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lng = p1[1] + (p2[1] - p1[1]) * t;
      
      const dx = p2[1] - p1[1];
      const dy = p2[0] - p1[0];
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len === 0) {
        if (j === 0) wavy.push([lat, lng]);
        continue;
      }

      // Normal vector
      const nx = -dy / len;
      const ny = dx / len;
      
      // Envelope ensures wave tapers to zero at the segment endpoints
      const envelope = Math.sin(t * Math.PI); 
      const wave = Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude * envelope;
      
      wavy.push([
        lat + nx * wave,
        lng + ny * wave
      ]);
    }
  }
  return wavy;
};

// ── Waypoint pin colors ─────────────────────────────────
export const pinColor = (i) => {
  // Use a deterministic hue based on index so it's "random" but stable
  const hue = (i * 137.5) % 360; // Golden angle for nice distribution
  return `hsl(${hue}, 85%, 55%)`;
};

// MapBoundsFitter
export const MapBoundsFitter = ({ trail, livePos, activeIdx }) => {
  const map = useMapEvents({
    zoom: () => {
      const z = map.getZoom();
      const iconScale = Math.max(0.4, Math.min(2.5, Math.pow(1.2, z - 14)));
      const lineScale = Math.max(0.3, Math.min(2.0, Math.pow(1.15, z - 14)));
      map.getContainer().style.setProperty('--map-icon-scale', iconScale);
      map.getContainer().style.setProperty('--map-line-scale', lineScale);
    }
  });

  useEffect(() => {
    // Set initial scale
    const z = map.getZoom();
    const iconScale = Math.max(0.4, Math.min(2.5, Math.pow(1.2, z - 14)));
    const lineScale = Math.max(0.3, Math.min(2.0, Math.pow(1.15, z - 14)));
    map.getContainer().style.setProperty('--map-icon-scale', iconScale);
    map.getContainer().style.setProperty('--map-line-scale', lineScale);

    if (!trail || trail.length === 0) {
      if (livePos?.latitude && livePos?.longitude) {
        map.flyTo([livePos.latitude, livePos.longitude], 18, { animate: true, duration: 1.5 });
      }
      return;
    }
    
    // 1. Single active waypoint (from map click) -> Center tightly on it
    if (activeIdx !== undefined && activeIdx !== null && activeIdx >= 0 && activeIdx < trail.length) {
      map.flyTo([trail[activeIdx].lat, trail[activeIdx].lng], 18, { animate: true, duration: 1.5 });
      return;
    }
    
    // 2. Continuous Live tracking mode (only 1 point total, and we have livePos) -> Center tightly
    if (trail.length === 1 && livePos?.latitude && livePos?.longitude) {
      map.flyTo([livePos.latitude, livePos.longitude], 18, { animate: true, duration: 1.5 });
      return;
    }

    // 3. Single waypoint with no active live tracking
    if (trail.length === 1) {
      map.flyTo([trail[0].lat, trail[0].lng], 17, { animate: true, duration: 1.5 });
      return;
    } 
    
    // 4. Multiple waypoints in trail: fit them all
    const bounds = L.latLngBounds(trail.map(p => [p.lat, p.lng]));
    
    // Add live pos to bounds if available, so user and trail are both on screen
    if (livePos?.latitude && livePos?.longitude) {
      bounds.extend([livePos.latitude, livePos.longitude]);
    }
    
    map.flyToBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5, maxZoom: 17 });
    
  // We explicitly omit livePos from the dependency array so that continuous 
  // tiny geolocation updates don't repeatedly yank the camera away from the user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, activeIdx, map]);

  return null;
};
