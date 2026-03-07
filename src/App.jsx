import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Activity, Globe, Wrench, BookOpen } from 'lucide-react';
import { NetworkProvider } from './context/NetworkContext';
import TailwindNavbar from './components/TailwindNavbar';
import PageTitle from './components/PageTitle';
import ParticlesBackground from './components/ParticlesBackground';

import OverviewPage from './pages/OverviewPage';
import PerformancePage from './pages/PerformancePage';
import ToolsPage from './pages/ToolsPage';
import DocumentationPage from './pages/DocumentationPage';

const SidebarLink = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `shrink-0 flex items-center gap-3 px-4 py-3 mb-2 md:mb-0 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-glow'
            : 'text-ink-secondary hover:bg-surface-light hover:text-ink'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      {label}
    </NavLink>
  );
};

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Update page title component based on active route
  const pageTitles = {
    '/overview': 'Overview',
    '/performance': 'Performance',
    '/tools': 'Tools & Diagnostics',
    '/docs': 'Documentation',
  };

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors duration-300 flex flex-col relative z-0">
      <ParticlesBackground />
      <TailwindNavbar />
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 md:space-y-2 mb-4 md:mb-0">
          <PageTitle titleOverride={pageTitles[location.pathname]} />
          
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 md:sticky md:top-24 md:space-y-2 mt-4 md:mt-6 hide-scrollbar items-center md:items-stretch">
            <SidebarLink to="/overview" icon={Globe} label="Overview" />
            <SidebarLink to="/performance" icon={Activity} label="Performance" />
            <SidebarLink to="/tools" icon={Wrench} label="Tools" />
            <div className="hidden md:block pt-4 mt-4 border-t border-white/[0.06] text-xs font-semibold text-ink-quaternary tracking-wider uppercase px-4 mb-2">Reference</div>
            <SidebarLink to="/docs" icon={BookOpen} label="Docs" />
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

      </div>
      
      <footer className="bg-surface mt-auto py-6 text-center text-ink-quaternary text-sm border-t border-white/[0.06]">
        <p>Network Monitor (React) · Client-side only · No data stored or transmitted</p>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
};

const App = () => {
  return (
    <NetworkProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </NetworkProvider>
  );
};

export default App;
