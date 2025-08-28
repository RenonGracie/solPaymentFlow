"use client";

import { useEffect, useState } from 'react';

interface TherapistSearchModalProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const TherapistSearchModal = ({ isVisible, onComplete }: TherapistSearchModalProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 3000; // 3 seconds
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
            setProgress(0); // Reset for next use
          }, 100);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      clearInterval(timer);
      setProgress(0);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with fade to white */}
      <div className="absolute inset-0 bg-white/80 animate-fade-in" />
      
      {/* Yellow modal */}
      <div className="relative bg-yellow-100 rounded-3xl p-8 shadow-2xl border border-[#5C3106] max-w-sm mx-4 animate-modal-appear">
        <div className="text-center">
          <h2 className="very-vogue-title text-2xl text-[#5C3106] mb-8 leading-tight">
            Finding your next<br />
            therapist match...
          </h2>
          
          {/* Radial progress spinner */}
          <div className="relative w-16 h-16 mx-auto">
            {/* Background circle */}
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="#D2B48C"
                strokeWidth="4"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="#8B4513"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                className="transition-all duration-75 ease-linear"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modal-appear {
          from { 
            opacity: 0; 
            transform: scale(0.9) translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-modal-appear {
          animation: modal-appear 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};