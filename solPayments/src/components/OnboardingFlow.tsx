// OnboardingFlow.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingFlowProps {
  onComplete: (data: {
    firstName: string;
    lastName: string;
    email: string;
  }) => void;
  onSelectPaymentType: (type: "insurance" | "cash_pay") => void;
  initialStep?: number;
}

export default function OnboardingFlow({ 
  onComplete, 
  onSelectPaymentType,
  initialStep = 0 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    state: ''
  });
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWideScreen, setIsWideScreen] = useState(false);

  // State selection variables
  const [selectedState, setSelectedState] = useState('');
  const [showOtherStateInput, setShowOtherStateInput] = useState(false);
  const [otherStateSearch, setOtherStateSearch] = useState('');
  const [showWaitlistPopup, setShowWaitlistPopup] = useState(false);
  const [waitlistState, setWaitlistState] = useState('');

  // Define featured states (supported states)
  const featuredStates = ['NY', 'NJ', 'CA', 'TX', 'FL'];

  // All US states
  const allStates = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' }
  ];

  // Filter states based on search
  const filteredStates = allStates.filter(state => 
    state.name.toLowerCase().includes(otherStateSearch.toLowerCase()) && 
    !featuredStates.includes(state.code)
  );

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

  const [expandedCard, setExpandedCard] = useState<'insurance' | 'cash_pay' | null>(null);

  const handleContinue = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1 && formData.firstName) {
      setCurrentStep(2);
    } else if (currentStep === 2 && formData.email) {
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
    if (type === "cash_pay") {
      // For cash pay, go to state selection first
      setCurrentStep(4); // New state selection step
    } else {
      // For insurance, proceed as before
      const nameParts = formData.firstName.trim().split(' ');
      const firstName = nameParts[0] || formData.firstName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      onComplete({
        firstName,
        lastName,
        email: formData.email
      });
      onSelectPaymentType(type);
    }
  };

  const handleStateSelection = (stateCode: string) => {
    setSelectedState(stateCode);
    
    // Check if state is supported
    if (!featuredStates.includes(stateCode)) {
      // Show waitlist popup for unsupported states
      setWaitlistState(allStates.find(s => s.code === stateCode)?.name || stateCode);
      setShowWaitlistPopup(true);
    } else {
      // Proceed with supported state
      setFormData(prev => ({ ...prev, state: stateCode }));
    }
  };

  const handleStateConfirm = () => {
    if (selectedState && featuredStates.includes(selectedState)) {
      // State is supported, proceed to complete the flow
      const nameParts = formData.firstName.trim().split(' ');
      const firstName = nameParts[0] || formData.firstName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      onComplete({
        firstName,
        lastName,
        email: formData.email
      });
      onSelectPaymentType("cash_pay");
    }
  };

  // Splash Screen with Video
  if (currentStep === 0) {
    // Mobile portrait layout - 9:16 video full screen
    if (screenType === 'mobile') {
      return (
        <div className="min-h-screen relative overflow-hidden bg-black">
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
          >
            <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

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
          <div className="relative overflow-hidden" style={{ width: '56.25vh', backgroundColor: '#FFFAEE' }}>
            <video 
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay 
              muted 
              loop 
              playsInline
            >
              <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

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

    // Desktop landscape - ALL desktop sizes get 75/25 split
    // For very narrow desktop windows (< 1024px width), use vertical stack
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    if (windowWidth < 1024) {
      return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAEE' }}>
          {/* Video on top - takes up most of the screen */}
          <div className="flex-[3] relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#FFFAEE' }}>
            <video 
              className="w-full h-full object-cover"
              autoPlay 
              muted 
              loop 
              playsInline
            >
              <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Content below - minimal space */}
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

    // Desktop landscape - wide screens (>= 1024px) get 75/25 horizontal split
    return (
      <div className="min-h-screen flex flex-row" style={{ backgroundColor: '#FFFAEE' }}>
        {/* Video section - takes 75% of width */}
        <div className="w-3/4 relative overflow-hidden" style={{ backgroundColor: '#FFFAEE' }}>
          <video 
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay 
            muted 
            loop 
            playsInline
          >
            <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Content section - takes 25% of width */}
        <div className="w-1/4 flex flex-col justify-center items-center px-8 py-12">
          <div className="w-full max-w-sm space-y-6">
            <h2 
              className="text-center text-3xl lg:text-4xl text-gray-800"
              style={{ 
                fontFamily: 'var(--font-very-vogue), Georgia, serif',
                lineHeight: '1.1'
              }}
            >
              We're so happy you're here
            </h2>
            
            <Button
              onClick={handleContinue}
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-base font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Name Input Screen - IMPROVED: Better vertical centering
  if (currentStep === 1) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with sunset image - fixed height */}
        <div className="relative h-32 md:h-40 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-base md:text-lg lg:text-xl xl:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation - fixed height */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - truly centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="max-w-md w-full -mt-16">
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

  // Email Input Screen - IMPROVED: Better vertical centering
  if (currentStep === 2) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with sunset image - fixed height */}
        <div className="relative h-32 md:h-40 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-base md:text-lg lg:text-xl xl:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation - fixed height */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - truly centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="max-w-md w-full -mt-16">
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
                placeholder="melinda@gmail.com"
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

  // Welcome Screen (Payment Selection) - IMPROVED: Better vertical centering
  if (currentStep === 3) {
    // Capitalize first letter of name
    const displayName = formData.firstName 
      ? formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
      : 'Melinda';

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header - fixed height */}
        <div className="relative h-32 md:h-40 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-base md:text-lg lg:text-xl xl:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation - fixed height */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - truly centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="max-w-2xl w-full -mt-16">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎉</span>
              <h1 className="text-3xl md:text-4xl mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Welcome {displayName}
              </h1>
              <p className="text-gray-600 text-base" style={{ fontFamily: 'var(--font-inter)' }}>
                Learn about our accessible offerings and choose what's most relevant for you.
              </p>
            </div>

            {/* Option Cards */}
            <div className="space-y-4">
              {/* Insurance Card */}
              <div className="w-full">
                <button
                  onClick={() => {
                    if (expandedCard === 'insurance') {
                      setExpandedCard(null);
                    } else {
                      setExpandedCard('insurance');
                    }
                  }}
                  className="w-full text-left bg-yellow-50 hover:bg-yellow-100 rounded-2xl p-5 border border-yellow-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Use My Insurance (NJ Only)
                    </h3>
                    <span className="text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'insurance' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-4 h-4 ml-1 transition-transform ${expandedCard === 'insurance' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                    Associate-Level Therapists
                  </p>
                </button>
                
                {/* Expanded Insurance Content */}
                {expandedCard === 'insurance' && (
                  <div className="bg-white rounded-b-2xl p-5 border border-t-0 border-yellow-200 -mt-2 space-y-4">
                    <p className="text-sm text-gray-700">~$20-40 average session cost</p>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">We currently accept:</p>
                      <p className="text-sm text-gray-600">Aetna, Amerihealth, Horizon Blue Cross Blue Shield, Meritain Health</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 1-1 virtual sessions (55 min)</li>
                        <li>• We'll auto-verify your benefits and estimate what you'll pay</li>
                        <li>• You'll be matched with an Associate Therapist. Associate Therapists have graduated from their counseling programs, have a provisional license, and are working towards full licensure.</li>
                      </ul>
                    </div>
                    
                    <Button
                      onClick={() => handlePaymentSelection("insurance")}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 py-3"
                    >
                      Select Insurance Option
                    </Button>
                  </div>
                )}
              </div>

              {/* Cash Pay Card */}
              <div className="w-full">
                <button
                  onClick={() => {
                    if (expandedCard === 'cash_pay') {
                      setExpandedCard(null);
                    } else {
                      setExpandedCard('cash_pay');
                    }
                  }}
                  className="w-full text-left bg-yellow-50 hover:bg-yellow-100 rounded-2xl p-5 border border-yellow-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Pay $30 Out-of-Pocket
                    </h3>
                    <span className="text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'cash_pay' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-4 h-4 ml-1 transition-transform ${expandedCard === 'cash_pay' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                    Intern-Level Therapists
                  </p>
                </button>
                
                {/* Expanded Cash Pay Content */}
                {expandedCard === 'cash_pay' && (
                  <div className="bg-white rounded-b-2xl p-5 border border-t-0 border-yellow-200 -mt-2 space-y-4">
                    <p className="text-sm text-gray-700">$30 per session</p>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">States we currently serve:</p>
                      <p className="text-sm text-gray-600">{/* Dynamic list would go here */}Available in multiple states</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 1-1 virtual sessions (45 min)</li>
                        <li>• You pay $30 per session—no hidden fees.</li>
                        <li>• You'll be matched with a Graduate Therapist. Graduate Therapists are in their counseling programs obtaining clinical hours under licensed supervision.</li>
                      </ul>
                    </div>
                    
                    <Button
                      onClick={() => handlePaymentSelection("cash_pay")}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 py-3"
                    >
                      Select Cash Pay Option
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State Selection Screen (Step 4 - for cash pay)
  if (currentStep === 4) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-32 md:h-40 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-base md:text-lg lg:text-xl xl:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              YOU ARE EXACTLY WHERE<br/>YOU NEED TO BE
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={() => setCurrentStep(3)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="max-w-xl w-full -mt-16">
            {/* Yellow badge */}
            <div className="flex justify-center mb-8">
              <div className="bg-yellow-100 border border-yellow-400 rounded-full px-6 py-3 flex items-center">
                <span className="mr-2">👆</span>
                <span className="text-gray-800 font-medium">$30 / Session Out-of-Pocket Selected</span>
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What State Are You Based In?
              </h1>
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                Don't see your state? We're expanding and we'll be there soon—join the waitlist and we'll reach out as soon as we've landed.
              </p>
            </div>

            {/* State Options */}
            <div className="space-y-3 mb-8">
              {/* Featured States */}
              {featuredStates.map(stateCode => {
                const state = allStates.find(s => s.code === stateCode);
                return (
                  <button
                    key={stateCode}
                    onClick={() => handleStateSelection(stateCode)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      selectedState === stateCode 
                        ? 'bg-amber-700 border-amber-700 text-white' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <img 
                        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/us-${stateCode.toLowerCase()}.svg`}
                        alt={state?.name}
                        className="w-8 h-6 mr-3"
                        onError={(e) => {
                          // Fallback to generic US flag if state flag fails
                          (e.target as HTMLImageElement).src = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/us.svg';
                        }}
                      />
                      <span className={`font-medium ${selectedState === stateCode ? 'text-white' : 'text-gray-800'}`}>
                        {state?.name}
                      </span>
                    </div>
                    {selectedState === stateCode && (
                      <span className="text-white">✓</span>
                    )}
                  </button>
                );
              })}

              {/* Other State Option */}
              <button
                onClick={() => setShowOtherStateInput(!showOtherStateInput)}
                className="w-full p-4 rounded-2xl border-2 bg-white border-gray-200 hover:border-gray-300 transition-all text-left"
              >
                <span className="text-gray-800 font-medium">Other</span>
                <span className="text-gray-500 ml-2">Select your state</span>
              </button>

              {/* Other State Input/Dropdown */}
              {showOtherStateInput && (
                <div className="relative">
                  <input
                    type="text"
                    value={otherStateSearch}
                    onChange={(e) => setOtherStateSearch(e.target.value)}
                    placeholder="Start typing your state..."
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                    autoFocus
                  />
                  
                  {filteredStates.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {filteredStates.map(state => (
                        <button
                          key={state.code}
                          onClick={() => {
                            handleStateSelection(state.code);
                            setOtherStateSearch(state.name);
                            setShowOtherStateInput(false);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {state.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleStateConfirm}
              disabled={!selectedState}
              className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-all ${
                selectedState 
                  ? 'bg-blue-100 text-gray-800 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
              <ChevronRight className="inline w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Waitlist Popup */}
        {showWaitlistPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
              <button
                onClick={() => {
                  setShowWaitlistPopup(false);
                  setSelectedState('');
                }}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">
                  You're on the list! We'll be in your inbox as soon as we've landed in {waitlistState}.
                </h2>
                
                <Button
                  onClick={() => {
                    setShowWaitlistPopup(false);
                    setSelectedState('');
                  }}
                  className="w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 py-4 rounded-full font-medium"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}