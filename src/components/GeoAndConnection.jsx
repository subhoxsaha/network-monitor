import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import logger from '../lib/logger';
import { Shield, Globe, MapPin, Search, Crosshair, Map, Locate, Layers, Check, X, Copy, Wifi, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle as LeafletCircle, useMapEvents, Tooltip, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSharedPublicIP } from '../context/NetworkContext';
import { useBrowserGeolocation, useConnectionDetails } from '../hooks/useNetwork';
import Card from './Card';
import Badge from './Badge';
import WaveLoader from './WaveLoader';
import { useCopy } from '../hooks/useCustom';
import { getCookie, setCookie } from '../utils/cookies';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../lib/api';
import { getTrailFromStorage, generateWavyPath, pinColor, MapBoundsFitter } from '../utils/mapUtils';

const MAP_TYPES = [
  { id: 'roadmap', label: 'Default', icon: Map, url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© OpenStreetMap' },
  { id: 'dark', label: 'Dark Mode', icon: Layers, url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 19, attribution: '© CARTO' },
];

// Helper to control map behavior dynamically
const MapController = ({ lat, lng, zoom }) => {
  const map = useMapEvents({
    zoom: () => {
      const z = map.getZoom();
      // Calculate dynamic scale. Base zoom is 14.
      const scale = Math.max(0.4, Math.min(2.5, Math.pow(1.2, z - 14)));
      map.getContainer().style.setProperty('--map-icon-scale', scale);
    }
  });

  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
    // Set initial scale
    const z = map.getZoom();
    const scale = Math.max(0.4, Math.min(2.5, Math.pow(1.2, z - 14)));
    map.getContainer().style.setProperty('--map-icon-scale', scale);
  }, [lat, lng, zoom, map]);

  return null;
};

const GeoAndConnection = () => {
  const { geoData, ip, loading: geoLoading, error: geoError } = useSharedPublicIP();
  const geo = useBrowserGeolocation();
  const connData = useConnectionDetails();
  const [useGPS, setUseGPS] = useState(true);
  const [mapType, setMapType] = useState(getCookie('nm_map_theme') || 'roadmap');
  const [mapTypeOpen, setMapTypeOpen] = useState(false);
  const [isExposed, setIsExposed] = useState(getCookie('nm_expose_identity') === 'true');
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef(null);
  const selectedTheme = MAP_TYPES.find(t => t.id === mapType) || MAP_TYPES[0];
  const { copy } = useCopy();
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState([]);
  const [trail, setTrail] = useState(() => getTrailFromStorage());
  const [trailColor] = useState(getCookie('nm_trail_color') || 'neon-blue');
  const [trailHue] = useState(parseInt(getCookie('nm_trail_hue')) || 210);
  const [trailThickness] = useState(parseFloat(getCookie('nm_trail_thickness')) || 4);
  const [trailType] = useState(getCookie('nm_trail_type') || 'cyber-wave');

  const TRAIL_COLORS = [
    { id: 'neon-blue', label: 'Neon Blue', value: '#0a84ff', glow: 'rgba(10,132,255,0.4)' },
    { id: 'cyber-green', label: 'Cyber Green', value: '#30d158', glow: 'rgba(48,209,88,0.4)' },
    { id: 'hot-pink', label: 'Hot Pink', value: '#ff375f', glow: 'rgba(255,55,95,0.4)' },
    { id: 'amber', label: 'Solar Orange', value: '#ff9f0a', glow: 'rgba(255,159,10,0.4)' },
  ];

  const activeColor = useMemo(() => {
    if (trailColor === 'custom') {
      const color = `hsl(${trailHue}, 100%, 50%)`;
      return { id: 'custom', value: color, glow: `hsla(${trailHue}, 100%, 50%, 0.4)` };
    }
    return TRAIL_COLORS.find(c => c.id === trailColor) || TRAIL_COLORS[0];
  }, [trailColor, trailHue]);

  const polylinePath = useMemo(() => {
    const basePoints = trail.map((p) => [p.lat, p.lng]);
    return generateWavyPath(basePoints, trailType);
  }, [trail, trailType]);

  // Sync trail on mount
  useEffect(() => {
    const handleStorageChange = () => {
      setTrail(getTrailFromStorage());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Spatial Jitter (Spiderfy) to prevent identical coordinates from perfectly overlapping
  const applySpatialSpiderfy = useCallback((users) => {
    if (!users || users.length <= 1) return users;

    const grouped = {};
    const processed = [];

    // Group users by roughly 11 meter precision (4 decimal places)
    users.forEach(user => {
      const latKey = user.lastLocation?.lat.toFixed(4);
      const lngKey = user.lastLocation?.lng.toFixed(4);
      const key = `${latKey},${lngKey}`;
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(user);
    });

    // Apply radial spread for crowded locations
    Object.values(grouped).forEach(group => {
      if (group.length === 1) {
        processed.push(group[0]);
      } else {
        // Leave the first user at the exact center, orbit the rest
        processed.push(group[0]);
        
        const count = group.length - 1;
        // Radius rough estimation: 0.0001 lat/lng is ~11 meters. 
        // We'll spread them about ~15 meters out.
        const radius = 0.00015; 
        const angleStep = (Math.PI * 2) / count;

        for (let i = 1; i <= count; i++) {
          const user = { ...group[i] };
          const angle = i * angleStep;
          user.lastLocation = {
            ...user.lastLocation,
            lat: user.lastLocation.lat + Math.cos(angle) * radius,
            lng: user.lastLocation.lng + Math.sin(angle) * radius * 1.5 // Multiplier for visual aspect ratio
          };
          processed.push(user);
        }
      }
    });

    return processed;
  }, []);

  // GPS-based location
  const gpsLat = geo.position?.latitude;
  const gpsLng = geo.position?.longitude;
  const hasGPS = gpsLat != null && gpsLng != null;

  // Prefer GPS, fall back to IP
  const showingGPS = useGPS && hasGPS;
  const lat = showingGPS ? gpsLat : geoData?.latitude;
  const lng = showingGPS ? gpsLng : geoData?.longitude;
  const hasLocation = lat != null && lng != null && lat !== 0 && lng !== 0;

  // Fetch active users on interval
  useEffect(() => {
    if (!user?.sub) return;

    const fetchActiveUsers = async () => {
      try {
        const res = await apiCall('GET', user.sub, '/api/users/active');
        if (res?.activeUsers) {
          const processedUsers = applySpatialSpiderfy(res.activeUsers);
          setActiveUsers(processedUsers);
        }
      } catch (err) {
        logger.error('Failed to fetch active users:', err);
      }
    };

    fetchActiveUsers();
    // Re-run immediately if local location changes so self-avatar updates
    const interval = setInterval(fetchActiveUsers, 10000); 
    return () => clearInterval(interval);
  }, [user, lat, lng, hasLocation, useGPS, applySpatialSpiderfy]);

  // Consistent random name generator for fallback
  const fallbackName = useMemo(() => {
    if (!user?.sub) return 'Anonymous User';
    const seed = user.sub;
    const ADJECTIVES = ['Swift', 'Stellar', 'Quantum', 'Neon', 'Silent', 'Dynamic', 'Azure', 'Crimson', 'Golden', 'Silver', 'Mystic', 'Solar', 'Lunar', 'Cosmic', 'Void', 'Radiant', 'Emerald', 'Shadow', 'Ghost', 'Nova', 'Cyborg', 'Hidden', 'Primal', 'Cyber'];
    const NOUNS = ['Nomad', 'Falcon', 'Voyager', 'Phantom', 'Nexus', 'Pulse', 'Drifter', 'Wraith', 'Specter', 'Titan', 'Ghost', 'Sentinel', 'Pilot', 'Rider', 'Hacker', 'Oracle', 'Vector', 'Cipher', 'Spark', 'Flare', 'Shadow', 'Siren', 'Apex', 'Zenith'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const absHash = Math.abs(hash);
    return `${ADJECTIVES[absHash % ADJECTIVES.length]} ${NOUNS[Math.floor(absHash / ADJECTIVES.length) % NOUNS.length]}`;
  }, [user?.sub]);

  // Factory for multiplayer avatars
  const getActiveUserIcon = useCallback((u) => {
    // Local user gets a distinct border color to stand out from others
    const ringColor = u.pulseColor || (u.isLocalUser ? '#30d158' : '#0a84ff');
    const glowColor = u.pulseColor || (u.isLocalUser ? '#30d158' : '#8a2be2');

    if (u.picture) {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transform: translateY(-4px) scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
            <div style="position: absolute; width: 100%; height: 100%; background: ${ringColor}; border-radius: 50%; opacity: 0.4;" class="animate-stable-pulse"></div>
            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, ${ringColor}, ${glowColor}); box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
              <img src="${u.picture}" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; object-fit: cover;" />
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
    }
    
    
    // Dynamic Fallback Avatar (Initials) using ui-avatars
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=random&color=fff&size=128&bold=true`;
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transform: translateY(-4px) scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
          <div style="position: absolute; width: 100%; height: 100%; background: ${glowColor}; border-radius: 50%; opacity: 0.4;" class="animate-stable-pulse"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, ${glowColor}, ${ringColor}); box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
            <img src="${fallbackUrl}" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; object-fit: cover;" />
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);

  // Auto-request GPS on mount
  useEffect(() => {
    geo.requestLocation();
  }, []);

  // Auto-switch to GPS when coordinates arrive
  useEffect(() => {
    if (geo.position?.latitude != null) {
      setUseGPS(true);
    }
  }, [geo.position]);

  const accuracy = showingGPS && geo.position?.accuracy ? geo.position.accuracy : 5000;

  const mapCenter = useMemo(() => (hasLocation ? [lat, lng] : [0, 0]), [hasLocation, lat, lng]);
  const mapZoom = showingGPS ? 18 : 14;

  const forceRequestGPS = useCallback(() => {
    toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          // Force a fresh request by bypassing cache and asking for high accuracy
          if (!navigator.geolocation) return reject('No Hardware');
          
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              geo.requestLocation(); // Trigger hook update
              setUseGPS(true);
              resolve(pos);
            },
            (err) => {
              toast.error(err.message === "User denied Geolocation" ? "Permission Denied. Please enable it in browser settings." : err.message);
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        } catch (e) { reject(e); }
      }),
      {
        loading: 'Forcing GPS Link...',
        success: 'Hardware Sync Successful',
        error: 'Hardware Link Failed'
      }
    );
  }, [geo]);

  // Background Ping Logic - If exposed, heartbeat our location to the network
  useEffect(() => {
    if (!isExposed || !hasLocation || !user?.sub) return;

    const pingLocation = async () => {
      try {
        await apiCall('PUT', user.sub, '/api/users/ping', {
          point: { lat, lng, timestamp: Date.now() },
          userName: user.name,
          userPicture: user.picture,
          email: user.email
        });
      } catch (err) {
        logger.warn('[Network Ping] Heartbeat failed:', err);
      }
    };

    pingLocation();
    const interval = setInterval(pingLocation, 15000); // 15s heartbeat
    return () => clearInterval(interval);
  }, [isExposed, hasLocation, lat, lng, user]);

  // Create custom Blue Dot Icon with HTML
  const customDotMarker = useMemo(() => {
    // If the authenticated user has a profile picture, show their avatar pin
    if (user?.picture) {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translateY(-4px) scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
            <div style="position: absolute; width: 100%; height: 100%; background: #30d158; border-radius: 50%; opacity: 0.3;" class="animate-stable-pulse"></div>
            <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #30d158, #0a84ff); box-shadow: 0 4px 16px rgba(0,0,0,0.4); z-index: 10; display: flex; align-items: center; justify-content: center;">
              <img src="${user.picture}" style="width: 100%; height: 100%; border-radius: 50%; border: 2.5px solid white; object-fit: cover;" />
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });
    }

    // Fallback Circle
    const geoStatus = geo.permissionStatus; 
    const isGPSActive = showingGPS && geoStatus === 'granted';
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="width: 16px; height: 16px; background-color: ${isGPSActive ? '#30d158' : '#0a84ff'}; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transform: scale(var(--map-icon-scale, 1)); transform-origin: center center; transition: transform 0.1s ease-out;">
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }, [showingGPS, geo.permissionStatus, user?.picture]);

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


  const TableRow = ({ label, value }) => (
    <div className="py-2 sm:py-2.5 flex justify-between gap-3" style={{ borderBottom: '1px solid var(--row-border)' }}>
      <span className="text-ink-quaternary text-[11px] sm:text-[11px] whitespace-nowrap shrink-0">{label}</span>
      <span className="text-ink font-mono text-[11px] sm:text-xs text-right break-all">{value || '—'}</span>
    </div>
  );

  return (
    <>
      <div className="section-label flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5" />
        Live Network Map
      </div>

      <div className="mb-6 px-1">
        <p className="text-sm text-ink-secondary leading-relaxed max-w-2xl">
          Real-time geospatial intelligence. This interactive map displays your current connectivity status and synchronizes your location with other active users in the network. Enable GPS for high-precision tracking or "Expose Identity" to share your profile with others.
        </p>
      </div>

      <Card className="p-0 overflow-hidden relative shadow-2xl bg-surface border-white/5 flex flex-col h-[38rem] sm:h-[42rem] md:h-[46rem]" style={{ borderRadius: '32px' }}>
        {/* GPS Status Indicator — Top-Left */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg pointer-events-auto" style={{ background: 'rgba(28,28,30,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className={`w-1.5 h-1.5 rounded-full ${geo.permissionStatus === 'granted' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className={`text-[10px] font-bold ${geo.permissionStatus === 'granted' ? 'text-green-500' : 'text-zinc-400'}`}>
              {geo.permissionStatus === 'granted' ? 'GPS Active' : 'GPS Inactive'}
            </span>
          </div>
        </div>

        {/* Map Type Mode Selection — Top-Right */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
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
                        setMapType(id);
                        setCookie('nm_map_theme', id, 30);
                        toast.success(`${label} mode`, { id: 'map-mode' });
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
        </div>

        {/* Map Container - Flex 1 */}
        <div className="relative flex-1">
          {geoLoading && !hasLocation ? (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
              <WaveLoader text="Locating via network…" />
            </div>
          ) : !hasLocation ? (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
              <div className="text-center text-ink-quaternary">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{geoError || 'Could not determine location'}</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-surface">
              {/* Loading Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out"
                   style={{ opacity: isMapReady ? 0 : 1, pointerEvents: isMapReady ? 'none' : 'auto', background: 'var(--color-surface)' }}>
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-ink-secondary animate-pulse">Initializing Map Engine…</p>
              </div>

              <div className="absolute inset-0 z-0 transition-all duration-1000 ease-out"
                   style={{ opacity: isMapReady ? 1 : 0, filter: isMapReady ? 'blur(0px)' : 'blur(8px)', transform: isMapReady ? 'scale(1)' : 'scale(1.02)' }}>
                <MapContainer
                  ref={mapRef}
                  center={mapCenter}
                  zoom={mapZoom}
                  zoomControl={false}
                  style={{ width: '100%', height: '100%' }}
                  whenReady={() => setTimeout(() => setIsMapReady(true), 400)}
                >
                  <TileLayer attribution={selectedTheme.attribution} url={selectedTheme.url} maxZoom={selectedTheme.maxZoom} />
                  <MapController lat={lat} lng={lng} zoom={mapZoom} />
                  <MapBoundsFitter trail={trail} livePos={geo.position} />

                  {polylinePath.length >= 2 && (
                    <>
                      <Polyline positions={polylinePath} pathOptions={{ color: activeColor.value, opacity: 0.1, weight: trailThickness * 2.5, lineJoin: 'round', lineCap: 'round', className: 'map-glow-trail-deep' }} />
                      <Polyline positions={polylinePath} pathOptions={{ color: activeColor.value, opacity: 0.22, weight: trailThickness * 1.2, lineJoin: 'round', lineCap: 'round', className: 'map-glow-trail' }} />
                      <Polyline positions={polylinePath} pathOptions={{ color: activeColor.value, opacity: 0.9, weight: Math.max(0.8, trailThickness * 0.3), lineJoin: 'round', lineCap: 'round' }} />
                    </>
                  )}

                  {trail.map((p, i) => (
                    <Marker
                      key={p.timestamp}
                      position={[p.lat, p.lng]}
                      icon={getWaypointIcon(i)}
                      zIndexOffset={i * 10}
                    >
                      <Popup className="custom-popup" closeButton={false}>
                        <div style={{ padding: '4px', fontFamily: 'Inter, sans-serif' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#1c1c1e', marginBottom: '4px' }}>
                            {p.label || `Waypoint #${i + 1}`}
                          </div>
                          <div style={{ fontSize: '12px', color: '#636366' }}>
                            <b>Time:</b> {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<br />
                            <b>Coordinates:</b><br /> {p.lat.toFixed(5)}, {p.lng.toFixed(5)}<br />
                            <b>Accuracy:</b> ±{p.accuracy}m
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {hasLocation && user && (
                    <Marker 
                      position={mapCenter} 
                      icon={getActiveUserIcon({
                        name: user.name,
                        picture: user.picture,
                        isLocalUser: true,
                        pulseColor: activeColor.value
                      })}
                      zIndexOffset={9999}
                    >
                      <Popup className="custom-popup" closeButton={false}>
                        <div style={{ padding: '4px', fontFamily: 'Inter, sans-serif', minWidth: '160px' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: activeColor.value, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeColor.value }} />
                            Live Tracker
                          </div>
                          <div style={{ fontSize: '11px', color: '#636366', lineHeight: 1.8 }}>
                            {ip && !showingGPS && <div className="flex justify-between gap-4"><b>IP:</b> {ip}</div>}
                            {showingGPS && geo.address ? (
                              <>
                                {geo.address.street && <div className="truncate text-right flex-1"><b>Street:</b><br/> {geo.address.street}</div>}
                                {geo.address.city && <div className="flex justify-between gap-4"><b>City:</b> {geo.address.city}</div>}
                                {geo.address.postcode && <div className="flex justify-between gap-4"><b>Postal:</b> {geo.address.postcode}</div>}
                              </>
                            ) : (
                              <>
                                {geoData?.city && <div className="flex justify-between gap-4"><b>City:</b> {geoData.city}</div>}
                                {geoData?.region && <div className="flex justify-between gap-4"><b>Region:</b> {geoData.region}</div>}
                                {geoData?.country && <div className="flex justify-between gap-4"><b>Country:</b> {geoData.country}</div>}
                              </>
                            )}
                            {showingGPS && geo.position?.accuracy && (<div className="flex justify-between gap-4"><b>Accuracy:</b> <span className="font-mono">±{Math.round(geo.position.accuracy)}m</span></div>)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {activeUsers.map(u => (
                    <Marker key={u.userId} position={[u.lastLocation.lat, u.lastLocation.lng]} icon={getActiveUserIcon(u)} zIndexOffset={100}>
                      <Tooltip direction="top" offset={[0, -20]} opacity={1} className="!bg-transparent !border-none !shadow-none !p-0 popup-override">
                        <div className="flex flex-col gap-0.5 px-3 py-2 min-w-[140px] rounded-xl shadow-2xl" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                          <div className="font-bold text-sm tracking-tight text-ink">{u.name}</div>
                          <div className="text-[11px] font-medium text-ink-tertiary flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-stable-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Active {new Date(u.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Enhanced Copy Panel — Bottom-Left */}
              {hasLocation && (
                <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
                  {/* Official Address Copy */}
                  <div 
                    onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                    className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl text-[10px] font-bold group shadow-2xl transition-all border border-white/10 text-left cursor-pointer ${isAddressExpanded ? 'max-w-[280px]' : 'max-w-[200px]'}`}
                    style={{ background: 'rgba(28,28,30,0.9)', color: 'white', backdropFilter: 'blur(20px)' }}
                  >
                    <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors ${isAddressExpanded ? 'text-green-400' : 'text-blue-400'}`} />
                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                      <span className={isAddressExpanded ? 'whitespace-normal' : 'truncate'}>
                        {showingGPS && geo.address ? (
                          isAddressExpanded ? [
                            geo.address.road || geo.address.pedestrian,
                            geo.address.suburb || geo.address.neighbourhood,
                            geo.address.city || geo.address.town || geo.address.village,
                            geo.address.state,
                            geo.address.postcode,
                            geo.address.country
                          ].filter(Boolean).join(', ') : [geo.address.road || geo.address.pedestrian, geo.address.city || geo.address.town || geo.address.village].filter(Boolean).join(', ')
                        ) : 'Official Address'}
                      </span>
                      {isAddressExpanded && (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const addr = geo.address;
                              const full = [
                                addr.road || addr.pedestrian,
                                addr.suburb || addr.neighbourhood,
                                addr.city || addr.town || addr.village,
                                addr.state,
                                addr.postcode,
                                addr.country
                              ].filter(Boolean).join(', ');
                              copy(full);
                              toast.success('Official Address copied');
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            Copy
                          </button>
                          <span className="text-zinc-500 text-[9px]">Click to collapse</span>
                        </div>
                      )}
                    </div>
                    {!isAddressExpanded && <Copy className="w-3 h-3 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Copy short address if clicked directly on icon
                        const addr = geo.address;
                        const short = [addr.road || addr.pedestrian, addr.city || addr.town || addr.village].filter(Boolean).join(', ');
                        copy(short);
                        toast.success('Address copied');
                      }}
                    />}
                  </div>

                  {/* Coordinate Copy */}
                  <button 
                    onClick={() => {
                      const coordString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                      copy(coordString);
                      toast.success('Coordinates copied');
                    }}
                    className="w-fit flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold group shadow-2xl transition-all hover:scale-105 active:scale-95 border border-white/5"
                    style={{ background: 'rgba(44,44,46,0.7)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)' }}
                  >
                    <span className="opacity-80">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                    <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}

              {/* Floating Re-center Button — Bottom-Right */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  geo.requestLocation();
                  setUseGPS(true);
                  if (lat != null && lng != null && mapRef.current) {
                    mapRef.current.flyTo([lat, lng], mapZoom, { animate: true, duration: 1.5 });
                    toast('Synced to current position', { id: 'recenter' });
                  }
                }}
                className="absolute bottom-4 right-4 z-[1000] w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 bg-blue-600/90 hover:bg-blue-500 shadow-[0_8px_32px_rgba(10,132,255,0.4)] border border-white/20 group backdrop-blur-xl"
              >
                <Locate className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Action Bar — Bottom of Card */}
        <div className="p-4 bg-surface border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={forceRequestGPS}
            className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg group active:scale-[0.98]"
          >
            <Wifi className="w-5 h-5" />
            <div className="text-left">
              <div className="text-[8px] uppercase tracking-widest opacity-60">System Link</div>
              <div className="text-sm">Connect GPS</div>
            </div>
          </button>

          <button
            onClick={() => {
              const newState = !isExposed;
              setIsExposed(newState);
              setCookie('nm_expose_identity', newState, 30);
              toast.success(newState ? 'Identity broadcast active' : 'Identity broadcast stopped', { icon: newState ? '📡' : '🛡️' });
            }}
            className={`flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border transition-all shadow-md group active:scale-[0.98] relative overflow-hidden ${isExposed ? 'bg-purple-600/10 border-purple-500/50 text-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'bg-white/5 border-white/10 text-ink'}`}
          >
            <Shield className={`w-5 h-5 ${isExposed ? 'text-purple-500' : 'text-ink-tertiary'}`} />
            <div className="text-left">
              <div className="text-[8px] uppercase tracking-widest opacity-40">{isExposed ? 'Broadcasting' : 'Privacy'}</div>
              <div className="text-sm">{isExposed ? 'Hide Identity' : 'Expose Identity'}</div>
            </div>
            {isExposed && <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />}
          </button>
        </div>
      </Card>

      {/* Connection Info Matrix — Unified Card */}
      <Card className="p-0 mt-6 sm:mt-8 mb-8 overflow-hidden bg-surface border-white/5 shadow-2xl" style={{ borderRadius: '10px' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
          {/* Section 1: Network Node */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 rounded">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-ink">Network Node</h3>
            </div>
            <div className="space-y-1">
              <TableRow label="Public IPv4" value={ip} />
              <TableRow label="ISP Provider" value={geoData?.org} />
              <TableRow label="ASN Network" value={geoData?.asn} />
            </div>
          </div>

          {/* Section 2: Geospatial Data */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-ink">Geospatial Data</h3>
            </div>
            <div className="space-y-1">
              <TableRow label="City/Region" value={`${geoData?.city || '—'}, ${geoData?.region || '—'}`} />
              <TableRow label="Country Code" value={geoData?.country} />
              <TableRow label="Timezone" value={geoData?.timezone} />
            </div>
          </div>

          {/* Section 3: Hardware Detail */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-ink">Hardware Detail</h3>
            </div>
            <div className="space-y-1">
              <TableRow label="Latitude" value={lat?.toFixed(6)} />
              <TableRow label="Longitude" value={lng?.toFixed(6)} />
              <TableRow label="Precision" value={geo.position?.accuracy ? `±${Math.round(geo.position.accuracy)}m` : 'Network'} />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};

export default GeoAndConnection;
