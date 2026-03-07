import React, { useState } from 'react';
import { Send, Plus, Trash2, Code, Key, Link, FileJson, ArrowRight, ChevronDown, AlertCircle, Clock, HardDrive, Copy, X } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { formatBytes } from '../utils/helpers';
import { useCopy } from '../hooks/useCustom';

const HTTPTester = () => {
  // Advanced State with LocalStorage Persistence
  const [reqMethod, setReqMethod] = useState(() => localStorage.getItem('http_reqMethod') || 'GET');
  const [reqUrl, setReqUrl] = useState(() => localStorage.getItem('http_reqUrl') || 'https://');
  
  const [headers, setHeaders] = useState(() => {
    try { const saved = localStorage.getItem('http_headers'); return saved ? JSON.parse(saved) : [['Content-Type', 'application/json']]; } catch { return [['Content-Type', 'application/json']]; }
  });
  
  const [params, setParams] = useState(() => {
    try { const saved = localStorage.getItem('http_params'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [bodyType, setBodyType] = useState(() => localStorage.getItem('http_bodyType') || 'json');
  const [bodyContent, setBodyContent] = useState(() => localStorage.getItem('http_bodyContent') || '');
  
  const [authType, setAuthType] = useState(() => localStorage.getItem('http_authType') || 'none');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('http_authToken') || '');
  const [authUsername, setAuthUsername] = useState(() => localStorage.getItem('http_authUsername') || '');
  const [authPassword, setAuthPassword] = useState(() => localStorage.getItem('http_authPassword') || '');
  const [authApiKey, setAuthApiKey] = useState(() => localStorage.getItem('http_authApiKey') || '');

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('http_activeTab') || 'headers');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [responseSize, setResponseSize] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState(null);
  const [responseBody, setResponseBody] = useState('');
  const [responseTab, setResponseTab] = useState('body');
  const [error, setError] = useState(null);
  const { copy } = useCopy();

  // Persist all user inputs to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem('http_reqMethod', reqMethod);
      localStorage.setItem('http_reqUrl', reqUrl);
      localStorage.setItem('http_headers', JSON.stringify(headers));
      localStorage.setItem('http_params', JSON.stringify(params));
      localStorage.setItem('http_bodyType', bodyType);
      localStorage.setItem('http_bodyContent', bodyContent);
      localStorage.setItem('http_authType', authType);
      localStorage.setItem('http_authToken', authToken);
      localStorage.setItem('http_authUsername', authUsername);
      localStorage.setItem('http_authPassword', authPassword);
      localStorage.setItem('http_authApiKey', authApiKey);
      localStorage.setItem('http_activeTab', activeTab);
    } catch (e) {
      console.warn('Failed to save HTTP Tester state to localStorage', e);
    }
  }, [reqMethod, reqUrl, headers, params, bodyType, bodyContent, authType, authToken, authUsername, authPassword, authApiKey, activeTab]);

  const addRow = (setter, current) => setter([...current, ['', '']]);
  const removeRow = (setter, current, idx) => setter(current.filter((_, i) => i !== idx));
  const updateRow = (setter, current, idx, field, value) => {
    const updated = [...current];
    updated[idx] = [...updated[idx]];
    updated[idx][field === 'key' ? 0 : 1] = value;
    setter(updated);
  };

  const buildHeaders = () => {
    const h = {};
    headers.forEach(([k, v]) => { if (k.trim()) h[k.trim()] = v.trim(); });
    if (authType === 'bearer' && authToken) h['Authorization'] = `Bearer ${authToken}`;
    else if (authType === 'basic' && authUsername && authPassword) h['Authorization'] = `Basic ${btoa(`${authUsername}:${authPassword}`)}`;
    else if (authType === 'apikey' && authApiKey) h['X-API-Key'] = authApiKey;
    return h;
  };

  const buildUrl = () => {
    let url = reqUrl.trim();
    if (!url) return '';
    
    // Auto-prepend http:// if the user typed "localhost" or an IP but forgot the protocol
    if (!/^https?:\/\//i.test(url)) {
      if (url.startsWith('localhost') || url.startsWith('127.0.0.1') || url.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
        url = 'http://' + url;
      } else {
        url = 'https://' + url;
      }
    }

    const qs = params.filter(([k]) => k.trim()).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    return url;
  };

  const buildBody = () => {
    if (bodyType === 'none' || !bodyContent) return undefined;
    if (bodyType === 'json') { try { return JSON.stringify(JSON.parse(bodyContent)); } catch { return bodyContent; } }
    return bodyContent;
  };

  const sendRequest = async () => {
    setLoading(true); setError(null); setResponseStatus(null); setResponseBody(''); setResponseHeaders(null); setResponseTime(null); setResponseSize(null);
    const url = buildUrl();
    if (!url || url === 'https://') {
      setError('Please enter a valid URL');
      setLoading(false);
      return;
    }

    const opts = { method: reqMethod, headers: buildHeaders() };
    if (['POST', 'PUT', 'PATCH'].includes(reqMethod)) { const body = buildBody(); if (body) opts.body = body; }

    // Browsers natively block setting the "Host" or "Origin" headers on direct fetches.
    // If the user pasted them, we must strip them from the direct request options, 
    // otherwise the browser immediately throws a TypeError before the network layer.
    if (opts.headers['Host'] || opts.headers['host']) {
      delete opts.headers['Host'];
      delete opts.headers['host'];
    }
    if (opts.headers['Origin'] || opts.headers['origin']) {
      delete opts.headers['Origin'];
      delete opts.headers['origin'];
    }

    const performFetch = async (targetUrl, isProxy = false) => {
      const startTime = performance.now();
      const res = await fetch(targetUrl, opts);
      const time = (performance.now() - startTime).toFixed(0);
      setResponseStatus(res.status); 
      setResponseTime(time);
      
      let respText = '';
      try { respText = await res.text(); } catch { respText = '[Could not read response body]'; }
      
      const respHeaders = {};
      res.headers.forEach((value, key) => { respHeaders[key] = value; });
      setResponseHeaders(respHeaders);
      
      const isJson = res.headers.get('content-type')?.includes('json');
      if (isJson) { try { setResponseBody(JSON.stringify(JSON.parse(respText), null, 2)); } catch { setResponseBody(respText); } }
      else { setResponseBody(respText); }
      
      setResponseSize(respText.length);
      if (isProxy) {
        // AllOrigins wraps the response in a JSON object with a `contents` field
        if (targetUrl.includes('allorigins.win')) {
          try {
            const json = JSON.parse(respText);
            if (json.contents) {
              setResponseBody(json.contents);
              setResponseSize(json.contents.length);
              
              const isJsonContent = json.contents.trim().startsWith('{') || json.contents.trim().startsWith('[');
              if (isJsonContent) {
                try {
                  setResponseBody(JSON.stringify(JSON.parse(json.contents), null, 2));
                } catch { /* keep as string if parse fails */ }
              }
            }
          } catch {
            // Keep original if not parsable
          }
        }
        setError('Note: Request was routed through a CORS proxy because direct access was blocked.');
      }
      
      return res.status;
    };

    try {
      // 1) Try direct request first
      await performFetch(url, false);
    } catch (err) {
      // Check if trying to proxy a local address - public proxies can't reach localhost
      const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);
      
      if (isLocal) {
        setError('Network Error: Could not reach local endpoint. Note: Local endpoints need CORS enabled on the target server. Public CORS proxies cannot route to your local machine.');
        setLoading(false);
        return;
      }

      // 2) If it fails (likely CORS) and isn't local, try a chain of CORS Proxies
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://corsproxy.org/api/?url=${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      ];

      // Strip headers that might break proxies
      delete opts.headers['Host'];
      delete opts.headers['Origin'];

      let success = false;
      let lastErrorMsg = '';

      for (const proxyUrl of proxies) {
        try {
          const status = await performFetch(proxyUrl, true);
          // If the proxy itself blocks us (like corsproxy.io does sometimes), it returns 403.
          // In that case, we want to try the NEXT proxy.
          if (status === 403 && proxyUrl.includes('corsproxy.io')) {
            throw new Error(`Proxy ${proxyUrl} blocked the host.`);
          }
          success = true;
          break; // It worked! Break the loop.
        } catch (proxyErr) {
          lastErrorMsg = proxyErr.message || String(proxyErr);
          // Loop continues to try next proxy
        }
      }

      if (!success) {
        setError(`All proxies failed: ${lastErrorMsg.includes('Failed to fetch') ? 'Network error or endpoint unreachable.' : lastErrorMsg}`);
      }
    } finally { 
      setLoading(false); 
    }
  };

  const REQUEST_TABS = [
    { id: 'headers', label: 'Headers', icon: Code, count: headers.length },
    { id: 'params', label: 'Params', icon: Link, count: params.length },
    { id: 'body', label: 'Body', icon: FileJson },
    { id: 'auth', label: 'Auth', icon: Key },
  ];

  const renderKeyValueRows = (rows, setRows, keyPlaceholder, valuePlaceholder) => (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-1.5 sm:gap-2">
          <input type="text" value={row[0]} onChange={(e) => updateRow(setRows, rows, idx, 'key', e.target.value)} placeholder={keyPlaceholder} className="input flex-1 min-w-0 w-1/2 text-[10px] sm:text-sm font-mono px-2 py-1.5 sm:px-3 sm:py-2" />
          <input type="text" value={row[1]} onChange={(e) => updateRow(setRows, rows, idx, 'value', e.target.value)} placeholder={valuePlaceholder} className="input flex-1 min-w-0 w-1/2 text-[10px] sm:text-sm font-mono px-2 py-1.5 sm:px-3 sm:py-2" />
          <button onClick={() => removeRow(setRows, rows, idx)} className="p-1.5 sm:p-2 text-ink-quaternary hover:text-ink transition-colors rounded-lg hover:bg-surface-light shrink-0">
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      ))}
      <button onClick={() => addRow(setRows, rows)} className="flex items-center gap-1.5 text-xs sm:text-sm text-ink-secondary hover:text-ink transition-colors font-medium mt-2">
        <Plus className="w-4 h-4" />
        Add {keyPlaceholder?.includes('header') ? 'Header' : 'Parameter'}
      </button>
    </div>
  );

  return (
    <>
      <div className="section-label flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5" />
        Tools
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Send className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-ink">HTTP Request Tester</h2>
          </div>
        </div>

        {/* Method + URL */}
        <div className="px-5 py-5 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <div className="flex flex-1 gap-3">
              <div className="relative shrink-0">
                <select 
                  value={reqMethod} 
                  onChange={(e) => setReqMethod(e.target.value)} 
                  className="w-28 sm:w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-bold text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                    <option key={m} value={m} className="bg-zinc-900">{m}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-quaternary pointer-events-none" />
              </div>
              <input 
                type="text" 
                value={reqUrl} 
                onChange={(e) => setReqUrl(e.target.value)} 
                placeholder="https://api.example.com/endpoint" 
                className="input-text flex-1 min-w-0 font-mono text-sm px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40" 
                onKeyDown={(e) => e.key === 'Enter' && sendRequest()} 
              />
            </div>
            <Button 
              variant="primary" 
              onClick={sendRequest} 
              disabled={loading} 
              loading={loading} 
              className="px-8"
            >
              {!loading && <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 border-b border-white/[0.06]">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mb-px">
            {REQUEST_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-300 whitespace-nowrap
                    ${isActive ? 'border-blue-500 text-blue-500' : 'border-transparent text-ink-tertiary hover:text-ink-secondary hover:bg-white/[0.02]'}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-ink-tertiary'}`} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-blue-500/10 text-blue-500' : 'bg-white/5 text-ink-quaternary'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-6 py-5">
          {activeTab === 'headers' && renderKeyValueRows(headers, setHeaders, 'header key', 'header value')}
          {activeTab === 'params' && renderKeyValueRows(params, setParams, 'param key', 'param value')}
          {activeTab === 'body' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label className="text-xs sm:text-sm font-medium text-ink-secondary">Content Type</label>
                <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="select w-full sm:w-40 text-xs sm:text-sm">
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="text">Plain Text</option>
                </select>
              </div>
              {bodyType !== 'none' && (
                <textarea value={bodyContent} onChange={(e) => setBodyContent(e.target.value)} placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'} className="input w-full min-h-[160px] font-mono text-sm resize-y" />
              )}
            </div>
          )}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-ink-tertiary" />
                  <label className="text-xs sm:text-sm font-medium text-ink-secondary">Auth Type</label>
                </div>
                <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="select w-full sm:w-44 text-xs sm:text-sm">
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>
              {authType === 'bearer' && <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Enter bearer token…" className="input text-xs sm:text-sm font-mono w-full" />}
              {authType === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Username" className="input text-xs sm:text-sm w-full" />
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="input text-xs sm:text-sm w-full" />
                </div>
              )}
              {authType === 'apikey' && <input type="password" value={authApiKey} onChange={(e) => setAuthApiKey(e.target.value)} placeholder="Enter API key…" className="input text-xs sm:text-sm font-mono w-full" />}
            </div>
          )}
        </div>

        {/* Response */}
        {responseStatus !== null && (
          <div className="border-t border-white/[0.06]">
            <div className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 bg-white/[0.02] border-b border-white/[0.06]">
              <Badge variant={responseStatus >= 200 && responseStatus < 300 ? 'success' : responseStatus >= 400 ? 'error' : 'warning'}>
                {responseStatus}
              </Badge>
              {responseTime && (
                <div className="flex items-center gap-2 text-xs text-ink-tertiary font-medium">
                  <Clock className="w-4 h-4" />{responseTime}ms
                </div>
              )}
              {responseSize !== null && (
                <div className="flex items-center gap-2 text-xs text-ink-tertiary font-medium">
                  <HardDrive className="w-4 h-4" />{formatBytes(responseSize)}
                </div>
              )}
              <div className="ml-auto flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => copy(responseBody)} className="h-8">
                  <Copy className="w-3.5 h-3.5 mr-2" />Copy
                </Button>
                <div className="w-px h-4 bg-white/[0.08]"></div>
                <Button variant="ghost" size="sm" onClick={() => setResponseStatus(null)} className="h-8 hover:text-red-500">
                  <X className="w-4 h-4 mr-2" /> Clear
                </Button>
              </div>
            </div>

            <div className="px-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex gap-0 -mb-px">
                {['body', 'headers'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResponseTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize
                      ${responseTab === tab ? 'border-ink text-ink' : 'border-transparent text-ink-tertiary hover:text-ink-secondary'}`}
                  >
                    {tab === 'body' ? 'Response Body' : 'Response Headers'}
                  </button>
                ))}
              </div>
            </div>

            {responseTab === 'body' && (
              <div className="px-4 sm:px-6 py-4">
                <div className="rounded-lg p-4 max-h-[400px] overflow-auto" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                  {responseBody ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-ink">{responseBody}</pre>
                  ) : (
                    <p className="text-sm text-ink-quaternary italic">Empty response body</p>
                  )}
                </div>
              </div>
            )}

            {responseTab === 'headers' && responseHeaders && (
              <div className="px-4 sm:px-6 py-4">
                <div className="space-y-0 rounded-lg p-4 max-h-[400px] overflow-auto" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                  {Object.entries(responseHeaders).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row py-2.5 sm:py-2" style={{ borderBottom: '1px solid var(--row-border)' }}>
                      <span className="text-[10px] sm:text-xs font-mono font-semibold text-ink w-full sm:w-48 shrink-0 mb-1 sm:mb-0 opacity-80">{key}</span>
                      <span className="text-[10px] sm:text-xs font-mono text-ink-tertiary break-all flex-1">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--badge-bg)', border: '1px solid var(--icon-border)' }}>
            <AlertCircle className="w-5 h-5 text-ink-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink">Request Failed</p>
              <p className="text-xs text-ink-tertiary mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="note-box mx-6 mb-4">
          CORS restrictions apply when testing external APIs. Authentication is applied locally — use HTTPS for sensitive requests.
        </div>
      </Card>
    </>
  );
};

export default HTTPTester;
