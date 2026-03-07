import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapPin, Wifi, Crosshair, Globe, Navigation, Locate, Copy, Map as MapIcon, Mountain, Layers, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle as LeafletCircle, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSharedPublicIP } from '../context/NetworkContext';
import { useBrowserGeolocation, useConnectionDetails } from '../hooks/useNetwork';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import WaveLoader from './WaveLoader';
import TooltipText from './TooltipText';
import { useCopy } from '../hooks/useCustom';
import { getCookie, setCookie } from '../utils/cookies';
import toast from 'react-hot-toast'; // Added toast import
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../lib/api';

const MAP_TYPES = [
  { id: 'roadmap', label: 'Default', icon: MapIcon, url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© OpenStreetMap' },
  { id: 'dark', label: 'Dark Mode', icon: Layers, url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 19, attribution: '© CARTO' }
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
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef(null);
  const selectedTheme = MAP_TYPES.find(t => t.id === mapType) || MAP_TYPES[0];
  const { copy } = useCopy();
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState([]);

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
        console.error('Failed to fetch active users:', err);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user?.sub]);

  // Factory for multiplayer avatars
  const getActiveUserIcon = useCallback((u) => {
    if (u.picture) {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transform: translateY(-4px) scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
            <div style="position: absolute; width: 100%; height: 100%; background: #0a84ff; border-radius: 50%; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #0a84ff, #8a2be2); box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
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
          <div style="position: absolute; width: 100%; height: 100%; background: #8a2be2; border-radius: 50%; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #8a2be2, #0a84ff); box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
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

  // IP-based location
  const ipLat = geoData?.latitude;
  const ipLng = geoData?.longitude;
  const hasIPLocation = ipLat != null && ipLng != null && ipLat !== 0 && ipLng !== 0;

  // GPS-based location
  const gpsLat = geo.position?.latitude;
  const gpsLng = geo.position?.longitude;
  const hasGPS = gpsLat != null && gpsLng != null;

  // Prefer GPS, fall back to IP
  const showingGPS = useGPS && hasGPS;
  const lat = showingGPS ? gpsLat : ipLat;
  const lng = showingGPS ? gpsLng : ipLng;
  const hasLocation = lat != null && lng != null && lat !== 0 && lng !== 0;
  const position = hasLocation ? [lat, lng] : null;
  const accuracy = showingGPS && geo.position?.accuracy ? geo.position.accuracy : 5000;

  const handleGPSToggle = () => {
    if (!useGPS) {
      geo.requestLocation();
      setUseGPS(true);
    } else {
      setUseGPS(false);
    }
  };

  const mapCenter = useMemo(() => (hasLocation ? [lat, lng] : [0, 0]), [hasLocation, lat, lng]);
  const mapZoom = showingGPS ? 18 : 14;

  // Create custom Blue Dot Icon with HTML
  const customDotMarker = useMemo(() => {
    // If the authenticated user has a profile picture, show their avatar pin
    if (user?.picture) {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translateY(-4px) scale(var(--map-icon-scale, 1)); transform-origin: bottom center; transition: transform 0.1s ease-out;">
            <div style="position: absolute; width: 100%; height: 100%; background: #30d158; border-radius: 50%; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
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


  const TableRow = ({ label, value }) => (
    <div className="py-2 sm:py-2.5 flex justify-between gap-3" style={{ borderBottom: '1px solid var(--row-border)' }}>
      <span className="text-ink-quaternary text-[11px] sm:text-[11px] whitespace-nowrap shrink-0">{label}</span>
      <span className="text-ink font-mono text-[11px] sm:text-xs text-right break-all">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-5 animate-rise-in">

      {/* ── Full-width Map Card ─────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-ink">Your Location</h2>
            {useGPS && hasGPS && (
              <Badge variant="success" dot>GPS Active</Badge>
            )}
            {useGPS && hasGPS && geo.position?.accuracy && (
              <span className="meta-text hidden sm:inline">±{Math.round(geo.position.accuracy)}m</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={useGPS && hasGPS ? 'success' : 'secondary'}
              size="sm"
              onClick={handleGPSToggle}
              className="gap-1.5"
            >
              <Locate className="w-3.5 h-3.5" />
              {geo.loading ? 'Finding…' : useGPS && hasGPS ? 'GPS On' : 'GPS Off'}
            </Button>
          </div>
        </div>

        {/* GPS denied banner */}
        {useGPS && geo.permissionStatus === 'denied' && (
          <div className="px-5 py-2 text-xs flex items-center gap-2" style={{ background: 'rgba(255,69,58,0.08)', color: '#ff453a' }}>
            ⚠ Location permission denied — enable in browser Site Permissions.
          </div>
        )}

        {/* Map — tall, full-width */}
        <div className="relative" style={{ height: '28rem' }}>
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
              <div 
                className="absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out"
                style={{ opacity: isMapReady ? 0 : 1, pointerEvents: isMapReady ? 'none' : 'auto' }}
              >
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-ink-secondary animate-pulse">Initializing Map Engine…</p>
              </div>

              {/* Full-bleed Map */}
              <div 
                className="absolute inset-0 z-0 transition-all duration-1000 ease-out"
                style={{ 
                  opacity: isMapReady ? 1 : 0, 
                  filter: isMapReady ? 'blur(0px)' : 'blur(8px)',
                  transform: isMapReady ? 'scale(1)' : 'scale(1.02)'
                }}
              >
                <MapContainer
                  ref={mapRef}
                  center={mapCenter}
                  zoom={mapZoom}
                  zoomControl={false} // Disable default zoom controls to match sleek UI
                  style={{ width: '100%', height: '100%' }}
                  whenReady={() => setTimeout(() => setIsMapReady(true), 400)}
                >
                <TileLayer
                  attribution={selectedTheme.attribution}
                  url={selectedTheme.url}
                  maxZoom={selectedTheme.maxZoom}
                />

                <MapController lat={lat} lng={lng} zoom={mapZoom} />

                <LeafletCircle
                  center={mapCenter}
                  radius={accuracy}
                  pathOptions={{
                    color: showingGPS ? '#30d158' : '#0a84ff',
                    weight: 1,
                    opacity: 0.3,
                    fillColor: showingGPS ? '#30d158' : '#0a84ff',
                    fillOpacity: 0.15,
                  }}
                  interactive={false}
                />

                <Marker position={mapCenter} icon={customDotMarker}>
                  <Popup className="custom-popup" closeButton={false}>
                    <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '160px', padding: '2px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '5px', color: '#1c1c1e' }}>
                        {showingGPS ? '📍 Exact Location' : '🌐 Approx. Location'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#636366', lineHeight: 1.8 }}>
                        {ip && !showingGPS && <div><b>IP:</b> {ip}</div>}
                        {showingGPS && geo.address ? (
                          <>
                            {geo.address.street && <div className="truncate"><b>Street:</b> {geo.address.street}</div>}
                            {geo.address.city && <div><b>City:</b> {geo.address.city}</div>}
                            {geo.address.postcode && <div><b>Postal:</b> {geo.address.postcode}</div>}
                          </>
                        ) : (
                          <>
                            {geoData?.city && <div><b>City:</b> {geoData.city}</div>}
                            {geoData?.region && <div><b>Region:</b> {geoData.region}</div>}
                            {geoData?.country && <div><b>Country:</b> {geoData.country}</div>}
                          </>
                        )}
                        {showingGPS && geo.position?.accuracy && (
                          <div><b>Accuracy:</b> ±{Math.round(geo.position.accuracy)}m</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Render other active users */}
                {activeUsers.map(u => (
                  <Marker 
                    key={u.userId}
                    position={[u.lastLocation.lat, u.lastLocation.lng]}
                    icon={getActiveUserIcon(u)}
                    zIndexOffset={100}
                  >
                    <Tooltip 
                      direction="top"
                      offset={[0, -20]}
                      opacity={1}
                      className="!bg-transparent !border-none !shadow-none !p-0 popup-override"
                    >
                      <div className="flex flex-col gap-0.5 px-3 py-2 min-w-[140px] rounded-xl shadow-2xl" style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                        <div className="font-bold text-sm tracking-tight text-ink">{u.name}</div>
                        <div className="text-[11px] font-medium text-ink-tertiary flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
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

              {/* Address pill — bottom-left */}
              {hasLocation && (
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium max-w-[55%]"
                  style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Crosshair className="w-3 h-3 shrink-0 opacity-60" />
                  <span className="truncate">
                    {showingGPS && geo.address
                      ? [geo.address.street, geo.address.city].filter(Boolean).join(', ')
                      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                  </span>
                  <button onClick={() => copy(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Re-center — Programmatically fly to coordinate when clicked */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (lat != null && lng != null && mapRef.current) {
                    mapRef.current.flyTo([lat, lng], mapZoom, { animate: true, duration: 1.5 });
                    toast('Auto-locked on position', { id: 'recenter' });
                  }
                }}
                title="Re-center"
                className="absolute bottom-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-xl shadow-2xl shadow-blue-500/40 border border-white/20"
              >
                <Locate className="w-5 h-5 text-white" />
              </button>

              {/* Map Type Toggle Dropdown (Floating Top-Right) */}
              <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
                <div className="relative group">
                  <button
                    onClick={() => setMapTypeOpen(!mapTypeOpen)}
                    onBlur={() => setTimeout(() => setMapTypeOpen(false), 200)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 text-white"
                  >
                    <selectedTheme.icon className="w-4 h-4 text-blue-400" />
                    <span>Map Type</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: mapTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>

                  {mapTypeOpen && (
                    <div
                      className="absolute top-full right-0 mt-2 p-1.5 rounded-2xl shadow-xl flex flex-col gap-1 min-w-[130px] animate-rise-in origin-top-right z-50 pointer-events-auto"
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
                              setCookie('nm_map_theme', id, 30); // Set cookie for map type
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
              </div>

              {/* Leaflet CSS Reset Overrides */}
              <style dangerouslySetInnerHTML={{__html: `
                .leaflet-container { font-family: 'Inter', sans-serif; background: var(--color-surface); z-index: 1; }
                .custom-popup .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
                .custom-popup .leaflet-popup-tip { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
                .custom-popup .leaflet-popup-content { margin: 12px; }
              `}} />
            </div>
          )}
        </div>
      </Card>

      {/* ── Two-column: Geo + Connection ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <Card className="p-5" style={{ borderRadius: '16px' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--icon-bg)' }}>
              <Globe className="w-4 h-4" style={{ color: '#ff453a' }} />
            </div>
            <h2 className="text-sm font-semibold text-ink">Geolocation &amp; ISP</h2>
          </div>
          {geoLoading ? (
            <WaveLoader text="Resolving…" />
          ) : geoError && !geoData ? (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,69,58,0.08)', color: '#ff453a' }}>{geoError}</div>
          ) : geoData ? (
            <div>
              {showingGPS && geo.address ? (
                <>
                  <TableRow label="Country" value={geo.address?.country || '—'} />
                  <TableRow label="State" value={geo.address?.state || '—'} />
                  <TableRow label="City" value={geo.address?.city || '—'} />
                  <TableRow label="Suburb" value={geo.address?.suburb || '—'} />
                  <TableRow label="Street" value={geo.address?.street || '—'} />
                  <TableRow label="Postcode" value={geo.address?.postcode || '—'} />
                  <TableRow label="Local Time" value={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                  <TableRow label="Coordinates" value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`} />
                  <TableRow label="Accuracy" value={`±${Math.round(geo.position.accuracy)}m`} />
                </>
              ) : (
                <>
                  <TableRow label="Country" value={geoData.country} />
                  <TableRow label="Region" value={geoData.region} />
                  <TableRow label="City" value={geoData.city} />
                  <TableRow label="Postal" value={geoData.postal} />
                  <TableRow label="Timezone" value={geoData.timezone} />
                  <TableRow label="Local Time" value={new Date().toLocaleTimeString('en-US', { timeZone: geoData.timezone !== '—' ? geoData.timezone : undefined, hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                  <TableRow label="ISP" value={geoData.isp} />
                  <TableRow label="ASN" value={geoData.asn} />
                  <TableRow label="Coordinates" value={geoData.coordinates} />
                  <TableRow label="Currency" value={geoData.currency} />
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-ink-quaternary py-4">
              <Globe className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No geolocation data</p>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Wifi className="w-4 h-4 text-blue-500" />
            </div>
            <h2 className="text-sm font-semibold text-ink">Connection Details</h2>
          </div>
          {connData ? (
            <div>
              <TableRow label="Type" value={connData.type} />
              <TableRow label="Effective" value={connData.effective} />
              <TableRow label="Downlink" value={connData.downlink} />
              <TableRow label="RTT" value={connData.rtt} />
              <TableRow label="Data Saver" value={connData.dataSaver} />
              <TableRow label="Online" value={connData.online} />
              <TableRow label="Protocol" value={connData.protocol} />
              <TableRow label="Port" value={connData.port} />
              <TableRow label="Host" value={connData.host} />
            </div>
          ) : (
            <WaveLoader text="Detecting connection…" />
          )}
        </Card>
      </div>
    </div>
  );
};

export default GeoAndConnection;
