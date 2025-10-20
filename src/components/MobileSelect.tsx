"use client";

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface MobileSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function MobileSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select option',
  className = '',
  label
}: MobileSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setShowModal(false);
  };

  // On desktop, render a native select
  if (!isMobile) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // On mobile, render a button that opens a modal
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={className}
      >
        {selectedOption ? selectedOption.label : placeholder}
      </button>

      {/* Mobile Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div 
            className="w-full bg-[#1a2332] rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">
                {label || 'Select Option'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto flex-1 p-2">
              {placeholder && (
                <button
                  onClick={() => handleSelect('')}
                  className={`w-full text-left px-4 py-4 rounded-lg transition-colors flex items-center justify-between ${
                    value === '' 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-base font-medium">{placeholder}</span>
                  {value === '' && <Check className="w-5 h-5 text-orange-400" />}
                </button>
              )}
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-4 py-4 rounded-lg transition-colors flex items-center justify-between ${
                    value === opt.value 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-base font-medium">{opt.label}</span>
                  {value === opt.value && <Check className="w-5 h-5 text-orange-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
