import axios from 'axios';

const API_TIMEOUT = 5000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create axios instance with defaults
const apiClient = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response cache
const responseCache = new Map();

// Cache middleware
const getCachedResponse = (key) => {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
};

const setCachedResponse = (key, data) => {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// Geolocation API
export const geolocationAPI = {
  getPublicIP: async () => {
    const cacheKey = 'publicIP';
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get('https://ipapi.co/json/', {
        timeout: 8000,
      });
      const data = {
        ip: response.data.ip,
        country: response.data.country_name,
        region: response.data.region,
        city: response.data.city,
        postal: response.data.postal,
        timezone: response.data.timezone,
        isp: response.data.org,
        asn: response.data.asn,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        currency: response.data.currency,
      };
      setCachedResponse(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching public IP:', error.message);
      throw error;
    }
  },
};

// Latency API
export const latencyAPI = {
  probeLatency: async (url) => {
    const startTime = performance.now();
    try {
      await fetch(`${url}?t=${Date.now()}`, {
        mode: 'no-cors',
        cache: 'no-store',
      });
      const endTime = performance.now();
      return Math.round(endTime - startTime);
    } catch (error) {
      return null;
    }
  },

  probeMultiple: async (urls) => {
    const results = await Promise.all(
      urls.map(async (url) => {
        const latency = await latencyAPI.probeLatency(url);
        return { url, latency };
      })
    );
    return results.filter((r) => r.latency !== null);
  },
};

// HTTP Tester API
export const httpTesterAPI = {
  sendRequest: async (config) => {
    const {
      method,
      url,
      headers = {},
      params = {},
      data,
    } = config;

    try {
      const startTime = performance.now();
      const response = await apiClient({
        method,
        url,
        headers,
        params,
        data,
      });
      const endTime = performance.now();

      return {
        status: response.status,
        statusText: response.statusText,
        time: Math.round(endTime - startTime),
        size: JSON.stringify(response.data).length,
        headers: response.headers,
        data: response.data,
      };
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          time: 0,
          size: 0,
          headers: error.response.headers,
          data: error.response.data,
          error: error.message,
        };
      }
      throw error;
    }
  },
};

// Utility functions
export const apiUtils = {
  /**
   * Retry failed requests
   */
  retryRequest: async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  },

  /**
   * Parse error response
   */
  parseError: (error) => {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data,
      };
    }
    if (error.request) {
      return {
        status: 0,
        message: 'Network error - no response from server',
        data: null,
      };
    }
    return {
      status: 0,
      message: error.message,
      data: null,
    };
  },

  /**
   * Build query string from params object
   */
  buildQueryString: (params) => {
    return new URLSearchParams(params).toString();
  },

  /**
   * Format response size
   */
  formatResponseSize: (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
};

// Cache management
export const cacheManager = {
  clear: () => responseCache.clear(),
  clearKey: (key) => responseCache.delete(key),
  getSize: () => responseCache.size,
};

export default apiClient;
