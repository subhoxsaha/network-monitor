import React from 'react';
import { Shield, Globe, Sparkles } from 'lucide-react';

const PageTitle = ({ titleOverride }) => {
  return (
    <div className="pb-4 mb-2 border-b border-white/[0.06]">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
          {titleOverride || (
            <>
              Network <em className="text-ink not-italic text-glow tracking-tight">Intelligence</em>
            </>
          )}
          {!titleOverride && <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />}
        </h1>
        {!titleOverride && (
          <p className="text-ink-secondary text-xs sm:text-sm font-medium">
            Real-time diagnostics · Privacy-first monitoring
          </p>
        )}
      </div>
    </div>
  );
};

export default PageTitle;
