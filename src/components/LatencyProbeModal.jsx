import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import Button from './Button';

const defaultProbes = [
  { n: 'Google DNS', u: 'https://8.8.8.8' },
  { n: 'Cloudflare', u: 'https://1.1.1.1' },
  { n: 'GitHub', u: 'https://github.com' },
  { n: 'Google', u: 'https://www.google.com' },
  { n: 'AWS', u: 'https://aws.amazon.com' },
  { n: 'CF CDN', u: 'https://cdnjs.cloudflare.com' },
];

const LatencyProbeModal = ({ isOpen, onClose, probes, onSave }) => {
  const [editingProbes, setEditingProbes] = useState([...probes]);

  if (!isOpen) return null;

  const handleUpdate = (index, field, value) => {
    const updated = [...editingProbes];
    updated[index][field] = value;
    setEditingProbes(updated);
  };

  const handleRemove = (index) => {
    setEditingProbes(editingProbes.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    setEditingProbes([...editingProbes, { n: '', u: 'https://' }]);
  };

  const handleReset = () => {
    setEditingProbes([...defaultProbes]);
  };

  const handleSave = () => {
    // Basic validation: filter out completely empty rows
    const validProbes = editingProbes
      .filter((p) => p.n.trim() && p.u.trim() && p.u !== 'https://')
      .map(p => {
        // Auto-prepend https:// if they forgot
        let url = p.u.trim();
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        return { n: p.n.trim(), u: url };
      });
      
    // Always fallback to Google DNS if they deleted everything to prevent breaking the UI
    if (validProbes.length === 0) validProbes.push({ n: 'Google DNS', u: 'https://8.8.8.8' });
    
    onSave(validProbes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--card-border)' }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <h3 className="text-lg font-semibold text-ink">Edit Latency Probes</h3>
            <p className="text-xs text-ink-tertiary mt-1">Configure which endpoints the speed test pings.</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-quaternary hover:text-ink transition-colors rounded-lg hover:bg-surface-light">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {editingProbes.map((probe, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input 
                type="text" 
                value={probe.n} 
                onChange={(e) => handleUpdate(idx, 'n', e.target.value)}
                placeholder="Name (e.g. Google)" 
                className="input text-sm w-1/3" 
              />
              <input 
                type="text" 
                value={probe.u} 
                onChange={(e) => handleUpdate(idx, 'u', e.target.value)}
                placeholder="https://example.com" 
                className="input text-sm flex-1 font-mono" 
              />
              <button 
                onClick={() => handleRemove(idx)} 
                className="p-2.5 text-ink-quaternary hover:text-red-500 transition-colors rounded-lg hover:bg-surface-light shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button 
            onClick={handleAdd} 
            className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink transition-colors mt-2"
          >
            <Plus className="w-4 h-4" /> Add Probe
          </button>
        </div>

        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--card-border)', backgroundColor: 'var(--color-surface-light)' }}>
          <button 
            onClick={handleReset} 
            className="text-sm font-medium text-ink-tertiary hover:text-ink transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatencyProbeModal;
