import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Crosshair, Globe, Navigation, Locate, Copy } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSharedPublicIP } from '../context/NetworkContext';
import { useBrowserGeolocation, useConnectionDetails } from '../hooks/useNetwork';
import Card from './Card';
import WaveLoader from './WaveLoader';
import TooltipText from './TooltipText';
import { useCopy } from '../hooks/useCustom';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;

// Apple-blue pulsing dot marker
const pulsingIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    position: relative;
    width: 14px; height: 14px;
    background: #0a84ff;
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--color-surface), 0 0 10px rgba(10,132,255,0.8);
  ">
    <div style="
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      border-radius: 50%; background: #0a84ff;
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    "></div>
  </div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// Green GPS marker
const gpsIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    position: relative;
    width: 16px; height: 16px;
    background: #30d158;
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--color-surface), 0 0 12px rgba(48,209,88,0.9);
  ">
    <div style="
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      border-radius: 50%; background: #30d158;
      animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    "></div>
  </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const FlyTo = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom || 13, { duration: 1.5 });
  }, [position, zoom, map]);
  return null;
};

const GeoAndConnection = () => {
  const { geoData, ip, loading: geoLoading, error: geoError } = useSharedPublicIP();
  const geo = useBrowserGeolocation();
  const connData = useConnectionDetails();
  const [useGPS, setUseGPS] = useState(true); // default to GPS
  const { copy } = useCopy();

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

  const TableRow = ({ label, value }) => (
    <div className="py-2.5 flex justify-between gap-4" style={{ borderBottom: '1px solid var(--row-border)' }}>
      <span className="text-ink-tertiary text-[10px] sm:text-xs whitespace-nowrap">{label}</span>
      <span className="text-ink font-mono text-xs sm:text-sm text-right break-all">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Map + Geo row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map — takes 3 columns */}
        <Card className="p-0 overflow-hidden lg:col-span-3">
          <div className="px-5 py-3.5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5" style={{ color: '#0a84ff' }} />
              <h2 className="text-lg font-semibold text-ink">Your Location</h2>
              <span className="text-[10px] sm:text-xs text-ink-quaternary ml-1">
                {useGPS && hasGPS ? '📍 GPS' : '≈ IP-based'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGPSToggle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: useGPS && hasGPS ? 'rgba(48,209,88,0.15)' : 'var(--icon-bg)',
                  color: useGPS && hasGPS ? '#30d158' : 'var(--color-ink-secondary)',
                  border: `1px solid ${useGPS && hasGPS ? 'rgba(48,209,88,0.3)' : 'var(--icon-border)'}`,
                }}
              >
                <Locate className="w-3.5 h-3.5" />
                {geo.loading ? 'Getting GPS…' : useGPS && hasGPS ? 'GPS Active' : 'Use Precise GPS'}
              </button>
            </div>
          </div>

          {/* GPS permission states */}
          {useGPS && geo.permissionStatus === 'denied' && (
            <div className="px-5 py-2.5 text-xs flex items-center gap-2" style={{ background: 'rgba(255,69,58,0.08)', color: '#ff453a' }}>
              <span>⚠</span> Location permission denied. Enable it in browser settings → Site Permissions → Location.
            </div>
          )}

          {useGPS && hasGPS && geo.position?.accuracy && (
            <div className="px-5 py-2 text-xs text-ink-quaternary flex items-center gap-2" style={{ background: 'var(--color-surface-light)' }}>
              <Navigation className="w-3 h-3" style={{ color: '#30d158' }} />
              GPS accuracy: ±{Math.round(geo.position.accuracy)}m
              {geo.position.altitude != null && ` · Alt: ${Math.round(geo.position.altitude)}m`}
            </div>
          )}

          <div className="relative h-64 sm:h-80">
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
              <>
                {/* Sleek vignette overlay so the map blends into the dark card edges */}
                <div 
                  className="absolute inset-0 pointer-events-none z-[1000]" 
                  style={{
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), inset 0 0 10px rgba(0,0,0,0.8)',
                    borderBottom: '1px solid var(--card-border)'
                  }} 
                />
                <MapContainer
                  center={position}
                  zoom={useGPS && hasGPS ? 18 : 13}
                  maxZoom={19}
                  style={{ height: '100%', width: '100%', filter: 'var(--map-filter, none)' }}
                  zoomControl={true}
                  className="leaflet-dark"
                >
                  <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    maxZoom={19}
                  />
                  <FlyTo position={position} zoom={useGPS && hasGPS ? 18 : 13} />
                  <Marker position={position} icon={useGPS && hasGPS ? gpsIcon : pulsingIcon}>
                      <Popup>
                      <div style={{ color: '#1c1c1e', fontFamily: 'Inter, sans-serif', minWidth: '170px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                          {useGPS && hasGPS ? '📍 Exact GPS Location' : '🌐 Approximate Location'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#636366', lineHeight: 1.7 }}>
                          {ip && !showingGPS && <div><b>IP:</b> {ip}</div>}
                          
                          {/* If showing GPS, show reverse geocoded address */}
                          {showingGPS && geo.address ? (
                            <>
                              {geo.address.street && <div><b>Street:</b> {geo.address.street}</div>}
                              {geo.address.suburb && <div><b>Suburb:</b> {geo.address.suburb}</div>}
                              {geo.address.city && <div><b>City:</b> {geo.address.city}</div>}
                              {geo.address.postcode && <div><b>Postcode:</b> {geo.address.postcode}</div>}
                            </>
                          ) : (
                            /* Otherwise show IP-based geoData */
                            <>
                              {geoData?.city && geoData.city !== '—' && <div><b>City:</b> {geoData.city}</div>}
                              {geoData?.region && geoData.region !== '—' && <div><b>Region:</b> {geoData.region}</div>}
                              {geoData?.country && geoData.country !== '—' && <div><b>Country:</b> {geoData.country}</div>}
                            </>
                          )}
                          
                          {useGPS && hasGPS && geo.position?.accuracy && (
                            <div><b>Accuracy:</b> ±{Math.round(geo.position.accuracy)}m</div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  {/* Approximate range circle */}
                  <Circle
                    center={position}
                    radius={accuracy}
                    pathOptions={{
                      color: useGPS && hasGPS ? '#30d158' : '#0a84ff',
                      fillColor: useGPS && hasGPS ? '#30d158' : '#0a84ff',
                      fillOpacity: 0.08,
                      weight: 1.5,
                      opacity: 0.3,
                      dashArray: useGPS && hasGPS ? '2 4' : '6 4',
                    }}
                  />
                </MapContainer>
              </>
            )}
          </div>

          {/* Location summary bar */}
          {hasLocation && (
            <div className="px-5 py-2.5 flex items-center gap-5 text-xs text-ink-tertiary flex-wrap" style={{ borderTop: '1px solid var(--card-border)', background: 'var(--glow-color)' }}>
              {showingGPS && geo.address ? (
                <>
                  {geo.address.street && <span>{geo.address.street}</span>}
                  {geo.address.suburb && <><span className="text-ink-quaternary">·</span><span>{geo.address.suburb}</span></>}
                  {geo.address.city && <><span className="text-ink-quaternary">·</span><span>{geo.address.city}</span></>}
                  <div className="ml-auto flex items-center gap-1.5 text-ink-quaternary font-mono">
                    <Crosshair className="w-3 h-3 opacity-50" />
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                    <button 
                      onClick={() => copy(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)}
                      className="p-1.5 ml-1 hover:bg-surface hover:text-ink rounded transition-colors active:bg-surface-light"
                      title="Copy Coordinates"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {geoData?.city && geoData.city !== '—' && <span>{geoData.city}</span>}
                  {geoData?.region && geoData.region !== '—' && <><span className="text-ink-quaternary">·</span><span>{geoData.region}</span></>}
                  {geoData?.country && geoData.country !== '—' && <><span className="text-ink-quaternary">·</span><span>{geoData.country}</span></>}
                  <div className="ml-auto flex items-center gap-1.5 text-ink-quaternary font-mono">
                    <Crosshair className="w-3 h-3 opacity-50" />
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                    <button 
                      onClick={() => copy(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)}
                      className="p-1.5 ml-1 hover:bg-surface hover:text-ink rounded transition-colors active:bg-surface-light"
                      title="Copy Coordinates"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Geo details — takes 2 columns */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--icon-bg)' }}>
              <MapPin className="w-4 h-4" style={{ color: '#ff453a' }} />
            </div>
            <h2 className="text-base font-semibold text-ink">Geolocation &amp; ISP</h2>
          </div>
          {geoLoading ? (
            <WaveLoader text="Resolving location…" />
          ) : geoError && !geoData ? (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,69,58,0.08)', color: '#ff453a' }}>{geoError}</div>
          ) : geoData ? (
            <div className="space-y-0">
              {showingGPS && geo.address ? (
                <>
                  <TableRow label="Country" value={geo.address.country} />
                  <TableRow label="State/Region" value={geo.address.state} />
                  <TableRow label="City/Town" value={geo.address.city} />
                  <TableRow label="Suburb" value={geo.address.suburb} />
                  <TableRow label="Street" value={geo.address.street} />
                  <TableRow label="Postal" value={geo.address.postcode} />
                  <TableRow label="Coordinates" value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`} />
                  <TableRow label="Accuracy" value={`±${Math.round(geo.position.accuracy)} meters`} />
                  <TableRow label="Altitude" value={geo.position.altitude ? `${Math.round(geo.position.altitude)}m` : '—'} />
                </>
              ) : (
                <>
                  <TableRow label="Country" value={geoData.country} />
                  <TableRow label="Region" value={geoData.region} />
                  <TableRow label="City" value={geoData.city} />
                  <TableRow label="Postal" value={geoData.postal} />
                  <TableRow label="Timezone" value={geoData.timezone} />
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
      </div>

      {/* Connection details — full width */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-lg" style={{ background: 'var(--icon-bg)' }}>
            <Wifi className="w-4 h-4" style={{ color: '#64d2ff' }} />
          </div>
          <h2 className="text-base font-semibold text-ink">Connection Details</h2>
        </div>
        {connData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
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
  );
};

export default GeoAndConnection;
