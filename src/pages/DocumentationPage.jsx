import React, { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { useLocation } from 'react-router-dom';

const DocItem = ({ id, title, children }) => (
  <div id={id} className="scroll-mt-24 pb-8 mb-8" style={{ borderBottom: '1px solid var(--card-border)' }}>
    <h3 className="text-lg font-bold text-ink mb-3">{title}</h3>
    <div className="text-sm text-ink-secondary leading-relaxed space-y-4">
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
    <div className="space-y-6 animate-fade-in">
      <Card className="p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-8 pb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--icon-bg)', border: '1px solid var(--icon-border)' }}>
            <BookOpen className="w-6 h-6 text-ink" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Terminology Dictionary</h2>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <DocItem id="cookies" title="HTTP Cookies">
            <p>
              An HTTP cookie is a small piece of data that a server sends to the user's web browser. The browser may store it and send it back with later requests to the same server. That's how websites remember your state or login session.
            </p>
            <p>
              <strong>Same-site vs Cross-site:</strong> First-party cookies are set by the domain you are visiting. Third-party cookies belong to a different domain (like an ad network embedded on the page).
            </p>
          </DocItem>

          <DocItem id="local-storage" title="Local Storage (Web Storage)">
            <p>
              <code>localStorage</code> is a web storage object that allows JavaScript websites to store key-value data in the browser. The data survives full page reloads and closing the browser. It is strictly limited to 5MB per origin.
            </p>
          </DocItem>

          <DocItem id="session-storage" title="Session Storage">
            <p>
              <code>sessionStorage</code> is identical to Local Storage, but data only persists for the duration of the <em>page session</em>. If you close the tab, the data is instantly deleted. 
            </p>
          </DocItem>

          <DocItem id="indexed-db" title="IndexedDB">
            <p>
              IndexedDB is a low-level API for client-side storage of significant amounts of structured data, including files and blobs. Unlike Local Storage, it is asynchronous and provides a full database structure.
            </p>
          </DocItem>

          <DocItem id="service-workers" title="Service Workers">
            <p>
              A service worker is a script that your browser runs in the background, separate from a web page. They are essentially programmable network proxies that allow web apps to intercept network requests, cache resources, enable offline access, and receive push notifications.
            </p>
          </DocItem>
          
          <DocItem id="cors" title="CORS (Cross-Origin Resource Sharing)">
            <p>
              CORS is an HTTP-header based mechanism that allows a server to indicate any origins (domain, scheme, or port) other than its own from which a browser should permit loading resources. By default, browsers block JavaScript from making requests to different domains to prevent malicious scripts from stealing data.
            </p>
          </DocItem>
        </div>
      </Card>
    </div>
  );
};

export default DocumentationPage;
