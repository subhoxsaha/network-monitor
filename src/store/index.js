import { create } from 'zustand';

// App store for global state management
export const useAppStore = create((set) => ({
  // UI State
  darkMode: true,
  sidebarOpen: true,
  loading: false,

  // Actions
  setDarkMode: (darkMode) => set({ darkMode }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setLoading: (loading) => set({ loading }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// Network store for network data
export const useNetworkStore = create((set) => ({
  // Data
  publicIP: null,
  localIP: null,
  ipv6: null,
  geoData: null,
  connectionDetails: null,
  deviceInfo: null,
  capabilities: [],

  // Status
  loading: {
    publicIP: false,
    localIP: false,
    geoData: false,
    all: false,
  },

  errors: {
    publicIP: null,
    localIP: null,
    geoData: null,
  },

  // Actions
  setPublicIP: (publicIP) => set({ publicIP }),
  setLocalIP: (localIP) => set({ localIP }),
  setIPv6: (ipv6) => set({ ipv6 }),
  setGeoData: (geoData) => set({ geoData }),
  setConnectionDetails: (connectionDetails) => set({ connectionDetails }),
  setDeviceInfo: (deviceInfo) => set({ deviceInfo }),
  setCapabilities: (capabilities) => set({ capabilities }),

  setLoading: (key, loading) =>
    set((state) => ({
      loading: { ...state.loading, [key]: loading },
    })),

  setError: (key, error) =>
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    })),

  // Reset all data
  reset: () =>
    set({
      publicIP: null,
      localIP: null,
      ipv6: null,
      geoData: null,
      connectionDetails: null,
      deviceInfo: null,
      capabilities: [],
      loading: {
        publicIP: false,
        localIP: false,
        geoData: false,
        all: false,
      },
      errors: {
        publicIP: null,
        localIP: null,
        geoData: null,
      },
    }),
}));

// Latency & Ping store
export const useLatencyStore = create((set) => ({
  latencyResults: [],
  probing: false,
  pingHost: localStorage.getItem('pingHost') || '',
  pingCount: localStorage.getItem('pingCount') || '4',
  pinging: false,
  pingResults: [],
  pingStats: '',

  setLatencyResults: (results) => set({ latencyResults: results }),
  setProbing: (probing) => set({ probing }),
  setPingHost: (host) => {
    localStorage.setItem('pingHost', host);
    set({ pingHost: host });
  },
  setPingCount: (count) => {
    localStorage.setItem('pingCount', count);
    set({ pingCount: count });
  },
  setPinging: (pinging) => set({ pinging }),
  setPingResults: (results) => set({ pingResults: results }),
  setPingStats: (stats) => set({ pingStats: stats }),
}));

// HTTP Tester store
export const useHTTPStore = create((set) => ({
  // Request
  method: 'GET',
  url: 'https://',
  headers: [['Content-Type', 'application/json']],
  params: [],
  bodyType: 'json',
  bodyContent: '',
  authType: 'none',
  authToken: '',
  authUsername: '',
  authPassword: '',
  authApiKey: '',

  // Response
  loading: false,
  responseStatus: null,
  responseTime: null,
  responseSize: null,
  responseHeaders: null,
  responseBody: '',
  responseTab: 'body',
  error: null,

  // Actions
  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setHeaders: (headers) => set({ headers }),
  setParams: (params) => set({ params }),
  setBodyType: (bodyType) => set({ bodyType }),
  setBodyContent: (bodyContent) => set({ bodyContent }),
  setAuthType: (authType) => set({ authType }),
  setAuthToken: (authToken) => set({ authToken }),
  setAuthUsername: (authUsername) => set({ authUsername }),
  setAuthPassword: (authPassword) => set({ authPassword }),
  setAuthApiKey: (authApiKey) => set({ authApiKey }),

  setLoading: (loading) => set({ loading }),
  setResponseStatus: (status) => set({ responseStatus: status }),
  setResponseTime: (time) => set({ responseTime: time }),
  setResponseSize: (size) => set({ responseSize: size }),
  setResponseHeaders: (headers) => set({ responseHeaders: headers }),
  setResponseBody: (body) => set({ responseBody: body }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setError: (error) => set({ error }),

  // Reset response
  resetResponse: () =>
    set({
      responseStatus: null,
      responseTime: null,
      responseSize: null,
      responseHeaders: null,
      responseBody: '',
      error: null,
    }),
}));

// Theme store
export const useThemeStore = create((set) => ({
  theme: localStorage.getItem('theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    }),
}));
