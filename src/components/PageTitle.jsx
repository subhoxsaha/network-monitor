import React from 'react';
import { Shield, Globe, Sparkles } from 'lucide-react';

const PageTitle = ({ titleOverride }) => {
  return (
    <div className="py-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <div className="flex flex-col gap-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-sans font-bold flex items-center gap-2">
            {titleOverride || (
              <>
                Network <em className="text-ink not-italic text-glow">Intelligence</em>
              </>
            )}
            {!titleOverride && <Sparkles className="w-5 h-5 text-ink-tertiary animate-pulse" />}
          </h1>
          {!titleOverride && (
            <p className="text-ink-secondary text-sm">
              All data is collected locally in your browser.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageTitle;
