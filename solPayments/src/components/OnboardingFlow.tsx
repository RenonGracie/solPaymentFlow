// OnboardingFlow.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingFlowProps {
  onComplete: (data: {
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
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
    preferredName: '',
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
  const [isOtherInputFocused, setIsOtherInputFocused] = useState(false);

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
      setIsWideScreen(width > 1024); // Changed from 1400 to 1024 to match the logic
      
      if (width < 768 && aspectRatio > 1) {
        setScreenType('mobile');
      } else if (aspectRatio > 1) {
        setScreenType('tablet');
      } else {
        setScreenType('desktop');
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
    } else if (currentStep === 1 && formData.preferredName) {
      // Use preferred name as firstName for backend
      setFormData(prev => ({
        ...prev,
        firstName: prev.preferredName
      }));
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

  const handleInputChange = (field: 'firstName' | 'preferredName' | 'email', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentSelection = (type: "insurance" | "cash_pay") => {
    if (type === "cash_pay") {
      setCurrentStep(4);
    } else {
      const nameParts = formData.firstName.trim().split(' ');
      const firstName = nameParts[0] || formData.firstName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      onComplete({
        firstName,
        lastName,
        email: formData.email,
        preferredName: formData.preferredName || firstName,
        state: 'NJ'
      });
      onSelectPaymentType(type);
    }
  };

  const handleStateSelection = (stateCode: string) => {
    setSelectedState(stateCode);
    // Clear the other state input when selecting any state
    setShowOtherStateInput(false);
    setOtherStateSearch('');
    setFormData(prev => ({ ...prev, state: stateCode }));
  };

  const handleStateConfirm = () => {
    if (selectedState) {
      if (!featuredStates.includes(selectedState)) {
        // Show waitlist popup for unsupported states
        setWaitlistState(allStates.find(s => s.code === selectedState)?.name || selectedState);
        setShowWaitlistPopup(true);
      } else {
        // Proceed with supported state
        const nameParts = formData.firstName.trim().split(' ');
        const firstName = nameParts[0] || formData.firstName;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        onComplete({
          firstName,
          lastName,
          email: formData.email,
          preferredName: formData.preferredName || firstName,
          state: selectedState
        });
        onSelectPaymentType("cash_pay");
      }
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
    if (isWideScreen === false && screenType === 'desktop') {
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

    // Desktop landscape - wide screens get 75/25 horizontal split
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

  // Name Input Screen - Only Preferred Name
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

        {/* Content - truly centered with only preferred name */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="max-w-md w-full -mt-16">
            <div className="text-center mb-12">
              <span className="text-5xl mb-6 block">👋</span>
              <h1 className="text-3xl md:text-4xl text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What can we call you?
              </h1>
            </div>

            {/* Single Preferred Name Input */}
            <div className="mb-8">
              <input
                type="text"
                value={formData.preferredName}
                onChange={(e) => handleInputChange('preferredName', e.target.value)}
                onFocus={() => setShowKeyboard(true)}
                onBlur={() => setShowKeyboard(false)}
                placeholder=""
                className="w-full text-2xl md:text-3xl font-light border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 transition-colors duration-200 text-center"
                style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
              />

            </div>

            <Button
              onClick={handleContinue}
              disabled={!formData.preferredName.trim()}
              className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-all duration-200 ${
                formData.preferredName.trim() 
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
                className="w-full text-lg md:text-xl border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 placeholder-gray-400 text-center"
                style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
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
          <div 
            className={`flex items-center transition-all duration-1000 ease-in-out ${
              expandedCard ? 'transform -translate-y-8 scale-0 opacity-0' : ''
            }`}
          >
            <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - truly centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12 md:pb-16">
          <div className="max-w-sm md:max-w-2xl w-full -mt-8 md:-mt-16">
            <div className="text-center mb-6 md:mb-8">
              <span className="text-3xl md:text-5xl mb-3 md:mb-4 block">🎉</span>
              <h1 className="text-2xl md:text-4xl mb-3 md:mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Welcome {displayName}
              </h1>
              <p className="text-gray-600 text-sm md:text-base px-2" style={{ fontFamily: 'var(--font-inter)' }}>
                Learn about our accessible offerings and choose what's most relevant for you.
              </p>
            </div>

            {/* Option Cards */}
            <div className="space-y-3 md:space-y-4">
              {/* Insurance Card */}
              <div className="w-full overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedCard === 'insurance') {
                      setExpandedCard(null);
                    } else {
                      setExpandedCard('insurance');
                    }
                  }}
                  className={`w-full text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-all duration-700 ease-in-out hover:scale-[1.02] ${
                    expandedCard === 'insurance' 
                      ? 'rounded-t-2xl border-b-0' 
                      : 'rounded-2xl'
                  }`}
                  style={{
                    padding: expandedCard === 'insurance' ? '16px 20px 12px 20px' : '16px 20px'
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Use My Insurance (NJ Only)
                    </h3>
                    <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'insurance' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'insurance' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                    Associate-Level Therapists
                  </p>
                </button>
                
                {/* Expanded Insurance Content */}
                <div className={`bg-white border-l border-r border-b border-yellow-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
                  expandedCard === 'insurance' 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-5 space-y-4">
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
                </div>
              </div>

              {/* Cash Pay Card */}
              <div className="w-full overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedCard === 'cash_pay') {
                      setExpandedCard(null);
                    } else {
                      setExpandedCard('cash_pay');
                    }
                  }}
                  className={`w-full text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-all duration-700 ease-in-out hover:scale-[1.02] ${
                    expandedCard === 'cash_pay' 
                      ? 'rounded-t-2xl border-b-0' 
                      : 'rounded-2xl'
                  }`}
                  style={{
                    padding: expandedCard === 'cash_pay' ? '16px 20px 12px 20px' : '16px 20px'
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Pay $30 Out-of-Pocket
                    </h3>
                    <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'cash_pay' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'cash_pay' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                    Intern-Level Therapists
                  </p>
                </button>
                
                {/* Expanded Cash Pay Content */}
                <div className={`bg-white border-l border-r border-b border-yellow-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
                  expandedCard === 'cash_pay' 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-700">$30 per session</p>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">States we currently serve:</p>
                      <p className="text-sm text-gray-600">
                        {featuredStates.map(stateCode => {
                          const state = allStates.find(s => s.code === stateCode);
                          return state?.name;
                        }).join(', ')}
                      </p>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced State Selection Screen
  if (currentStep === 4) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-24 md:h-28 overflow-hidden flex-shrink-0">
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
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="max-w-xs w-full -mt-12">
            {/* Yellow badge */}
            <div className="flex justify-center mb-8">
              <div className="bg-yellow-100 border border-yellow-400 rounded-full px-6 py-3 flex items-center animate-in fade-in-0 slide-in-from-top-4 duration-500">
                <span className="mr-2">💰</span>
                <span className="text-gray-800 font-medium">$30 / Session Out-of-Pocket Selected</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl mb-3 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What State Are You Based In?
              </h1>
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                Don't see your state? We're expanding and we'll be there soon—join the waitlist and we'll reach out as soon as we've landed.
              </p>
            </div>

            {/* State Options */}
            <div className="space-y-3 mb-6">
              {/* Featured States */}
              {featuredStates.map((stateCode, index) => {
                const state = allStates.find(s => s.code === stateCode);
                const isSelected = selectedState === stateCode;
                return (
                  <button
                    key={stateCode}
                    onClick={() => handleStateSelection(stateCode)}
                    className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                      isSelected 
                        ? 'border-[#5C3106] text-white shadow-lg' 
                        : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#5C3106' : 'white',
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.5s ease-out forwards'
                    }}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center ${isSelected ? '' : 'opacity-60'}`}>
                      <img 
                        src={`/state-icons/${stateCode.toLowerCase()}.svg`}
                        alt={state?.name}
                        className="w-6 h-6"
                        style={{
                          filter: isSelected ? 'brightness(0) invert(1)' : 'brightness(0) sepia(1) saturate(1) hue-rotate(25deg) brightness(0.8)'
                        }}
                        onError={(e) => {
                          // Fallback to a generic icon if state icon fails to load
                          (e.target as HTMLImageElement).src = '/state-icons/default.svg';
                        }}
                      />
                    </div>
                    
                    <span className={`text-base font-medium flex-1 text-center ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {state?.name}
                    </span>
                    
                    <div className="w-8 h-8 flex items-center justify-center">
                      {isSelected && (
                        <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                          <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Other State Option - Improved input field */}
              <div className="relative">
                <div 
                  className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${
                    selectedState && !featuredStates.includes(selectedState)
                      ? 'border-[#5C3106] text-white shadow-lg'
                    : showOtherStateInput
                      ? 'border-amber-500 shadow-lg shadow-amber-100 bg-white' 
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                  style={{
                    backgroundColor: selectedState && !featuredStates.includes(selectedState) ? '#5C3106' : 'white'
                  }}
                >
                  {!showOtherStateInput ? (
                    <button
                      onClick={() => {
                        // Clear any selected featured state when opening "Other"
                        if (featuredStates.includes(selectedState)) {
                          setSelectedState('');
                        }
                        setShowOtherStateInput(true);
                        setTimeout(() => {
                          document.getElementById('state-search-input')?.focus();
                        }, 100);
                      }}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="w-8 h-8"></div>
                      
                      <div className="flex-1 flex items-center justify-center">
                        <span className={`text-base font-medium ${selectedState && !featuredStates.includes(selectedState) ? 'text-white' : 'text-gray-800'}`}>
                          {selectedState && !featuredStates.includes(selectedState) 
                            ? allStates.find(s => s.code === selectedState)?.name || 'Other'
                            : 'Other'
                          }
                        </span>
                        {!(selectedState && !featuredStates.includes(selectedState)) && (
                          <span className="ml-2 text-base text-gray-400">
                            Select your state
                          </span>
                        )}
                      </div>
                      
                      <div className="w-8 h-8 flex items-center justify-center">
                        {selectedState && !featuredStates.includes(selectedState) && (
                          <div className="bg-white rounded-full p-1">
                            <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                          </div>
                        )}
                      </div>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between">
                      <div className="w-8 h-8"></div>
                      <input
                        id="state-search-input"
                        type="text"
                        value={otherStateSearch}
                        onChange={(e) => setOtherStateSearch(e.target.value)}
                        onFocus={() => setIsOtherInputFocused(true)}
                        onBlur={() => setIsOtherInputFocused(false)}
                        placeholder="Start typing your state..."
                        className="flex-1 text-base font-light border-0 focus:outline-none text-center placeholder-gray-400 bg-transparent"
                        style={{ fontFamily: 'var(--font-inter)' }}
                        autoFocus
                      />
                      <div className="w-8 h-8"></div>
                    </div>
                  )}
                </div>
                
                                {/* Dropdown for filtered states */}
                {showOtherStateInput && filteredStates.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    {filteredStates.map(state => (
                      <button
                        key={state.code}
                        onClick={() => {
                          handleStateSelection(state.code);
                          setOtherStateSearch('');
                          setShowOtherStateInput(false);
                        }}
                        className="w-full p-3 text-center hover:bg-amber-50 transition-colors border-b border-gray-100 last:border-b-0"
                        style={{ fontFamily: 'var(--font-inter)' }}
                      >
                        {state.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleStateConfirm}
              disabled={!selectedState}
              className={`w-full py-3 px-6 rounded-full text-base font-medium transition-all duration-200 ${
                selectedState 
                  ? 'bg-blue-100 text-gray-800 hover:bg-blue-200 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
              <ChevronRight className="inline w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Waitlist Popup */}
        {showWaitlistPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <button
                onClick={() => {
                  setShowWaitlistPopup(false);
                  setSelectedState('');
                }}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
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

        {/* Add CSS animation keyframes */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  return null;
}