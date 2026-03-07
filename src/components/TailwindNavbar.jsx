import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wifi, RefreshCw, Clock, Sun, Moon, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/classnames';
import { useCopy } from '../hooks/useCustom';

const TailwindNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { copy } = useCopy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Click outside detection for user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shortTz = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(part => part.type === 'timeZoneName')?.value || '';
    } catch { return ''; }
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout(navigate);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--color-canvas)', borderColor: 'var(--card-border)', opacity: 0.97 }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-glow" style={{ backgroundColor: 'var(--btn-primary-bg)' }}>
            <Wifi className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--btn-primary-text)' }} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-ink truncate max-w-[120px] sm:max-w-none">Network Monitor</h1>
            <p className="text-[10px] sm:text-xs text-ink-tertiary hidden sm:block">Pro Edition</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-ink-secondary cursor-pointer hover:text-ink transition-colors"
            onClick={() => copy(`${time} ${shortTz}`)}
            title="Click to copy time"
          >
            <Clock className="w-3.5 h-3.5 text-ink-quaternary" />
            {time} <span className="text-[10px] text-ink-quaternary">{shortTz}</span>
          </div>

          <div className="live-pill">Live</div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl transition-all duration-200 hover:bg-surface-light border"
            style={{ borderColor: 'var(--card-border)' }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-ink-secondary" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-ink-secondary" />}
          </button>

          {/* User Menu */}
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1 pr-2 sm:pr-3 rounded-xl border hover:bg-surface-light transition-all duration-200 active:scale-95"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <ChevronDown className={cn("w-3.5 h-3.5 text-ink-quaternary transition-transform duration-200", isMenuOpen && "rotate-180")} />
              </button>

              {isMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 sm:w-64 rounded-2xl border shadow-2xl overflow-hidden animate-rise-in"
                  style={{ 
                    backgroundColor: 'var(--color-surface)', 
                    borderColor: 'var(--card-border)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className="p-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
                    <p className="text-xs font-semibold text-ink truncate">{user.name}</p>
                    <p className="text-[10px] text-ink-tertiary truncate">{user.email}</p>
                  </div>
                  
                  <div className="p-2 pt-1.5 overflow-hidden">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleRefresh}
            className="p-1.5 sm:p-2 rounded-xl transition-all duration-200 hover:bg-surface-light border hidden sm:flex"
            style={{ borderColor: 'var(--card-border)' }}
            aria-label="Refresh application data"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-ink-secondary" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TailwindNavbar;
