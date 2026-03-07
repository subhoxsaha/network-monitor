import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapPinPlus, RefreshCw, Clock, Route, Layers, RotateCcw, Locate, Map as MapIcon, Mountain, ChevronDown, Edit2, Trash2, Check, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle as LeafletCircle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Card from './Card';
import Badge from './Badge';
import { useAuth } from '../context/AuthContext';
import { useCopy } from '../hooks/useCustom';
import { useBrowserGeolocation } from '../hooks/useNetwork';
import { getCookie, setCookie } from '../utils/cookies';
import toast from 'react-hot-toast';
import { apiCall } from '../lib/api';

// ── Constants ────────────────────────────────────────────
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

const MAP_TYPES = [
  { id: 'roadmap', label: 'Default', icon: MapIcon, url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© OpenStreetMap' },
  { id: 'dark', label: 'Dark Mode', icon: Layers, url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 19, attribution: '© CARTO' }
];

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India

// Helper to center the map bounds dynamically
const MapBoundsFitter = ({ trail, livePos, activeIdx }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    // 1. User clicks a specific waypoint from the log list
    if (activeIdx !== null && trail[activeIdx]) {
      map.flyTo([trail[activeIdx].lat, trail[activeIdx].lng], 18, { animate: true, duration: 1.5 });
      return;
    }

    // 2. Initial load/empty trail: optionally center on live pos if available
    if (trail.length === 0) {
      if (livePos) {
        // Only set view if map isn't already deeply zoomed somewhere
        if (map.getZoom() < 10) {
          map.setView([livePos.latitude, livePos.longitude], 17, { animate: true, duration: 1.5 });
        }
      }
      return;
    }
    
    // 3. One waypoint in trail
    if (trail.length === 1) {
      map.flyTo([trail[0].lat, trail[0].lng], 17, { animate: true, duration: 1.5 });
      return;
    } 
    
    // 4. Multiple waypoints in trail: fit them all
    const bounds = L.latLngBounds(trail.map(p => [p.lat, p.lng]));
    
    // Add live pos to bounds if available, so user and trail are both on screen
    if (livePos) {
      bounds.extend([livePos.latitude, livePos.longitude]);
    }
    
    map.flyToBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5, maxZoom: 17 });
    
  // We explicitly omit livePos from the dependency array so that continuous 
  // tiny geolocation updates don't repeatedly yank the camera away from the user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail.length, activeIdx, map]);

  return null;
};

// ── Developer Interactions ──────────────────────────────
const MapInteractions = ({ onRightClick }) => {
  useMapEvents({
    contextmenu: (e) => {
      onRightClick(e.latlng);
    }
  });
  return null;
};

// ── Helpers ──────────────────────────────────────────────
const todayKey = () => {
  // Use UTC YYYY-MM-DD to match the backend and avoid timezone drift
  const today = new Date().toISOString().split('T')[0];
  return `nm_trail_${today}`;
};

const getTrailFromStorage = () => {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveTrailToStorage = (trail) => {
  localStorage.setItem(todayKey(), JSON.stringify(trail));
};

const haversine = (a, b) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: { 'User-Agent': 'NetworkMonitor/1.0' }
    });
    const data = await res.json();
    if (data.display_name) {
      // Extract a shorter, more readable address (e.g., "Park Street, Kolkata")
      const parts = data.address;
      const main = parts.road || parts.pedestrian || parts.suburb || parts.neighbourhood || parts.city_district || '';
      const city = parts.city || parts.town || parts.village || '';
      if (main && city) return `${main}, ${city}`;
      return data.display_name.split(',').slice(0, 2).join(',').trim();
    }
    return null;
  } catch {
    return null;
  }
};

// ── Waypoint pin colors ─────────────────────────────────
const pinColor = (i) => {
  // Use a deterministic hue based on index so it's "random" but stable
  const hue = (i * 137.5) % 360; // Golden angle for nice distribution
  return `hsl(${hue}, 85%, 55%)`;
};

const pinLabel = (i, total) => {
  if (i === 0) return 'S';
  if (i === total - 1) return 'E';
  return `${i + 1}`;
};

// ── Main Component ──────────────────────────────────────
const LocationTracker = () => {
  const [trail, setTrail] = useState(() => getTrailFromStorage());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [mapType, setMapType] = useState(getCookie('nm_map_theme') || 'roadmap');
  const [mapTypeOpen, setMapTypeOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [ghostPoint, setGhostPoint] = useState(null);
  const mapRef = useRef(null);
  const selectedTheme = MAP_TYPES.find(t => t.id === mapType) || MAP_TYPES[0];
  const { copy } = useCopy();
  const { user } = useAuth();
  const { position: livePos, requestLocation, permissionStatus, heading: compassHeading } = useBrowserGeolocation(); // Auto-tracks live location

  // Auto-request location on mount so the blue dot shows up immediately
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Wait for auth context to load

  // Load trail on mount
  const refreshData = useCallback(async (silent = false) => {
    if (!user?.sub) {
      setSyncing(false);
      return;
    }

    if (!silent) setSyncing(true);
    const result = await apiCall('GET', user.sub);
    
    if (result?.trail?.points) {
      const cloudPoints = result.trail.points;
      
      // If cloud has data, it wins (but we could merge later if needed)
      if (cloudPoints.length > 0) {
        setTrail(cloudPoints);
        saveTrailToStorage(cloudPoints);
      } 
      else if (trail.length > 0) {
        setCloudSyncing(true);
        // PUT the whole trail to bootstrap it
        apiCall('PUT', user.sub, '/api/trails', { 
          trail, 
          email: user.email,
          userName: user.name,
          userPicture: user.picture
        }).finally(() => setCloudSyncing(false));
      }
    }
    
    if (!silent) setSyncing(false);
  }, [user?.sub, trail]);

  // Load trail on mount
  useEffect(() => {
    refreshData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub]);

  // Persist to localStorage
  useEffect(() => { saveTrailToStorage(trail); }, [trail]);

  // Removed manual fitBounds and mapped to MapBoundsFitter component for declarative Leaflet syncing

  // Shared logic for adding a waypoint point
  const processPoint = useCallback(async (lat, lng, acc, alt) => {
    setLoading(true);
    const placeName = await reverseGeocode(lat, lng);
    const point = {
      lat,
      lng,
      accuracy: Math.round(acc || 0),
      altitude: alt ? Math.round(alt) : null,
      timestamp: Date.now(),
      label: placeName || `Waypoint #${trail.length + 1}`,
    };
    setTrail((prev) => [...prev, point]);
    toast.success(placeName ? `At ${placeName}` : 'Waypoint marked!');
    setLoading(false);
    if (user?.sub) {
      setCloudSyncing(true);
      const res = await apiCall('POST', user.sub, '/api/trails', { 
        point, 
        email: user.email,
        userName: user.name,
        userPicture: user.picture
      });
      setCloudSyncing(false);
      
      if (res.error) {
        toast.error(`Cloud sync failed: ${res.message}. It will be retried on next refresh.`, { id: 'sync-error' });
      }
    }
  }, [trail.length, user]);

  // Mark current location
  const markLocation = useCallback(async () => {
    if (permissionStatus === 'prompt') requestLocation(); // Also start the continuous blue dot watcher
    
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not available');
      return;
    }

    if (livePos) {
      await processPoint(livePos.latitude, livePos.longitude, livePos.accuracy, livePos.altitude);
      return;
    }

    // Slow path: getting location for the first time
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await processPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.altitude);
      },
      (err) => {
        setLoading(false);
        toast.error(err.message || 'Could not get location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [permissionStatus, requestLocation, livePos, processPoint]);



  const deletePoint = useCallback((idx) => {
    setTrail((prev) => {
      const newTrail = prev.filter((_, i) => i !== idx);
      if (user?.sub) {
        setCloudSyncing(true);
        apiCall('PUT', user.sub, '/api/trails', { 
          trail: newTrail, 
          email: user.email,
          userName: user.name,
          userPicture: user.picture
        }).finally(() => setCloudSyncing(false));
      }
      return newTrail;
    });
    if (selectedIdx === idx) setSelectedIdx(null);
    if (editingIdx === idx) setEditingIdx(null);
    toast('Waypoint deleted');
  }, [selectedIdx, editingIdx, user]);

  const saveEdit = useCallback((idx) => {
    setTrail((prev) => {
      const newTrail = [...prev];
      newTrail[idx] = { ...newTrail[idx], label: editLabel || `Waypoint #${idx + 1}` };
      if (user?.sub) {
        setCloudSyncing(true);
        apiCall('PUT', user.sub, '/api/trails', { 
          trail: newTrail, 
          email: user.email,
          userName: user.name,
          userPicture: user.picture
        }).finally(() => setCloudSyncing(false));
      }
      return newTrail;
    });
    setEditingIdx(null);
    toast.success('Label updated');
  }, [editLabel, user]);

  // Computed stats
  const totalDistance = useMemo(() => trail.reduce((sum, p, i) => {
    if (i === 0) return 0;
    return sum + haversine(trail[i - 1], p);
  }, 0), [trail]);

  const timeSpan = useMemo(() => trail.length >= 2
    ? `${formatTime(trail[0].timestamp)} → ${formatTime(trail[trail.length - 1].timestamp)}`
    : '—', [trail]);

  const mapCenter = trail.length > 0
    ? [trail[trail.length - 1].lat, trail[trail.length - 1].lng]
    : livePos 
      ? [livePos.latitude, livePos.longitude] 
      : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  const polylinePath = useMemo(() => trail.map((p) => [p.lat, p.lng]), [trail]);

  // Create custom Blue Dot Icon
  const customDotMarker = useMemo(() => {
    const isGPSActive = permissionStatus === 'granted';
    const heading = compassHeading || 0;

    if (isGPSActive && heading != null) {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="transform: rotate(${heading}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; position: relative;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0a84ff" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 1px 3px rgba(0,0,0,0.5)); transform: translateY(-4px);">
              <path d="M12 2L2 22l10-4 10 4L12 2z" />
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="width: 16px; height: 16px; background-color: #0a84ff; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }, [permissionStatus, compassHeading]);

  // Factory for dynamic waypoint markers
  const getWaypointIcon = useCallback((i) => {
    const color = pinColor(i);
    return L.divIcon({
      className: 'custom-leaflet-waypoint-marker',
      html: `
        <div style="width: 28px; height: 28px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4));">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
            <circle cx="12" cy="10" r="3" fill="#fff"/>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [12, 24],
      popupAnchor: [0, -22]
    });
  }, []);

  // Ghost waypoint icon
  const ghostIcon = useMemo(() => L.divIcon({
    className: 'custom-leaflet-ghost-marker',
    html: `
      <div style="width: 28px; height: 28px; opacity: 0.6; filter: grayscale(100%)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" fill="#71717a" stroke="#fff" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [12, 24]
  }), []);

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-rise-in">
      {/* ── Immersive Floating Map Card ── */}
      <Card className="p-0 overflow-hidden relative shadow-xl bg-surface" style={{ borderRadius: '24px', height: '36rem' }}>
        
        {/* Loading Overlay */}
        <div 
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface transition-opacity duration-700 ease-in-out"
          style={{ opacity: isMapReady ? 0 : 1, pointerEvents: isMapReady ? 'none' : 'auto' }}
        >
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-ink-secondary animate-pulse">Initializing Map Engine…</p>
        </div>

        {/* Full-bleed Map */}
        <div 
          className={`absolute inset-0 z-0 transition-all duration-1000 ease-out ${devMode ? 'dev-map-active scale-[0.99] ring-4 ring-blue-500/20 rounded-2xl' : ''}`}
          style={{ 
            opacity: isMapReady ? 1 : 0, 
            filter: isMapReady ? 'blur(0px)' : 'blur(8px)',
            transform: isMapReady ? 'scale(1)' : 'scale(1.02)'
          }}
        >
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={trail.length > 0 || livePos ? 17 : 5}
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
            whenReady={() => {
              // Add a tiny delay to ensure tiles start fetching before lifting the veil
              setTimeout(() => setIsMapReady(true), 400);
            }}
          >
            <TileLayer
              attribution={selectedTheme.attribution}
              url={selectedTheme.url}
              maxZoom={selectedTheme.maxZoom}
            />
            
            <MapBoundsFitter trail={trail} livePos={livePos} activeIdx={selectedIdx} />
            {devMode && <MapInteractions onRightClick={(ll) => setGhostPoint(ll)} />}

            {polylinePath.length >= 2 && (
              <>
                {/* Outer Glow Polyline */}
                <Polyline 
                  positions={polylinePath} 
                  pathOptions={{ 
                    color: '#0a84ff', 
                    opacity: 0.25, 
                    weight: 8,
                    lineJoin: 'round',
                    lineCap: 'round',
                    className: 'map-glow-trail'
                  }} 
                />
                {/* Core Crisp Polyline */}
                <Polyline 
                  positions={polylinePath} 
                  pathOptions={{ 
                    color: '#0a84ff', 
                    opacity: 0.9, 
                    weight: 3,
                    lineJoin: 'round',
                    lineCap: 'round'
                  }} 
                />
              </>
            )}

            {/* Ghost Manual Marker (Dev Mode) */}
            {devMode && ghostPoint && (
              <Marker
                position={ghostPoint}
                icon={ghostIcon}
                eventHandlers={{
                   click: () => {
                     // Confirm manually
                     const lat = ghostPoint.lat;
                     const lng = ghostPoint.lng;
                     setGhostPoint(null);
                     // Call the markLocation logic but with override coords
                     processPoint(lat, lng, 0, null);
                   }
                }}
              >
                <Popup closeButton={false}>
                  <div className="text-[11px] font-bold text-center p-1">
                    Left-click marker to CONFIRM<br/>
                    Right-click elsewhere to RE-POSITION
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Trail Markers (Red Pins) */}
            {trail.map((p, i) => (
              <Marker
                key={p.timestamp}
                position={[p.lat, p.lng]}
                icon={getWaypointIcon(i)}
                eventHandlers={{
                  click: () => setSelectedIdx(i)
                }}
                zIndexOffset={i * 10}
              >
                {selectedIdx === i && (
                  <Popup className="custom-popup" closeButton={false}>
                    <div style={{ padding: '4px', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1e', marginBottom: '4px' }}>
                        {p.label || `Waypoint #${i + 1}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#636366' }}>
                        <b>Time:</b> {formatTime(p.timestamp)}<br />
                        <b>Coordinates:</b><br /> {p.lat.toFixed(5)}, {p.lng.toFixed(5)}<br />
                        <b>Accuracy:</b> ±{p.accuracy}m
                      </div>
                    </div>
                  </Popup>
                )}
              </Marker>
            ))}
            
            {/* Live User Position Marker (Blue Dot with Arrow if moving) */}
            {livePos && (
              <>
                <Marker
                  position={[livePos.latitude, livePos.longitude]}
                  icon={customDotMarker}
                  zIndexOffset={9999}
                />
                {livePos.accuracy && (
                  <LeafletCircle
                    center={[livePos.latitude, livePos.longitude]}
                    radius={livePos.accuracy}
                    pathOptions={{
                      fillColor: '#0a84ff',
                      fillOpacity: 0.15,
                      color: '#0a84ff',
                      opacity: 0.3,
                      weight: 1,
                    }}
                    interactive={false}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>

        {/* ── Floating Top Left (Title & Stats) ── */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          {/* Header Panel */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg pointer-events-auto" style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => {
                setDevMode(!devMode);
                if (devMode) setGhostPoint(null);
                toast(devMode ? 'Dev Mode Disabled' : 'Dev Mode Enabled', { id: 'dev-toggle' });
              }}
              className="hover:opacity-80 transition-all duration-300 relative group"
              aria-label={devMode ? "Disable developer mode" : "Enable developer mode"}
            >
              {devMode && (
                <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping scale-150" />
              )}
              <Route className={`w-4 h-4 transition-colors relative z-10 ${devMode ? 'text-blue-400' : 'text-[#ff9f0a]'}`} />
            </button>
            <h2 className="text-sm font-bold text-white tracking-wide">Daily Trail</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}>
              {new Date().toLocaleDateString([], { day: 'numeric', month: 'short' })}
            </span>
            {user?.sub && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md transition-all duration-300 ${cloudSyncing ? 'text-blue-400 bg-blue-500/20 animate-pulse' : 'text-zinc-400 bg-black/40'}`}>
                {cloudSyncing ? '☁ Syncing...' : '☁ Synced'}
              </span>
            )}
          </div>
          
          {/* Stats Panel */}
          {trail.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-2xl shadow-lg pointer-events-auto" style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <p className="text-zinc-400 uppercase text-[9px] font-bold tracking-wider mb-0.5">Waypoints</p>
                <p className="text-white font-mono font-bold text-xs">{trail.length}</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <p className="text-zinc-400 uppercase text-[9px] font-bold tracking-wider mb-0.5">Distance</p>
                <p className="text-white font-mono font-bold text-xs">{formatDistance(totalDistance)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Floating Top Right (Controls & Actions) ── */}
        <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
          {/* Map Type Toggle Dropdown */}
          <div className="relative group">
            <button
              onClick={() => setMapTypeOpen(!mapTypeOpen)}
              onBlur={() => setTimeout(() => setMapTypeOpen(false), 200)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              aria-label="Toggle map theme selector"
              aria-expanded={mapTypeOpen}
            >
              <selectedTheme.icon className="w-3.5 h-3.5 text-zinc-300" />
              <span>Map Type</span>
              <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: mapTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {mapTypeOpen && (
              <div
                className="absolute top-full right-0 mt-2 p-1.5 rounded-2xl shadow-xl flex flex-col gap-1 min-w-[130px] animate-rise-in origin-top-right z-50"
                style={{ background: 'rgba(28,28,30,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {MAP_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { 
                      setMapTypeOpen(false);
                      if (mapType !== id) {
                        setIsMapReady(false);
                        setMapType(id);
                        setCookie('nm_map_theme', id, 30); // Set cookie here
                        // Simulate loading delay for new tiles
                        setTimeout(() => setIsMapReady(true), 600);
                      }
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold w-full transition-colors hover:bg-white/10"
                    style={{ color: mapType === id ? '#fff' : 'rgba(255,255,255,0.6)', background: mapType === id ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: mapType === id ? '#0a84ff' : 'inherit' }} />
                      {label}
                    </div>
                    {mapType === id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => refreshData(false)}
              disabled={syncing}
              title="Refresh Trail"
              className={`w-9 h-9 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 ${syncing ? 'animate-spin' : ''}`}
              style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
              aria-label="Refresh trail data from cloud"
            >
              <RefreshCw className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>

        {/* ── Floating Bottom Center (Mark Location) ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={markLocation}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full font-bold shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 group overflow-hidden relative"
            style={{ 
              background: loading ? 'rgba(28,28,30,0.85)' : '#30d158', 
              color: '#fff', 
              border: loading ? '1px solid rgba(255,255,255,0.1)' : 'none',
              backdropFilter: loading ? 'blur(12px)' : 'none'
            }}
            aria-label="Mark current GPS location"
          >
            {/* Glossy shine effect */}
            {!loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine transition-transform" />
            )}
            <MapPinPlus className="w-5 h-5 relative z-10" />
            <span className="relative z-10">{loading ? 'Getting GPS…' : 'Mark Waypoint'}</span>
          </button>
        </div>

        {/* ── Floating Bottom Right (Re-center) ── */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!livePos || permissionStatus === 'prompt') {
              requestLocation();
              toast('Acquiring GPS signal...');
            } else if (mapRef.current) {
              mapRef.current.flyTo([livePos.latitude, livePos.longitude], 18, { animate: true, duration: 1.5 });
              toast('Centered on Live Location', { id: 'recenter' });
            }
            setSelectedIdx(null); // Unselect any waypoint
          }}
          title="Re-center on Live Location"
          className="absolute bottom-6 right-6 z-10 w-12 h-12 flex items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)' }}
          aria-label="Center map on your current location"
        >
          <Locate className="w-6 h-6 text-blue-500" />
        </button>
      </Card>

      {/* Waypoint Log */}
      {trail.length > 0 && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-ink-tertiary" />
            <h3 className="text-sm font-semibold text-ink">Waypoint Log</h3>
            <span className="text-[10px] text-ink-quaternary ml-auto font-mono">{trail.length} point{trail.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-0 max-h-60 overflow-y-auto pr-1 premium-scrollbar">
            {trail.map((point, i) => (
              <div
                key={point.timestamp}
                className="flex items-center gap-3 py-2 text-xs rounded-lg px-2 group hover:bg-surface-light transition-colors border-b border-[var(--row-border)]"
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => {
                    setSelectedIdx(i);
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                    style={{ background: pinColor(i) }}
                  >{i + 1}</span>
                  
                  <div className="flex flex-col flex-1">
                    {editingIdx === i ? (
                      <input
                        type="text"
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)}
                        onBlur={() => saveEdit(i)}
                        className="bg-transparent text-ink font-semibold border-b border-blue-500 focus:outline-none w-full"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Edit waypoint label"
                      />
                    ) : (
                      <span className="text-ink font-semibold truncate max-w-[120px] sm:max-w-[200px]">
                        {point.label || `Waypoint #${i + 1}`}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-ink-quaternary mt-0.5">
                      <span className="font-mono">{formatTime(point.timestamp)}</span>
                      {i > 0 && (
                        <span className="font-mono text-[10px] bg-surface rounded px-1 text-ink-tertiary">
                          +{formatDistance(haversine(trail[i - 1], point))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Actions */}
                <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIdx(i);
                      setEditLabel(point.label || `Waypoint #${i + 1}`);
                    }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-ink-tertiary hover:text-blue-500 transition-colors"
                    title="Edit Label"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePoint(i);
                    }}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-ink-tertiary hover:text-red-500 transition-colors"
                    title="Delete Waypoint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Leaflet CSS Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container { font-family: 'Inter', sans-serif; background: var(--color-surface); z-index: 1; }
        .custom-popup .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .custom-popup .leaflet-popup-tip { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .custom-popup .leaflet-popup-content { margin: 12px; }
      `}} />
    </div>
  );
};

export default LocationTracker;
