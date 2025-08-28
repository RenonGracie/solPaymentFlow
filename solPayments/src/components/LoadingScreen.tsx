"use client";

import { useEffect, useState } from 'react';

const DOT_COUNT = 3;
const ANIMATION_DURATION = 4000;

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

const loadingStates = [
  {
    lines: [
      [
        { text: "Finding", className: "" },
        { text: "your", className: "" },
        { text: "perfect", className: "" }
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
        { text: "your", className: "" }
      ],
      [
        { text: "preferences", withDots: true, className: "" }
      ]
    ]
  },
  {
    lines: [
      [
        { text: "Matching", className: "" },
        { text: "you", className: "" },
        { text: "with", className: "" }
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
        { text: "there", withDots: true, className: "" }
      ]
    ]
  }
];

export const LoadingScreen = () => {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);

  useEffect(() => {
    if (currentStateIndex >= loadingStates.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStateIndex((prev) => prev + 1);
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [currentStateIndex]);

  const state = loadingStates[currentStateIndex];

  return (
    <div className="relative min-h-screen min-w-screen bg-[#F5F5DC]">
      <div className="absolute top-[40px] left-0 right-0 flex items-center justify-center gap-2 lg:top-[32px] lg:left-[32px] lg:justify-start">
        <h3 className="text-[22px] lg:text-[28px] font-medium font-sans">
          Sol Health
        </h3>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          key={currentStateIndex}
          className="flex flex-col items-center leading-[90%] text-[#8B4513] text-[40px] lg:text-[80px] animate-fade-slide"
        >
          {state.lines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className="flex items-center justify-center font-light leading-[90%] space-x-2 lg:space-x-4"
            >
              {line.map(({ text, className, withDots }, itemIndex) => (
                <span key={itemIndex} className={className}>
                  {text}
                  {withDots && <LoadingDots />}
                </span>
              ))}
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