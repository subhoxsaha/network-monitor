import React, { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import Card from '../components/Card';
import { useLocation } from 'react-router-dom';

const DocItem = ({ id, title, children }) => (
  <div id={id} className="scroll-mt-24 pb-8 mb-8 border-b border-white/[0.06] last:border-0 last:pb-0 last:mb-0">
    <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      {title}
    </h3>
    <div className="text-sm text-ink-secondary leading-relaxed space-y-4 font-medium">
      {children}
    </div>
  </div>
);

const DocumentationPage = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          // Temporarily highlight the section
          element.style.transition = 'background-color 0.5s';
          element.style.backgroundColor = 'rgba(48,209,88,0.1)';
          setTimeout(() => {
            element.style.backgroundColor = 'transparent';
          }, 2000);
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="space-y-6 animate-fade-in px-0.5">
      <Card className="p-6 sm:p-10">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/[0.06]">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">Terminology Dictionary</h2>
            <p className="text-ink-tertiary text-sm mt-0.5">Understanding modern web & networking concepts</p>
          </div>
        </div>

        <div className="max-w-none">
          <DocItem id="latency" title="Network Latency (RTT)">
            <p>
              Latency is the time it takes for data to travel from your device to a server and back (Round Trip Time). In our Performance tab, we measure this using high-precision browser timers. Lower is better: sub-50ms feels "instant," while {'>'}200ms can lead to noticeable lag.
            </p>
          </DocItem>

          <DocItem id="dns" title="DNS (Domain Name System)">
            <p>
              The phonebook of the internet. DNS translates human-readable hostnames (like google.com) into machine-readable IP addresses. We use Google DNS (8.8.8.8) and Cloudflare (1.1.1.1) as backbone probes to test your connection's reachability.
            </p>
          </DocItem>

          <DocItem id="webrtc" title="WebRTC & IP Leakage">
            <p>
              WebRTC is a powerful API for real-time video/audio. However, it can sometimes bypass VPNs or proxies to "leak" your true local or public IP address. Our monitor actively probes for these exposures to help you verify your privacy.
            </p>
          </DocItem>

          <DocItem id="cors" title="CORS (Cross-Origin Resource Sharing)">
            <p>
              CORS is a security mechanism that prevents websites from making unauthorized requests to different domains. When using our <strong>HTTP Tester</strong>, you may encounter CORS errors if the target server doesn't explicitly allow requests from your browser's origin.
            </p>
          </DocItem>

          <DocItem id="cookies" title="HTTP Cookies & Persistence">
            <p>
              Small data packets used to remember user state. We use them sparingly (e.g., to remember your map theme preference). Unlike Local Storage, cookies are automatically sent with every HTTP request to the domain that set them.
            </p>
          </DocItem>
        </div>
      </Card>
    </div>
  );
};

export default DocumentationPage;
