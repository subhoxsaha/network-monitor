// Network API hooks
import { useState, useEffect, useCallback } from 'react';

// Browser Geolocation API — requests user permission for precise GPS
export const useBrowserGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
        if (result.state === 'granted') {
          requestLocation();
        }
      }).catch(() => {});
    }
  }, []);

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
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: new Date(pos.timestamp).toLocaleTimeString(),
      };
      setPosition(newPos);
      setPermissionStatus('granted');
      setLoading(false);

      // Reverse Geocode
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${newPos.latitude}&lon=${newPos.longitude}&format=json`, {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      })
        .then(res => res.json())
        .then(data => {
          if (data.address) {
            setAddress({
              street: data.address.road || data.address.pedestrian || '',
              suburb: data.address.suburb || data.address.neighbourhood || '',
              city: data.address.city || data.address.town || data.address.village || '',
              state: data.address.state || '',
              country: data.address.country || '',
              postcode: data.address.postcode || '',
              displayString: data.display_name
            });
          }
        })
        .catch(() => {});
    };

    const handleError = (err) => {
      setError(err.message);
      if (err.code === 1) setPermissionStatus('denied');
      setLoading(false);
    };

    // Force prompt on mobile browsers by calling get first
    navigator.geolocation.getCurrentPosition(
      (pos) => { handleSuccess(pos); watch(); },
      (err) => { handleError(err); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    const watch = () => {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
      setTimeout(() => navigator.geolocation.clearWatch(watchId), 120000);
    };
  }, []);

  return { position, address, permissionStatus, loading, error, requestLocation };
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
      console.log(`[GeoIP] Using ${source}`, raw);
      return raw;
    };

    // API 1: ipapi.co
    const tryIpApi = async () => {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('ipapi.co returned non-JSON: ' + text.slice(0, 100)); }
      if (data.error) throw new Error(data.reason || 'ipapi.co error');
      return normalize({
        ip: data.ip, version: data.version, country_name: data.country_name,
        country_code: data.country_code, region: data.region, city: data.city,
        postal: data.postal, timezone: data.timezone, org: data.org, asn: data.asn,
        latitude: data.latitude, longitude: data.longitude,
        currency: data.currency, currency_name: data.currency_name,
        continent: data.continent_code, calling_code: data.country_calling_code,
        languages: data.languages, capital: null, borders: null,
        flag: null, domain: null, utcOffset: data.utc_offset,
      }, 'ipapi.co');
    };

    // API 2: ipwho.is
    const tryIpWhois = async () => {
      const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.success === false) throw new Error('ipwho.is error');
      return normalize({
        ip: data.ip, version: data.type, country_name: data.country,
        country_code: data.country_code, region: data.region, city: data.city,
        postal: data.postal, timezone: data.timezone?.id, org: data.connection?.isp,
        asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
        latitude: data.latitude, longitude: data.longitude,
        currency: data.currency?.code, currency_name: data.currency?.name,
        continent: data.continent, calling_code: data.calling_code,
        languages: null, capital: data.capital, borders: data.borders,
        flag: data.flag?.emoji, domain: data.connection?.domain,
        utcOffset: data.timezone?.utc,
      }, 'ipwho.is');
    };

    // API 3: freeipapi.com
    const tryFreeIpApi = async () => {
      const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.ipAddress) throw new Error('freeipapi empty');
      // eslint-disable-next-line no-console
      console.log('[GeoIP] Using freeipapi.com (Fallback)', data);
      return normalize({
        ip: data.ipAddress, version: data.ipVersion === 6 ? 'IPv6' : 'IPv4',
        country_name: data.countryName, country_code: data.countryCode,
        region: data.regionName, city: data.cityName,
        postal: data.zipCode, timezone: data.timeZone,
        org: null, asn: null,
        latitude: data.latitude, longitude: data.longitude,
        currency: data.currency?.code, currency_name: data.currency?.name,
        continent: data.continent, calling_code: null,
        languages: data.language, capital: null, borders: null,
        flag: null, domain: null, utcOffset: null,
      }, 'freeipapi.com');
    };

    // API 4: geojs.io (fully supports localhost CORS)
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

    // API 5: ipify (IP only, last resort)
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
      const apis = [tryIpApi, tryIpWhois, tryFreeIpApi, tryGeoJs, tryIpify];
      let data = null;
      let lastErr = null;

      for (const apiFn of apis) {
        try {
          data = await apiFn();
          break;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`[GeoIP] Failed:`, err.message);
          lastErr = err;
        }
      }

      if (!data) {
        // eslint-disable-next-line no-console
        console.error('[GeoIP] All APIs failed. Last error:', lastErr);
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
    else if (/Linux/.test(ua)) {
      // Many mobile browsers mask as Linux. Check touch points as a hint.
      if (navigator.maxTouchPoints > 0) os = 'Android / Mobile';
      else os = 'Linux';
    }

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

export const useDeviceTelemetry = () => {
  const [telemetry, setTelemetry] = useState({
    battery: null,
    orientation: { alpha: 0, beta: 0, gamma: 0 },
    memory: null,
    permissionStatus: 'unknown'
  });

  const requestPermissions = async () => {
    // iOS 13+ requires explicit permission for DeviceOrientation
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        setTelemetry(prev => ({ ...prev, permissionStatus: response }));
        return response === 'granted';
      } catch (err) {
        console.error('DeviceOrientation permission error:', err);
        setTelemetry(prev => ({ ...prev, permissionStatus: 'denied' }));
        return false;
      }
    }
    // Android/Desktop generally don't require the requestPermission() call but might still need user interaction
    setTelemetry(prev => ({ ...prev, permissionStatus: 'granted' }));
    return true;
  };

  useEffect(() => {
    // Check if permission already exists or if it's not required
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
       setTelemetry(prev => ({ ...prev, permissionStatus: 'granted' }));
    }
    // 1. Battery API
    let batteryHandler = null;
    if ('getBattery' in navigator) {
      navigator.getBattery().then((batt) => {
        const updateBattery = () => {
          setTelemetry((prev) => ({
            ...prev,
            battery: {
              level: Math.round(batt.level * 100),
              charging: batt.charging,
              chargingTime: batt.chargingTime,
              dischargingTime: batt.dischargingTime,
            },
          }));
        };
        updateBattery();
        batt.addEventListener('levelchange', updateBattery);
        batt.addEventListener('chargingchange', updateBattery);
        batteryHandler = { batt, updateBattery };
      });
    }

    // 2. Orientation API
    const handleOrientation = (e) => {
      setTelemetry((prev) => ({
        ...prev,
        orientation: {
          alpha: Math.round(e.alpha || 0),
          beta: Math.round(e.beta || 0),
          gamma: Math.round(e.gamma || 0),
        },
      }));
    };
    window.addEventListener('deviceorientation', handleOrientation);

    // 3. Memory API (Chrome specific)
    const updateMemory = () => {
      if (performance && performance.memory) {
        setTelemetry((prev) => ({
          ...prev,
          memory: {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            limit: Math.round(performance.memory.jsHeapLimit / 1048576),
          },
        }));
      }
    };
    const memInterval = setInterval(updateMemory, 5000);
    updateMemory();

    return () => {
      if (batteryHandler) {
        batteryHandler.batt.removeEventListener('levelchange', batteryHandler.updateBattery);
        batteryHandler.batt.removeEventListener('chargingchange', batteryHandler.updateBattery);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
      clearInterval(memInterval);
    };
  }, []);

  return { ...telemetry, requestPermissions };
};
