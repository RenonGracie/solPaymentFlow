// OnboardingFlow.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingFlowProps {
  onComplete: (data: {
    firstName: string;
    lastName: string;
    email: string;
  }) => void;
  onSelectPaymentType: (type: "insurance" | "cash_pay") => void;
  initialStep?: number; // Add this to support returning to selection screen
}

export default function OnboardingFlow({ 
  onComplete, 
  onSelectPaymentType,
  initialStep = 0 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    firstName: '',
    email: ''
  });
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Detect viewport orientation and screen type
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = height / width;
      
      setIsPortrait(aspectRatio > 1);
      setIsWideScreen(width > 1400);
      
      // Determine screen type based on width and aspect ratio
      if (width < 768 && aspectRatio > 1) {
        setScreenType('mobile'); // Phone in portrait
      } else if (aspectRatio > 1) {
        setScreenType('tablet'); // iPad/tablet in portrait
      } else {
        setScreenType('desktop'); // Any landscape orientation
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const handleContinue = () => {
    if (currentStep === 0) {
      // From splash to name input
      setCurrentStep(1);
    } else if (currentStep === 1 && formData.firstName) {
      // From name to email
      setCurrentStep(2);
    } else if (currentStep === 2 && formData.email) {
      // From email to welcome
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field: 'firstName' | 'email', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentSelection = (type: "insurance" | "cash_pay") => {
    // Split firstName into first and last name for backend compatibility
    const nameParts = formData.firstName.trim().split(' ');
    const firstName = nameParts[0] || formData.firstName;
    const lastName = nameParts.slice(1).join(' ') || '';
    
    onComplete({
      firstName,
      lastName,
      email: formData.email
    });
    onSelectPaymentType(type);
  };

  // Splash Screen with Video
  if (currentStep === 0) {
    // Mobile portrait layout - 9:16 video full screen
    if (screenType === 'mobile') {
      return (
        <div className="min-h-screen relative overflow-hidden bg-black">
          {/* Full screen 9:16 video for mobile */}
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
            onError={(e) => {
              console.error('Video failed to load:', e);
              console.log('Attempted to load: /onboarding-video-9x16.mp4');
            }}
            onLoadedData={() => {
              console.log('Video loaded successfully: mobile portrait');
            }}
          >
            <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Button overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8">
            <Button
              onClick={handleContinue}
              className="w-full py-5 px-8 bg-white/95 backdrop-blur-sm rounded-2xl text-gray-800 text-lg font-medium hover:bg-white transition-all"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
            </Button>
          </div>
        </div>
      );
    }

    // iPad/Tablet portrait - side by side with 9:16 video
    if (screenType === 'tablet') {
      return (
        <div className="min-h-screen flex flex-row" style={{ backgroundColor: '#FFFAEE' }}>
          {/* Video on left - 9:16 video fills height */}
          <div className="relative overflow-hidden" style={{ width: '56.25vh', backgroundColor: '#FFFAEE' }}> {/* 9/16 of viewport height */}
            <video 
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay 
              muted 
              loop 
              playsInline
              onError={(e) => {
                console.error('Video failed to load:', e);
                console.log('Attempted to load: /onboarding-video-9x16.mp4');
              }}
              onLoadedData={() => {
                console.log('Video loaded successfully: tablet portrait');
              }}
            >
              <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Content on right */}
          <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
            <div className="max-w-md w-full space-y-8">
              <h2 
                className="text-center text-4xl lg:text-5xl text-gray-800"
                style={{ 
                  fontFamily: 'var(--font-very-vogue), Georgia, serif',
                  lineHeight: '1.1'
                }}
              >
                We're so happy you're here
              </h2>
              
              <Button
                onClick={handleContinue}
                className="w-full py-5 px-8 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Desktop landscape - check for super wide screens using state
    if (isWideScreen) {
      // Super wide screens - side by side layout
      return (
        <div className="min-h-screen flex flex-row" style={{ backgroundColor: '#FFFAEE' }}>
          {/* Video on left - 16:9 video centered and cropped horizontally */}
          <div className="w-1/2 relative overflow-hidden" style={{ backgroundColor: '#FFFAEE' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <video 
                className="h-full w-auto min-w-full object-cover"
                style={{ transform: 'scale(1.2)' }} // Scale up slightly to ensure full height coverage
                autoPlay 
                muted 
                loop 
                playsInline
                onError={(e) => {
                  console.error('Video failed to load:', e);
                  console.log('Attempted to load: /onboarding-video-16x9.mp4');
                }}
                onLoadedData={() => {
                  console.log('Video loaded successfully: super wide desktop');
                }}
              >
                <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Content on right */}
          <div className="w-1/2 flex flex-col justify-center items-center px-12 py-12">
            <div className="max-w-xl w-full space-y-8">
              <h2 
                className="text-center text-5xl xl:text-6xl text-gray-800"
                style={{ 
                  fontFamily: 'var(--font-very-vogue), Georgia, serif',
                  lineHeight: '1.1'
                }}
              >
                We're so happy you're here
              </h2>
              
              <div className="max-w-md mx-auto w-full">
                <Button
                  onClick={handleContinue}
                  className="w-full py-5 px-8 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Regular desktop landscape - vertical stack with 16:9 video
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAEE' }}>
        {/* Video on top - takes up most of the screen on larger displays */}
        <div className="flex-[3] relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#FFFAEE' }}>
          <video 
            className="w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
            onError={(e) => {
              console.error('Video failed to load:', e);
              console.log('Attempted to load: /onboarding-video-16x9.mp4');
            }}
            onLoadedData={() => {
              console.log('Video loaded successfully: desktop landscape');
            }}
          >
            <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Content below - minimal space, just what's needed */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 py-8 lg:py-10 min-h-[200px] max-h-[300px]">
          <div className="max-w-2xl w-full space-y-6">
            <h2 
              className="text-center text-3xl lg:text-4xl xl:text-5xl text-gray-800"
              style={{ 
                fontFamily: 'var(--font-very-vogue), Georgia, serif',
                lineHeight: '1.1'
              }}
            >
              We're so happy you're here
            </h2>
            
            <div className="max-w-md mx-auto w-full">
              <Button
                onClick={handleContinue}
                className="w-full py-4 lg:py-5 px-8 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Name Input Screen
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Header with sunset image */}
        <div className="relative h-32 overflow-hidden">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <p className="absolute top-6 left-0 right-0 text-center text-sm text-gray-700" 
              style={{ 
                fontFamily: 'var(--font-very-vogue), Georgia, serif',
                letterSpacing: '0.05em',
                lineHeight: '1.2'
              }}>
            CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="px-6 pt-8 pb-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-12">
              <span className="text-5xl mb-6 block">👋</span>
              <h1 className="text-3xl md:text-4xl text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What can we call you?
              </h1>
            </div>

            <div className="mb-8">
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onFocus={() => setShowKeyboard(true)}
                onBlur={() => setShowKeyboard(false)}
                placeholder=""
                className="w-full text-2xl md:text-3xl font-light border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400"
                style={{ fontFamily: 'var(--font-inter)' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
              />
              {!formData.firstName && !showKeyboard && (
                <div className="mt-2 text-gray-400 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                  Type your first name
                </div>
              )}
            </div>

            <Button
              onClick={handleContinue}
              disabled={!formData.firstName.trim()}
              className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-all ${
                formData.firstName.trim() 
                  ? 'bg-blue-100 text-gray-800 hover:bg-blue-200 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
              <ChevronRight className="inline w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Email Input Screen
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Header with sunset image */}
        <div className="relative h-32 overflow-hidden">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <p className="absolute top-6 left-0 right-0 text-center text-sm text-gray-700" 
              style={{ 
                fontFamily: 'var(--font-very-vogue), Georgia, serif',
                letterSpacing: '0.05em',
                lineHeight: '1.2'
              }}>
            CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="px-6 pt-8 pb-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-12">
              <span className="text-5xl mb-6 block">✉️</span>
              <h1 className="text-3xl md:text-4xl text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What's Your Email?
              </h1>
            </div>

            <div className="mb-8">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onFocus={() => setShowKeyboard(true)}
                onBlur={() => setShowKeyboard(false)}
                placeholder="well@being.com"
                className="w-full text-lg md:text-xl border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 placeholder-gray-400"
                style={{ fontFamily: 'var(--font-inter)' }}
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            <Button
              onClick={handleContinue}
              disabled={!formData.email.includes('@')}
              className={`w-full py-5 px-8 rounded-full text-white text-lg font-medium transition-all ${
                formData.email.includes('@')
                  ? 'bg-amber-700 hover:bg-amber-800 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
              <ChevronRight className="inline w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Welcome Screen (Payment Selection)
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Header */}
        <div className="relative h-32 overflow-hidden">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <p className="absolute top-6 left-0 right-0 text-center text-sm text-gray-700" 
              style={{ 
                fontFamily: 'var(--font-very-vogue), Georgia, serif',
                letterSpacing: '0.05em',
                lineHeight: '1.2'
              }}>
            CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎉</span>
              <h1 className="text-3xl md:text-4xl mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Welcome {formData.firstName || '[FIRST NAME]'}
              </h1>
              <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-inter)' }}>
                Learn about our accessible offerings and choose what's most relevant for you.
              </p>
            </div>

            {/* Option Cards */}
            <div className="space-y-4">
              <button
                onClick={() => handlePaymentSelection("insurance")}
                className="w-full text-left bg-yellow-50 hover:bg-yellow-100 rounded-2xl p-5 border border-yellow-200 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    Use My Insurance (NJ Only)
                  </h3>
                  <span className="text-sm text-gray-600 font-medium flex items-center group-hover:translate-x-1 transition-transform" 
                        style={{ fontFamily: 'var(--font-inter)' }}>
                    Learn More
                    <ChevronRight className="inline w-4 h-4 ml-1" />
                  </span>
                </div>
                <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                  Associate-Level Therapists
                </p>
              </button>

              <button
                onClick={() => handlePaymentSelection("cash_pay")}
                className="w-full text-left bg-yellow-50 hover:bg-yellow-100 rounded-2xl p-5 border border-yellow-200 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    Pay $30 Out-of-Pocket
                  </h3>
                  <span className="text-sm text-gray-600 font-medium flex items-center group-hover:translate-x-1 transition-transform" 
                        style={{ fontFamily: 'var(--font-inter)' }}>
                    Learn More
                    <ChevronRight className="inline w-4 h-4 ml-1" />
                  </span>
                </div>
                <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                  Intern-Level Therapists
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}