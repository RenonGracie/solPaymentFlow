"use client";

import { useEffect } from 'react';

interface TherapistSearchModalProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const TherapistSearchModal = ({ isVisible, onComplete }: TherapistSearchModalProps) => {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with fade to white */}
      <div className="absolute inset-0 bg-white/80 animate-fade-in" />
      
      {/* Yellow modal */}
      <div className="relative bg-yellow-100 rounded-3xl p-8 shadow-2xl border border-[#5C3106] max-w-sm mx-4 animate-modal-appear" style={{ backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
        <div className="text-center">
          <h2 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-[#5C3106] mb-8 leading-tight text-center">
            Finding your next<br />
            therapist match...
          </h2>
          
          {/* Sun-like radial dial animation */}
          <div className="relative w-12 h-12 mx-auto">
            {/* Outer rays */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-4 bg-[#8B4513] rounded-full"
                  style={{
                    top: '0px',
                    left: '50%',
                    transformOrigin: '50% 24px',
                    transform: `translateX(-50%) rotate(${i * 45}deg)`,
                  }}
                />
              ))}
            </div>
            {/* Inner circle */}
            <div className="absolute inset-2 bg-[#8B4513] rounded-full"></div>
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