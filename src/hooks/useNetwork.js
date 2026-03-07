// Network API hooks
import { useState, useCallback, useRef, useEffect } from 'react';
import logger from '../lib/logger';

// Browser Geolocation API — requests user permission for precise GPS
export const useBrowserGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [heading, setHeading] = useState(0); // Stable compass heading

  // Store last geocoded point to avoid redundant fetches
  const lastGeocodedRef = useRef({ lat: 0, lng: 0 });
  const lastOrientationUpdateRef = useRef(0);
  const watchIdRef = useRef(null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation API not supported');
      return;
    }
    setLoading(true);
    setError(null);

    const handleSuccess = (pos) => {
      const newPos = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        // Mobile phones supply very high accuracy GPS reading (e.g. 4 meters) when enableHighAccuracy is true
        accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy ? Math.round(pos.coords.altitudeAccuracy) : null,
        heading: pos.coords.heading, // Natural GPS heading (only when moving)
        speed: pos.coords.speed,
        timestamp: new Date(pos.timestamp).toLocaleTimeString(),
      };
      setPosition(newPos);
      setPermissionStatus('granted');
      setLoading(false);

      // Reverse Geocode - Only if user has moved significantly (> 10m approx)
      const latDiff = Math.abs(newPos.latitude - lastGeocodedRef.current.lat);
      const lngDiff = Math.abs(newPos.longitude - lastGeocodedRef.current.lng);
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        lastGeocodedRef.current = { lat: newPos.latitude, lng: newPos.longitude };
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.latitude}&lon=${newPos.longitude}&zoom=18&addressdetails=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data.address) {
              setAddress(data.address);
            }
          })
          .catch(() => { /* Silent failure for reverse geocode */ });
      }
    };

    const handleError = (err) => {
      setError(err.message);
      setLoading(false);
      if (err.code === 1) setPermissionStatus('denied');
    };

    // First get a quick position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    // Then watch for continuous high-accuracy updates
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess, 
      () => {}, // Silent error on watch to avoid spamming UI, primary error handled above
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    // Check permission status on mount
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
        if (result.state === 'granted') {
          requestLocation();
        }
      }).catch(() => {});
    }

    // Device Orientation (Compass) - Throttled to ~30fps for performance
    const handleOrientation = (e) => {
      const now = performance.now();
      if (now - lastOrientationUpdateRef.current < 32) return; // ~30fps
      lastOrientationUpdateRef.current = now;

      // Use webkitCompassHeading for iOS, alpha for others
      const h = e.webkitCompassHeading || (360 - e.alpha);
      if (h !== undefined && h !== null) {
        setHeading(h);
      }
    };

    const startOrientation = async () => {
      // iOS 13+ requires explicit permission for Device Orientation
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const response = await DeviceOrientationEvent.requestPermission();
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error('DeviceOrientation permission error:', err);
        }
      } else {
        // Non-iOS or older iOS
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    };

    startOrientation();

    // Cleanup on component unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    };
  }, []);

  return { position, address, permissionStatus, loading, error, heading, requestLocation };
};

export const usePublicIP = () => {
  const [ip, setIp] = useState(null);
  const [ipSub, setIpSub] = useState('');
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const normalize = (raw, source) => {
      // eslint-disable-next-line no-console
      logger.info(`[GeoIP] Using ${source}`, raw);
      return raw;
    };

    // API 1: geojs.io (fully supports localhost CORS, highly reliable)
    const tryGeoJs = async () => {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.ip) throw new Error('geojs empty');
      return normalize({
        ip: data.ip, version: 'IPv4', country_name: data.country,
        country_code: data.country_code, region: data.region, city: data.city,
        postal: null, timezone: data.timezone, org: data.organization_name || data.organization,
        asn: data.asn ? `AS${data.asn}` : null, latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude),
        currency: null, currency_name: null, continent: null, calling_code: null,
        languages: null, capital: null, borders: null, flag: null, domain: null, utcOffset: null,
      }, 'geojs.io');
    };

    // API 2: ipinfo.io (1k req/day free, extremely fast, good CORS)
    const tryIpInfo = async () => {
      const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.ip) throw new Error('ipinfo empty');
      
      let lat = null, lon = null;
      if (data.loc) {
        const parts = data.loc.split(',');
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
      }
      
      return normalize({
        ip: data.ip, version: 'IPv4', country_name: null,
        country_code: data.country, region: data.region, city: data.city,
        postal: data.postal, timezone: data.timezone, org: data.org,
        asn: data.org ? data.org.split(' ')[0] : null, latitude: lat, longitude: lon,
        currency: null, currency_name: null, continent: null, calling_code: null,
        languages: null, capital: null, borders: null, flag: null, domain: null, utcOffset: null,
      }, 'ipinfo.io');
    };

    // API 3: db-ip.com (Free tier, good CORS, strong backup)
    const tryDbIp = async () => {
      const res = await fetch('https://api.db-ip.com/v2/free/self', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.ipAddress) throw new Error('db-ip empty');
      return normalize({
        ip: data.ipAddress, version: 'IPv4', country_name: data.countryName,
        country_code: data.countryCode, region: data.stateProv, city: data.city,
        postal: null, timezone: null, org: null,
        asn: null, latitude: null, longitude: null,
        currency: null, currency_name: null, continent: data.continentName, calling_code: null,
        languages: null, capital: null, borders: null, flag: null, domain: null, utcOffset: null,
      }, 'db-ip.com');
    };

    // API 4: ipify (IP only, absolute last resort)
    const tryIpify = async () => {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.ip) throw new Error('ipify empty');
      return normalize({
        ip: data.ip, version: 'IPv4', country_name: null, country_code: null,
        region: null, city: null, postal: null, timezone: null,
        org: null, asn: null, latitude: null, longitude: null,
        currency: null, currency_name: null,
        continent: null, calling_code: null, languages: null,
        capital: null, borders: null, flag: null, domain: null, utcOffset: null,
      }, 'ipify.org (IP only)');
    };

    const fetchGeo = async () => {
      // Prioritize GeoJS, then IpInfo, then DbIp, finally Ipify
      const apis = [tryGeoJs, tryIpInfo, tryDbIp, tryIpify];
      let data = null;
      let lastErr = null;

      for (const apiFn of apis) {
        try {
          data = await apiFn();
          break;
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.warn(`[GeoIP] Failed:`, err.message);
          lastErr = err;
        }
      }

      if (!data) {
        // eslint-disable-next-line no-console
        logger.error('[GeoIP] All APIs failed. Last error:', lastErr);
        setError('Unable to retrieve geolocation — all APIs failed');
        setIp('Unavailable');
        setLoading(false);
        return;
      }

      setIp(data.ip || 'Unavailable');
      setIpSub(`${data.version || 'IPv4'}${data.country_code ? ' · ' + data.country_code : ''}`);
      setGeoData({
        country: data.country_name ? `${data.flag || ''} ${data.country_name}${data.country_code ? ' (' + data.country_code + ')' : ''}`.trim() : '—',
        region: data.region || '—',
        city: data.city || '—',
        postal: data.postal || '—',
        timezone: data.timezone || '—',
        utcOffset: data.utcOffset || '—',
        continent: data.continent || '—',
        capital: data.capital || '—',
        callingCode: data.calling_code || '—',
        languages: data.languages || '—',
        borders: data.borders || '—',
        isp: data.org || '—',
        asn: data.asn || '—',
        domain: data.domain || '—',
        coordinates: data.latitude ? `${data.latitude}, ${data.longitude}` : '—',
        latitude: data.latitude,
        longitude: data.longitude,
        currency: data.currency_name ? `${data.currency_name} (${data.currency})` : (data.currency || '—'),
      });
      setError(null);
      setLoading(false);
    };

    fetchGeo();
  }, []);

  return { ip, ipSub, geoData, loading, error };
};

// Separate hook to get public IPv6 from a dedicated API
export const usePublicIPv6 = () => {
  const [ipv6, setIpv6] = useState(null);
  useEffect(() => {
    const fetchIPv6 = async () => {
      try {
        const res = await fetch('https://api6.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.ip && data.ip.includes(':')) {
          setIpv6(data.ip);
        }
      } catch {
        // IPv6 not available on this network
      }
    };
    fetchIPv6();
  }, []);
  return ipv6;
};

// Separate hook to get public IPv4 from a dedicated API
export const usePublicIPv4 = () => {
  const [ipv4, setIpv4] = useState(null);
  useEffect(() => {
    const fetchIPv4 = async () => {
      try {
        const res = await fetch('https://api4.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.ip && data.ip.includes('.')) {
          setIpv4(data.ip);
        }
      } catch {
        // Fallback or unavailable
      }
    };
    fetchIPv4();
  }, []);
  return ipv4;
};

export const useLocalIP = () => {
  const [localIP, setLocalIP] = useState(null);
  const [ipv6, setIPv6] = useState(null);
  const [localSub, setLocalSub] = useState('');
  const [webrtcData, setWebRTCData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocal = async () => {
      return new Promise((resolve) => {
        const RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!RTCPeer) {
          setLocalIP('WebRTC not supported');
          setLocalSub('Your browser does not support WebRTC');
          setIPv6('Not available');
          setWebRTCData({ webrtcAPI: '✗ Not Supported', ipv4: 'N/A', ipv6: 'N/A', mdnsAliases: 'N/A', mdnsExplain: 'WebRTC unavailable', leakAssessment: 'N/A — WebRTC not supported' });
          setLoading(false);
          resolve();
          return;
        }

        const pc = new RTCPeer({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
            { urls: 'stun:stun.stunprotocol.org' },
          ],
        });

        const hostIPs = new Set();
        const srflxIPs = new Set();
        const mdnsEntries = new Set();

        pc.createDataChannel('');
        pc.createOffer().then((o) => pc.setLocalDescription(o));

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          pc.close();

          // host = local/private IPs, srflx = public IPs (from STUN)
          const allHost = [...hostIPs].filter((i) => !i.includes('.local'));
          const allSrflx = [...srflxIPs];
          const allMdns = [...mdnsEntries];

          const localV4 = allHost.find((i) => /^\d+\.\d+\.\d+\.\d+$/.test(i));
          const localV6 = allHost.find((i) => i.includes(':'));
          const publicV4 = allSrflx.find((i) => /^\d+\.\d+\.\d+\.\d+$/.test(i));

          // Classify the private IP
          const classifyPrivate = (ip) => {
            if (!ip) return '';
            if (ip.startsWith('10.')) return 'Class A · RFC 1918 Private';
            if (ip.startsWith('172.')) {
              const second = parseInt(ip.split('.')[1]);
              if (second >= 16 && second <= 31) return 'Class B · RFC 1918 Private';
            }
            if (ip.startsWith('192.168.')) return 'Class C · RFC 1918 Private';
            if (ip.startsWith('169.254.')) return 'Link-Local · APIPA';
            return 'Private Address';
          };

          setLocalIP(localV4 || (allMdns.length > 0 ? 'Hidden by browser' : 'Not detected'));
          setLocalSub(
            localV4
              ? classifyPrivate(localV4)
              : allMdns.length > 0
              ? `mDNS privacy active — disable in chrome://flags/#enable-webrtc-hide-local-ips-with-mdns to reveal`
              : 'WebRTC did not return local candidates'
          );
          setIPv6(localV6 || 'Not detected');

          setWebRTCData({
            webrtcAPI: '✓ Supported',
            ipv4: localV4 ? `${localV4} (exposed)` : 'Hidden (mDNS privacy active)',
            ipv6: localV6 || 'None',
            publicViaSTUN: publicV4 || 'Not resolved',
            mdnsAliases: allMdns.length > 0
              ? `${allMdns.length} alias(es) — browser privacy feature`
              : 'None',
            mdnsExplain: allMdns.length > 0
              ? 'Your browser replaces your real local IP with a random .local alias to prevent fingerprinting. Disable via chrome://flags → "Anonymize local IPs exposed by WebRTC".'
              : 'No mDNS aliases — your browser is exposing the real local IP.',
            leakAssessment: localV4
              ? '⚠ Private IP visible — sites can fingerprint your network'
              : '✓ Safe — real local IP is masked by browser',
          });

          setLoading(false);
          resolve();
        };

        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            finish();
            return;
          }

          const candidateStr = e.candidate.candidate;
          if (!candidateStr) return;

          // Try the RTCIceCandidate.address property first (structured API)
          const addr = e.candidate.address;
          if (addr) {
            if (addr.endsWith('.local')) {
              mdnsEntries.add(addr);
            } else if (e.candidate.type === 'host') {
              hostIPs.add(addr);
            } else if (e.candidate.type === 'srflx' || e.candidate.type === 'prflx') {
              srflxIPs.add(addr);
            } else {
              hostIPs.add(addr);
            }
          }

          // Also parse the candidate string for broader compatibility
          // Format: candidate:... <ip> <port> typ <type>
          const parts = candidateStr.split(' ');
          const ipIndex = 4; // standard position
          const typeIndex = parts.indexOf('typ');

          if (parts.length > ipIndex) {
            const ip = parts[ipIndex];
            const type = typeIndex >= 0 && parts.length > typeIndex + 1 ? parts[typeIndex + 1] : 'host';

            if (ip.endsWith('.local')) {
              mdnsEntries.add(ip);
            } else if (/^[\d.:a-f]+$/i.test(ip)) {
              if (type === 'host') hostIPs.add(ip);
              else if (type === 'srflx' || type === 'prflx') srflxIPs.add(ip);
              else hostIPs.add(ip);
            }
          }
        };

        setTimeout(finish, 4000);
      });
    };

    fetchLocal();
  }, []);

  return { localIP, ipv6, localSub, webrtcData, loading };
};

export const useConnectionDetails = () => {
  const [connData, setConnData] = useState(null);

  useEffect(() => {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const typeMap = {
      wifi: 'Wi-Fi',
      cellular: 'Cellular',
      ethernet: 'Ethernet',
      bluetooth: 'Bluetooth',
      none: 'None',
      unknown: 'Unknown',
    };

    setConnData({
      type: c ? typeMap[c.type] || c.type || 'Unknown' : 'Unknown',
      effective: c ? (c.effectiveType || '—').toUpperCase() : '—',
      downlink: c && c.downlink ? c.downlink + ' Mbps' : '—',
      rtt: c && c.rtt !== undefined ? c.rtt + ' ms' : '—',
      dataSaver: c ? (c.saveData ? 'Enabled' : 'Disabled') : '—',
      online: navigator.onLine ? '✓ Online' : '✗ Offline',
      protocol: window.location.protocol.replace(':', '').toUpperCase(),
      port: window.location.port || '(default)',
      host: window.location.hostname,
    });
  }, []);

  return connData;
};

export const useDeviceInfo = () => {
  const [deviceData, setDeviceData] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent;

    let os = 'Unknown';
    if (/Windows NT 10/.test(ua)) os = 'Windows 10 / 11';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS / iPadOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    let browser = 'Unknown';
    if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua)) browser = 'Google Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';

    const s = window.screen;

    setDeviceData({
      os,
      browser,
      platform: navigator.platform || '—',
      cpuCores: navigator.hardwareConcurrency || '—',
      ram: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '—',
      screen: `${s.width} × ${s.height}`,
      viewport: `${window.innerWidth} × ${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio + '×',
      colorDepth: s.colorDepth + ' bit',
      touchPoints: navigator.maxTouchPoints || '0',
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: navigator.cookieEnabled ? 'Enabled' : 'Disabled',
      dnt: navigator.doNotTrack === '1' ? 'Enabled' : 'Not set',
    });
  }, []);

  return deviceData;
};

export const useBrowserCapabilities = () => {
  const [capabilities, setCapabilities] = useState(null);

  useEffect(() => {
    const caps = [
      ['WebSocket', typeof WebSocket !== 'undefined'],
      ['WebRTC', typeof RTCPeerConnection !== 'undefined'],
      ['Fetch API', typeof fetch !== 'undefined'],
      ['XMLHttpRequest', typeof XMLHttpRequest !== 'undefined'],
      ['Service Worker', 'serviceWorker' in navigator],
      ['Push API', 'PushManager' in window],
      ['Beacon API', typeof navigator.sendBeacon !== 'undefined'],
      ['Server-Sent Events', typeof EventSource !== 'undefined'],
      ['Shared Worker', typeof SharedWorker !== 'undefined'],
      ['Broadcast Channel', typeof BroadcastChannel !== 'undefined'],
      ['Notifications', 'Notification' in window],
      ['Geolocation', 'geolocation' in navigator],
      ['Web Bluetooth', 'bluetooth' in navigator],
      ['WebUSB', 'usb' in navigator],
      ['Web Serial', 'serial' in navigator],
      ['Web NFC', 'NDEFReader' in window],
    ];
    setCapabilities(caps);
  }, []);

  return capabilities;
};
