import React from 'react';
import { useNavigate } from 'react-router-dom';

const TooltipText = ({ word, docId, children }) => {
  const navigate = useNavigate();

  const handleFocus = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      navigate(`/docs#${docId}`);
    }
  };

  return (
    <span 
      className="group relative inline-block border-b border-dashed border-ink-tertiary cursor-help"
      onClick={handleFocus}
    >
      {children || word}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg whitespace-nowrap pointer-events-none z-50">
        Ctrl + Click to open doc
        <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
          <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
        </svg>
      </span>
    </span>
  );
};

export default TooltipText;
