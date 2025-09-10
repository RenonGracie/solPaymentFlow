"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Define types for loading state items
interface LoadingStateItem {
  text: string;
  className?: string;
  withDots?: boolean;
  isItalic?: boolean;
  image?: string;
}

const DOT_COUNT = 3;
const ANIMATION_DURATION = 3000; // 3 seconds per state to ensure all are visible

const LoadingDots = () => {
  return (
    <div className="inline-flex ml-0.5" role="status" aria-label="Loading">
      {Array.from({ length: DOT_COUNT }).map((_, index) => (
        <span
          key={index}
          className="inline-block w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full mr-[3px] bg-[#8B4513] animate-bounce"
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1.1s',
            animationIterationCount: 'infinite'
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div
      className="flex gap-1"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className="h-[2px] w-[64px] lg:w-[124px] bg-[#D2B48C] rounded-[8px] overflow-hidden"
        >
          <div
            className="h-full bg-[#8B4513] origin-left transition-transform duration-700 ease-linear"
            style={{
              transform: `scaleX(${index <= currentStep ? 1 : 0})`,
              transitionDelay: '0.5s'
            }}
          />
        </div>
      ))}
    </div>
  );
};

const therapistMatchingStates = [
  {
    lines: [
      [
        { text: "Finding", className: "" },
        { text: "your", className: "italic", isItalic: true },
        { text: "perfect", className: "", image: "/loading-images/Eye.webp" }
      ],
      [
        { text: "therapist", withDots: true, className: "" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Analyzing", className: "" },
        { text: "your", className: "italic", isItalic: true }
      ],
      [
        { text: "preferences", withDots: true, className: "", image: "/loading-images/Hands.webp" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Matching", className: "" },
        { text: "you", className: "italic", isItalic: true },
        { text: "with", className: "", image: "/loading-images/Friends.webp" }
      ],
      [
        { text: "experts", withDots: true, className: "" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Almost", className: "" },
        { text: "there", withDots: true, className: "italic", isItalic: true, image: "/loading-images/Person1.webp" }
      ]
    ]
  }
];

const bookingConfirmationStates = [
  {
    lines: [
      [
        { text: "Good", className: "" },
        { text: "things", className: "italic", isItalic: true },
        { text: "take", className: "", image: "/loading-images/Person2.webp" }
      ],
      [
        { text: "time", withDots: true, className: "" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Confirming", className: "" },
        { text: "your", className: "italic", isItalic: true }
      ],
      [
        { text: "booking", withDots: true, className: "", image: "/loading-images/Person3.webp" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Almost", className: "" },
        { text: "there", withDots: true, className: "italic", isItalic: true, image: "/loading-images/Person4.webp" }
      ]
    ]
  }
];

const therapistSearchStates = [
  {
    lines: [
      [
        { text: "Searching", className: "" },
        { text: "for", className: "italic", isItalic: true },
        { text: "your", className: "", image: "/loading-images/Eye.webp" }
      ],
      [
        { text: "next", className: "" },
        { text: "match", withDots: true, className: "italic", isItalic: true }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Loading", className: "" },
        { text: "therapist", className: "italic", isItalic: true, image: "/loading-images/Person2.webp" }
      ],
      [
        { text: "profile", withDots: true, className: "" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Almost", className: "" },
        { text: "ready", withDots: true, className: "italic", isItalic: true, image: "/loading-images/Person3.webp" }
      ]
    ]
  }
];

interface LoadingScreenProps {
  onComplete?: () => void;
  minDisplayTime?: number; // Minimum time to show the loading screen (milliseconds)
  variant?: 'therapist-matching' | 'booking-confirmation' | 'therapist-search'; // Different loading screen variants
  preloadData?: () => Promise<void>; // Optional data preloading function
  preloadProgress?: number; // Progress of data preloading (0-100)
}

export const LoadingScreen = ({ 
  onComplete, 
  minDisplayTime = 12000, 
  variant = 'therapist-matching', 
  preloadData,
  preloadProgress = 0 
}: LoadingScreenProps = {}) => {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [hasCompletedCycle, setHasCompletedCycle] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadComplete, setPreloadComplete] = useState(false);
  
  // Select the appropriate loading states based on variant
  const loadingStates = variant === 'booking-confirmation' 
    ? bookingConfirmationStates 
    : variant === 'therapist-search' 
    ? therapistSearchStates 
    : therapistMatchingStates;

  // Handle data preloading
  useEffect(() => {
    if (preloadData && !isPreloading && !preloadComplete) {
      setIsPreloading(true);
      preloadData()
        .then(() => {
          console.log('✅ LoadingScreen: Data preloading completed');
          setPreloadComplete(true);
        })
        .catch((error) => {
          console.error('❌ LoadingScreen: Data preloading failed:', error);
          setPreloadComplete(true); // Continue anyway
        })
        .finally(() => {
          setIsPreloading(false);
        });
    }
  }, [preloadData, isPreloading, preloadComplete]);

  useEffect(() => {
    console.log(`🔄 LoadingScreen: State ${currentStateIndex}/${loadingStates.length - 1} (hasCompletedCycle: ${hasCompletedCycle})`);
    
    // Cycle through states
    if (currentStateIndex >= loadingStates.length - 1) {
      console.log(`🏁 LoadingScreen: Reached final state, hasCompletedCycle: ${hasCompletedCycle}`);
      if (!hasCompletedCycle) {
        console.log(`🎯 LoadingScreen: Setting hasCompletedCycle to true`);
        setHasCompletedCycle(true);
        
        // Wait for both minimum display time AND preloading to complete
        const maxWaitTime = Math.max(minDisplayTime, 10000); // Never wait longer than 10 seconds
        let checkCount = 0;
        const maxChecks = maxWaitTime / 100; // Maximum number of checks based on wait time
        
        const checkCompletion = () => {
          checkCount++;
          
          if (!preloadData || preloadComplete) {
            console.log('🎯 LoadingScreen: Completing - preload status:', preloadComplete);
            console.log('🎯 LoadingScreen: About to call onComplete callback');
            onComplete?.();
            console.log('🎯 LoadingScreen: onComplete callback called');
          } else if (checkCount >= maxChecks) {
            // Failsafe: if we've been waiting too long, proceed anyway
            console.warn('⚠️ LoadingScreen: Preloading timeout reached, proceeding anyway');
            console.warn('⚠️ LoadingScreen: Preload status:', { preloadComplete, checkCount, maxChecks });
            onComplete?.();
          } else {
            // Check again in a short interval
            setTimeout(checkCompletion, 100);
          }
        };
        
        // Ensure minimum display time
        const minTimer = setTimeout(checkCompletion, minDisplayTime);
        return () => clearTimeout(minTimer);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStateIndex((prev) => prev + 1);
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [currentStateIndex, hasCompletedCycle, onComplete, minDisplayTime, loadingStates.length, preloadData, preloadComplete]);

  const state = loadingStates[currentStateIndex];

  return (
    <div className="relative min-h-screen min-w-screen" style={{ backgroundColor: '#fffaee', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
      <div className="absolute top-[40px] left-0 right-0 flex items-center justify-center gap-2 lg:top-[32px] lg:left-[32px] lg:justify-start z-10">
        <div className="relative">
          <Image
            src="/sol-health-logo.svg"
            alt="Sol Health"
            width={186}
            height={32}
            className="h-6 w-auto lg:h-8 opacity-90"
            priority
            style={{
              filter: 'none',
              display: 'block'
            }}
          />
        </div>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          key={currentStateIndex}
          className="flex flex-col items-center leading-[90%] text-[#8B4513] text-[40px] lg:text-[80px] animate-fade-slide font-light"
          style={{ 
            fontFamily: 'var(--font-very-vogue), Georgia, serif',
            fontWeight: 400,
            letterSpacing: '0.02em',
            lineHeight: '1.1'
          }}
        >
          {state.lines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className="flex items-center justify-center font-light leading-[90%] space-x-2 lg:space-x-4"
            >
              {line.map((item, itemIndex) => {
                const { text, className = '', withDots, isItalic, image } = item as LoadingStateItem;
                return (
                  <div key={itemIndex} className="flex items-center space-x-2 lg:space-x-4">
                    <span className={`${className} ${isItalic ? 'italic' : ''}`}>
                      {text}
                      {withDots && <LoadingDots />}
                    </span>
                    {image && (
                      <div className="flex-shrink-0 animate-fade-slide">
                        <Image
                          src={image}
                          alt=""
                          width={80}
                          height={80}
                          className="w-12 h-12 lg:w-16 lg:h-16 object-cover rounded-full"
                          priority
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="absolute top-[70%] lg:top-[80%] animate-fade-up">
          <ProgressBar
            currentStep={currentStateIndex}
            totalSteps={loadingStates.length}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes fade-slide {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-up {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-bounce {
          animation-name: bounce-dot;
        }
        
        .animate-fade-slide {
          animation: fade-slide 0.7s ease-in-out;
        }
        
        .animate-fade-up {
          animation: fade-up 0.7s ease-in-out;
        }
      `}</style>
    </div>
  );
};