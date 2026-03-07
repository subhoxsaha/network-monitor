import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import logger from '../lib/logger';
import { MapPinPlus, RefreshCw, Clock, Route, Layers, RotateCcw, Locate, Map as MapIcon, Mountain, ChevronDown, Edit2, Trash2, Check, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle as LeafletCircle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import Card from './Card';
import Badge from './Badge';
import { useAuth } from '../context/AuthContext';
import { useCopy } from '../hooks/useCustom';
import { useBrowserGeolocation } from '../hooks/useNetwork';
import { getCookie, setCookie } from '../utils/cookies';
import toast from 'react-hot-toast';
import { apiCall } from '../lib/api';
import { todayKey, getTrailFromStorage, generateWavyPath, pinColor, MapBoundsFitter } from '../utils/mapUtils';

// ── Constants ────────────────────────────────────────────
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

const MAP_TYPES = [
  { id: 'roadmap', label: 'Default', icon: MapIcon, url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© OpenStreetMap' },
  { id: 'dark', label: 'Dark Mode', icon: Layers, url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 19, attribution: '© CARTO' }
];

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India

const TRAIL_COLORS = [
  { id: 'neon-blue', label: 'Neon Blue', value: '#0a84ff', glow: 'rgba(10,132,255,0.4)' },
  { id: 'cyber-green', label: 'Cyber Green', value: '#30d158', glow: 'rgba(48,209,88,0.4)' },
  { id: 'hot-pink', label: 'Hot Pink', value: '#ff375f', glow: 'rgba(255,55,95,0.4)' },
  { id: 'amber', label: 'Solar Orange', value: '#ff9f0a', glow: 'rgba(255,159,10,0.4)' },
];

const TRAIL_TYPES = [
  { id: 'cyber-wave', label: 'Cyber Wave', complexity: 'smooth' },
  { id: 'turbulent-flow', label: 'Turbulent Flow', complexity: 'high' },
  { id: 'solid-vector', label: 'Solid Vector', complexity: 'none' },
];

// ── Helpers ──────────────────────────────────────────────
const saveTrailToStorage = (trail) => {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(trail));
  } catch (err) {
    logger.warn('Failed to persist trail data', err);
  }
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
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${parseFloat(lat)}&lon=${parseFloat(lng)}&zoom=18&addressdetails=1`);
    const data = await res.json();
    return data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.suburb || data?.address?.county || '';
  } catch (err) {
    logger.warn('Reverse geocode failed:', err);
    return '';
  }
};

// ── Main Component ──────────────────────────────────────
const LocationTracker = () => {
  const [trail, setTrail] = useState(() => getTrailFromStorage());
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState(getCookie('nm_map_theme') || 'roadmap');
  const [mapTypeOpen, setMapTypeOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [ghostPoint, setGhostPoint] = useState(null);
  
  // Trail Customization Settings
  const [trailColor, setTrailColor] = useState(getCookie('nm_trail_color') || 'neon-blue');
  const [trailHue, setTrailHue] = useState(parseInt(getCookie('nm_trail_hue')) || 210);
  const [trailThickness, setTrailThickness] = useState(parseFloat(getCookie('nm_trail_thickness')) || 4);
  const [trailType, setTrailType] = useState(getCookie('nm_trail_type') || 'cyber-wave');

  const activeColor = useMemo(() => {
    if (trailColor === 'custom') {
      const color = `hsl(${trailHue}, 100%, 50%)`;
      return { id: 'custom', value: color, glow: `hsla(${trailHue}, 100%, 50%, 0.4)` };
    }
    return TRAIL_COLORS.find(c => c.id === trailColor) || TRAIL_COLORS[0];
  }, [trailColor, trailHue]);
  const mapRef = useRef(null);
  const selectedTheme = MAP_TYPES.find(t => t.id === mapType) || MAP_TYPES[0];
  const { user } = useAuth();
  const { position: livePos, requestLocation, permissionStatus, heading: compassHeading } = useBrowserGeolocation(); // Auto-tracks live location
  const isExposed = getCookie('nm_expose_identity') === 'true';

  const totalDistance = useMemo(() => {
    let dist = 0;
    for (let i = 1; i < trail.length; i++) {
      dist += haversine(trail[i - 1], trail[i]);
    }
    return dist;
  }, [trail]);

  // Auto-request location and center map on first fix
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Map Follow Logic: Automatically fly to user position if livePos updates
  useEffect(() => {
    if (livePos && mapRef.current) {
      mapRef.current.setView([livePos.latitude, livePos.longitude], mapRef.current.getZoom());
    }
  }, [livePos]);

  // Wait for auth context to load

  // Load trail on mount
  const refreshData = useCallback(async (silent = false) => {
    if (!user?.sub) {
      return;
    }

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
  }, [user?.sub, user?.email, user?.name, user?.picture, trail]);

  // Load trail on mount
  useEffect(() => {
    refreshData(true);
  }, [user?.sub, refreshData]);

  // Persist to localStorage
  useEffect(() => { saveTrailToStorage(trail); }, [trail]);

  // Removed manual fitBounds and mapped to MapBoundsFitter component for declarative Leaflet syncing

  // Shared logic for adding a waypoint point
  const processPoint = useCallback(async (lat, lng, acc, alt) => {
    setLoading(true);
    try {
      const prevTrailLength = trail.length;
      const placeName = await reverseGeocode(lat, lng);
      
      const point = {
        lat,
        lng,
        accuracy: Math.round(acc || 0),
        altitude: alt ? Math.round(alt) : null,
        timestamp: Date.now(),
        label: `#${prevTrailLength + 1}_${placeName ? placeName.toUpperCase().replace(/\s+/g, '_') : 'LOCATION'}`,
      };

      // 1. Send to DB first
      if (user?.sub) {
        setCloudSyncing(true);
        const res = await apiCall('POST', user.sub, '/api/trails', { 
          point, 
          email: user.email,
          userName: isExposed ? user.name : undefined,
          userPicture: isExposed ? user.picture : undefined
        });
        setCloudSyncing(false);
        
        if (res.error) {
          toast.error(`Cloud sync failed: ${res.message}. Waypoint not added.`, { id: 'sync-error' });
          setLoading(false);
          return;
        }

        // 2. Only if DB succeeds, update local state
        setTrail((prev) => [...prev, point]);
        toast.success(placeName ? `At ${placeName}` : 'Waypoint marked!');
      } else {
        // Fallback for no auth (shouldn't happen with ProtectedRoute)
        setTrail((prev) => [...prev, point]);
        toast.success('Waypoint marked (local only)');
      }
    } catch (err) {
      logger.error('Waypoint marking failed:', err);
      toast.error('Failed to mark waypoint');
    } finally {
      setLoading(false);
    }
  }, [trail.length, user?.sub, user?.email, user?.name, user?.picture, isExposed]);

  // Mark current location
  const markLocation = useCallback(async () => {
    if (permissionStatus === 'prompt') requestLocation(); 
    
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not available');
      return;
    }

    if (livePos) {
      await processPoint(livePos.latitude, livePos.longitude, livePos.accuracy, livePos.altitude);
      return;
    }

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

  // Smart Recenter Logic
  const handleRecenter = useCallback(() => {
    requestLocation();
    
    if (!mapRef.current) return;

    if (trail.length > 0) {
      const bounds = L.latLngBounds(trail.map(p => [p.lat, p.lng]));
      if (livePos) {
        bounds.extend([livePos.latitude, livePos.longitude]);
      }
      mapRef.current.flyToBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5 });
      toast('Viewing Daily Trail', { id: 'recenter' });
    } else if (livePos) {
      mapRef.current.flyTo([livePos.latitude, livePos.longitude], 18, { animate: true, duration: 1.5 });
      toast('Centered on Live Location', { id: 'recenter' });
    } else {
      toast('Acquiring GPS signal...');
    }
    
    setSelectedIdx(null);
  }, [trail, livePos, requestLocation]);

  const exportMapAsImage = useCallback(async () => {
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) {
      toast.error('Map container not found');
      return;
    }

    const t = toast.loading('Capturing map viewport...');
    try {
      // Ensure all tiles are loaded before capture
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        scale: 2, // Higher quality
      });

      const link = document.createElement('a');
      link.download = `network-monitor-map-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Screenshot saved', { id: t });
    } catch (err) {
      logger.error('Export failed:', err);
      toast.error('Export failed. Map tiles might be CORS protected.', { id: t });
    }
  }, []);



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
  }, [selectedIdx, editingIdx, user?.sub, user?.email, user?.name, user?.picture]);

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
  }, [editLabel, user?.sub, user?.email, user?.name, user?.picture]);


  const mapCenter = trail.length > 0
    ? [trail[trail.length - 1].lat, trail[trail.length - 1].lng]
    : livePos 
      ? [livePos.latitude, livePos.longitude] 
      : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  const polylinePath = useMemo(() => {
    const basePoints = trail.map((p) => [p.lat, p.lng]);
    return generateWavyPath(basePoints, trailType);
  }, [trail, trailType]);

  // Factory for multiplayer avatars with stable pulse
  const getActiveUserIcon = useCallback((u) => {
    const ringColor = u.pulseColor || '#0a84ff';
    const glowColor = u.isLocalUser ? ringColor : '#8a2be2';
    
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transform: translateY(-4px) scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
          <div style="position: absolute; width: 100%; height: 100%; background: ${ringColor}; border-radius: 50%; opacity: 0.4;" class="animate-stable-pulse"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, ${ringColor}, ${glowColor}); box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
            <img src="${u.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name || 'User') + '&background=random&color=fff&size=128&bold=true'}" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; object-fit: cover;" />
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }, []);

  // Factory for dynamic waypoint markers
  const getWaypointIcon = useCallback((i) => {
    const color = pinColor(i);
    return L.divIcon({
      className: 'custom-leaflet-waypoint-marker',
      html: `
        <div style="width: 28px; height: 28px; transform: scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
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
    <div className="space-y-4 sm:space-y-6 animate-rise-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm border" style={{ background: 'var(--color-surface)', borderColor: 'var(--card-border)' }}>
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
              <div className="h-4 w-px bg-ink/10 mx-0.5" />
              <div className="flex flex-col">
                <h2 className="text-xs font-bold text-ink tracking-tight">Daily Trail</h2>
                <p className="text-[9px] text-ink-tertiary font-medium uppercase tracking-wider">Activity Log</p>
              </div>
            </div>

            {/* Cloud Sync Pulse Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 ${cloudSyncing ? 'border-blue-500/30 bg-blue-500/5 translate-y-0 opacity-100' : 'border-transparent opacity-60 translate-y-1'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cloudSyncing ? 'bg-blue-400 animate-pulse' : 'bg-ink-quaternary'}`} />
              <span className={`text-[10px] font-bold ${cloudSyncing ? 'text-blue-400' : 'text-ink-tertiary'}`}>
                {cloudSyncing ? 'Syncing...' : 'Synced'}
              </span>
            </div>
          </div>

          {/* Trail Stats Group */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 rounded-2xl border transition-all hover:bg-surface-light border-dashed sm:border-solid flex-1 sm:flex-none justify-between sm:justify-start" style={{ background: 'var(--color-surface)', borderColor: 'var(--card-border)' }}>
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-bold text-ink-tertiary uppercase tracking-tighter">Points</span>
                <span className="text-xs sm:text-sm font-black text-ink leading-tight">{trail.length}</span>
              </div>
              <div className="w-px h-5 sm:h-6 bg-ink/5" />
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-bold text-ink-tertiary uppercase tracking-tighter">Dist.</span>
                <span className="text-xs sm:text-sm font-black text-ink leading-tight">{formatDistance(totalDistance)}</span>
              </div>
              <div className="w-px h-5 sm:h-6 bg-ink/5" />
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-bold text-ink-tertiary uppercase tracking-tighter">Live</span>
                <span className="text-xs sm:text-sm font-black text-ink leading-tight">{trail.length > 0 ? formatTime(trail[trail.length - 1].timestamp).split(' ')[0] : '--:--'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => refreshData()}
              className="p-2 sm:p-2.5 rounded-2xl border hover:bg-surface-light transition-all active:scale-95 shadow-sm group bg-surface"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-ink-secondary group-hover:rotate-180 transition-transform duration-500 ${cloudSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

      {/* ── Immersive Map Card ── */}
      <Card className="p-0 overflow-hidden relative shadow-xl bg-surface h-[32rem] sm:h-[36rem] md:h-[40rem]" style={{ borderRadius: '32px' }}>
        
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
          className={`absolute inset-0 z-0 transition-all duration-1000 ease-out ${devMode ? 'dev-map-active scale-[0.99] ring-4 ring-blue-500/20 rounded-2xl' : ''} ${mapType === 'roadmap' ? 'map-light-theme' : 'map-dark-theme'}`}
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

            {polylinePath.length >= 2 && (
              <>
                {/* Layer 1: Deep Diffuse Glow */}
                <Polyline 
                  positions={polylinePath} 
                  pathOptions={{ 
                    color: activeColor.value, 
                    opacity: 0.1, 
                    weight: trailThickness * 2.5,
                    lineJoin: 'round',
                    lineCap: 'round',
                    className: 'map-glow-trail-deep'
                  }} 
                />
                {/* Layer 2: Medium Focused Glow */}
                <Polyline 
                  positions={polylinePath} 
                  pathOptions={{ 
                    color: activeColor.value, 
                    opacity: 0.22, 
                    weight: trailThickness * 1.2,
                    lineJoin: 'round',
                    lineCap: 'round',
                    className: 'map-glow-trail'
                  }} 
                />
                {/* Layer 3: Sharp Core Line */}
                <Polyline 
                  positions={polylinePath} 
                  pathOptions={{ 
                    color: activeColor.value, 
                    opacity: 0.9, 
                    weight: Math.max(0.8, trailThickness * 0.3),
                    lineJoin: 'round',
                    lineCap: 'round'
                  }} 
                />
              </>
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
            {livePos && user && (
              <>
                <Marker
                  position={[livePos.latitude, livePos.longitude]}
                  icon={getActiveUserIcon({
                    name: user.name,
                    picture: user.picture,
                    isLocalUser: true,
                    pulseColor: activeColor.value
                  })}
                  zIndexOffset={9999}
                >
                  <Popup className="custom-popup" closeButton={false}>
                    <div style={{ padding: '4px', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0a84ff', marginBottom: '4px', display: 'flex', items: 'center', gap: '6px' }}>
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Live Tracker
                      </div>
                      <div style={{ fontSize: '11px', color: '#636366', lineHeight: '1.6' }}>
                        <div className="flex justify-between gap-4"><b>Accuracy:</b> <span className="font-mono">±{Math.round(livePos.accuracy || 0)}m</span></div>
                        {livePos.altitude && <div className="flex justify-between gap-4"><b>Altitude:</b> <span className="font-mono">{Math.round(livePos.altitude)}m</span></div>}
                        <div className="flex justify-between gap-4"><b>Heading:</b> <span className="font-mono">{Math.round(compassHeading || 0)}°</span></div>
                        <div className="mt-1 pt-1 border-t border-zinc-100 text-[10px] text-zinc-400">
                          Last Signal: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                {livePos.accuracy && (
                  <LeafletCircle
                    center={[livePos.latitude, livePos.longitude]}
                    radius={livePos.accuracy}
                    pathOptions={{
                      fillColor: activeColor.value,
                      fillOpacity: 0.1,
                      color: activeColor.value,
                      opacity: 0.25,
                      weight: 1,
                    }}
                    interactive={false}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>


        {/* ── Floating Top Right (Controls & Actions) ── */}
        <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
          {/* Map Type Toggle Dropdown */}
          <div className="relative group">
            <button
              onClick={() => setMapTypeOpen(!mapTypeOpen)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              aria-label="Toggle map theme selector"
              aria-expanded={mapTypeOpen}
            >
              <selectedTheme.icon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-zinc-300" />
              <span>Settings</span>
              <ChevronDown className="w-2.5 sm:w-3 h-2.5 sm:h-3 transition-transform" style={{ transform: mapTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {mapTypeOpen && (
              <div
                className="absolute top-full right-0 mt-2 p-3 rounded-2xl shadow-xl flex flex-col gap-3 min-w-[200px] sm:min-w-[240px] animate-rise-in origin-top-right z-50"
                style={{ background: 'rgba(28,28,30,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {/* Map Type Section */}
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] uppercase font-bold text-zinc-500 px-3 py-1">Map Theme</p>
                  {MAP_TYPES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { 
                        if (mapType !== id) {
                          setIsMapReady(false);
                          setMapType(id);
                          setCookie('nm_map_theme', id, 30);
                          setTimeout(() => setIsMapReady(true), 600);
                        }
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold w-full transition-colors hover:bg-white/10"
                      style={{ color: mapType === id ? '#fff' : 'rgba(255,255,255,0.6)', background: mapType === id ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5" style={{ color: mapType === id ? activeColor.value : 'inherit' }} />
                        {label}
                      </div>
                      {mapType === id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeColor.value }} />}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 mx-1" />

                {/* Trail Style Section */}
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] uppercase font-bold text-zinc-500 px-3 py-1">Trail Style</p>
                  {TRAIL_TYPES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setTrailType(id);
                        setCookie('nm_trail_type', id, 30);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold w-full transition-colors hover:bg-white/10"
                      style={{ color: trailType === id ? '#fff' : 'rgba(255,255,255,0.6)', background: trailType === id ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                    >
                      {label}
                      {trailType === id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeColor.value }} />}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 mx-1" />

                {/* Trail Color Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5 px-3 py-1">
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Trail Appearance</p>
                    
                    {/* Hue Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] font-bold text-zinc-400">
                        <span>Spectrum</span>
                        <span>{trailHue}°</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="360"
                        value={trailHue}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTrailHue(val);
                          setTrailColor('custom');
                          setCookie('nm_trail_hue', val, 30);
                          setCookie('nm_trail_color', 'custom', 30);
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                        style={{ 
                          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' 
                        }}
                      />
                    </div>

                    {/* Thickness Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] font-bold text-zinc-400">
                        <span>Line Weight</span>
                        <span>{trailThickness}px</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={trailThickness}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTrailThickness(val);
                          setCookie('nm_trail_thickness', val, 30);
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 px-2 py-1">
                    {TRAIL_COLORS.map(({ id, value, label }) => (
                      <button
                        key={id}
                        onClick={() => {
                          setTrailColor(id);
                          setCookie('nm_trail_color', id, 30);
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${trailColor === id ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                        style={{ background: value }}
                        title={label}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/10 mx-1" />

                {/* Actions Section */}
                <div className="px-2 pt-1 pb-2">
                  <button
                    onClick={exportMapAsImage}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold border border-blue-500/30 transition-colors"
                  >
                    <MapIcon className="w-3 h-3" />
                    Snap Viewport
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            
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

        {/* ── Floating Bottom Right (Locate Me) ── */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRecenter();
          }}
          title="Recenter Map (Fit all waypoints)"
          className="absolute bottom-6 right-6 z-[1000] w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-xl shadow-[0_8px_32px_rgba(10,132,255,0.4)] border border-white/20"
          aria-label="Recenter map on your current location and waypoints"
        >
          <Locate className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
