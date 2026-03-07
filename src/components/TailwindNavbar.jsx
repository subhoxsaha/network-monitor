import React, { useState, useEffect } from 'react';
import { Wifi, RefreshCw, Clock, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/classnames';
import { useCopy } from '../hooks/useCustom';

const TailwindNavbar = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { timeZone: 'UTC' }));
  const { copy } = useCopy();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { timeZone: 'UTC' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--color-canvas)', borderColor: 'var(--card-border)', opacity: 0.97 }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--btn-primary-bg)' }}>
            <Wifi className="w-5 h-5" style={{ color: 'var(--btn-primary-text)' }} />
          </div>
          <div>
            <h1 className="text-lg font-sans font-bold text-ink truncate max-w-[150px] sm:max-w-none">Network Monitor</h1>
            <p className="text-xs text-ink-tertiary hidden sm:block">Real-time Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 text-sm font-mono text-ink-secondary cursor-pointer hover:text-ink transition-colors"
            onClick={() => copy(time)}
            title="Click to copy time"
          >
            <Clock className="w-4 h-4 text-ink-quaternary" />
            {time} <span className="text-xs text-ink-quaternary">UTC</span>
          </div>

          <div className="live-pill">Live</div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-surface-light border"
            style={{ borderColor: 'var(--card-border)' }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            id="theme-toggle"
          >
            {isDark ? <Sun className="w-5 h-5 text-ink-secondary" /> : <Moon className="w-5 h-5 text-ink-secondary" />}
          </button>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-surface-light border"
            style={{ borderColor: 'var(--card-border)' }}
            title="Refresh data"
            id="refresh-btn"
          >
            <RefreshCw className="w-5 h-5 text-ink-secondary" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TailwindNavbar;
