// OnboardingFlow.tsx

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Check, Loader2 } from "lucide-react";
import { VIDEOS } from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { checkEligibility } from "../app/api/eligibility.js";

interface EligibilityBenefits {
  copay: string;
  coinsurance: string;
  memberObligation: string;
  deductible: string;
  remainingDeductible: string;
  oopMax: string;
  remainingOopMax: string;
  benefitStructure: string;
}

interface VerificationResponse {
  benefits?: EligibilityBenefits;
  subscriber?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    memberId?: string;
  };
  [key: string]: unknown;
}

interface OnboardingFlowProps {
  onComplete: (data: {
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
    provider?: string;
    memberId?: string;
    dateOfBirth?: string;
    paymentType?: string;
    verificationData?: VerificationResponse;
  }) => void;
  onSelectPaymentType: (type: "insurance" | "cash_pay") => void;
  initialStep?: number;
}

// Benefits display logic function
function getBenefitsDisplay(benefits: EligibilityBenefits) {
  // Parse numeric values from string amounts
  const parseAmount = (amount: string): number => {
    return parseFloat(amount.replace(/[$,]/g, '')) || 0;
  };

  const memberObligation = parseAmount(benefits.memberObligation);
  const remainingDeductible = parseAmount(benefits.remainingDeductible);
  const deductible = parseAmount(benefits.deductible);
  const copay = parseAmount(benefits.copay);
  const coinsurance = parseFloat(benefits.coinsurance.replace('%', '')) || 0;
  const benefitStructure = benefits.benefitStructure || '';
  
  // Assume session rate for 90791 - this should come from the API response
  const sessionRate90791 = 200; // Default value, should be from API

  // Determine if this is a range display (has coinsurance component)
  const hasCoinsurance = benefitStructure.toLowerCase().includes('coinsurance') || 
                         benefitStructure.toLowerCase().includes('co-insurance') ||
                         coinsurance > 0;

  // Calculate display amount
  let displayAmount: string;
  if (hasCoinsurance && memberObligation > 0) {
    const lower = memberObligation;
    const higher = Math.min(memberObligation + (sessionRate90791 - memberObligation), sessionRate90791);
    displayAmount = `$${lower.toFixed(0)}-$${higher.toFixed(0)}`;
  } else {
    displayAmount = `$${memberObligation.toFixed(0)}`;
  }

  // Main display text
  const largeText = hasCoinsurance && memberObligation > 0
    ? `Based on your benefits, you can expect to pay ${displayAmount} for your sessions.`
    : `Based on your benefits, you can expect to pay ${displayAmount} for your sessions.`;

  const smallText = hasCoinsurance
    ? "This is just an estimation based on the insurance information we received, including any remaining deductible or out-of-pocket maximum."
    : "This is just an estimation based on the insurance information we received.";

  // Additional details logic
  let additionalDetails: string | null = null;

  // Check for specific benefit structures requiring additional details
  const isFullyCovered = benefitStructure.toLowerCase().includes('fully covered') || memberObligation === 0;
  const hasAfterDeductible = benefitStructure.toLowerCase().includes('after deductible') || 
                             benefitStructure.toLowerCase().includes('deductible');

  if (isFullyCovered && !hasAfterDeductible) {
    // Path 6: Fully covered
    additionalDetails = "Great news—your sessions are fully covered by insurance. You won't owe anything.";
  } else if (isFullyCovered && hasAfterDeductible) {
    // Path 7: Fully covered after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} to go. After that, your sessions will be $0.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
    } else {
      additionalDetails = "Great news—you've already hit your deductible, so your sessions are fully covered by insurance. You won't owe anything.";
    }
  } else if (hasAfterDeductible && copay > 0 && !hasCoinsurance) {
    // Path 8 & 9: Copay after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} to go. After that, your cost drops to just your copay ($${copay.toFixed(0)}) per session.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
    } else {
      additionalDetails = `You've already hit your deductible, so you'll pay your copay of $${copay.toFixed(0)} per session.`;
    }
  } else if (hasAfterDeductible && hasCoinsurance && copay === 0) {
    // Path 10 & 11: Coinsurance after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} left to go. After that, you'll only pay ${coinsurance}% of each session cost.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
    } else {
      additionalDetails = "You've already hit your deductible, so you'll just pay your estimated coinsurance (your share of the session cost).";
    }
  } else if (hasAfterDeductible && hasCoinsurance && copay > 0) {
    // Path 12: Copay and coinsurance after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} left to go. After that, you'll pay your estimated copay and coinsurance.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
    } else {
      additionalDetails = "You've already hit your deductible, so you'll pay your estimated copay and coinsurance (your share of the session cost).";
    }
  }

  return {
    largeText,
    smallText,
    additionalDetails
  };
}

export default function OnboardingFlow({ 
  onComplete, 
  onSelectPaymentType,
  initialStep = 0 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    state: '',
    provider: '',
    memberId: '',
    dateOfBirth: ''
  });
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWideScreen, setIsWideScreen] = useState(false);
  // Initial video loading state
  const [initialVideoReady, setInitialVideoReady] = useState(false);

  // State selection variables
  const [selectedState, setSelectedState] = useState('');
  const [showOtherStateInput, setShowOtherStateInput] = useState(false);
  const [otherStateSearch, setOtherStateSearch] = useState('');
  const [showWaitlistPopup, setShowWaitlistPopup] = useState(false);
  const [waitlistState, setWaitlistState] = useState('');
  const [isOtherInputFocused, setIsOtherInputFocused] = useState(false);

  // Insurance verification variables
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResponse, setVerificationResponse] = useState<VerificationResponse | null>(null);
  const [verificationStep, setVerificationStep] = useState<'form' | 'verifying' | 'success' | 'failed'>('form');
  
  // NJ insurance plan verification
  const [njInsurancePlan, setNjInsurancePlan] = useState<'yes' | 'no' | null>(null);

  // Define featured states (supported states)
  const featuredStates = ['NY', 'NJ', 'CA', 'TX', 'FL'];

  // Insurance providers
  const insuranceProviders = [
    { id: "aetna", name: "Aetna" },
    { id: "cigna", name: "Cigna/Evernorth" },
    { id: "meritain", name: "Meritain" },
    { id: "carelon", name: "Carelon" },
    { id: "bcbs", name: "BCBS" },
    { id: "amerihealth", name: "AmeriHealth" }
  ];

  // Trading partner service ID mapping
  const tradingPartnerServiceIdMap: Record<string, string> = {
    "Aetna": "60054",
    "Cigna/Evernorth": "62308",
    "Meritain": "64157",
    "Carelon": "47198",
    "BCBS": "22099",
    "AmeriHealth": "60061"
  };

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
      // Auto-populate firstName with capitalized preferred name for legal name fields
      const capitalizedPreferredName = formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase();
      setFormData(prev => ({
        ...prev,
        firstName: capitalizedPreferredName,
        preferredName: capitalizedPreferredName
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

  const handleInputChange = (field: 'firstName' | 'lastName' | 'preferredName' | 'email' | 'provider' | 'memberId' | 'dateOfBirth', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentSelection = (type: "insurance" | "cash_pay") => {
    if (type === "cash_pay") {
      setCurrentStep(4); // Go to state selection
    } else {
      setCurrentStep(5); // Go to NJ insurance plan verification first
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
        // Ensure preferred name is capitalized
        const capitalizedPreferredName = formData.preferredName 
          ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
          : formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase();

        onComplete({
          firstName: formData.firstName,
          lastName: formData.lastName || '', // Add default empty string if no last name
          email: formData.email,
          preferredName: capitalizedPreferredName,
          state: selectedState,
          paymentType: 'cash_pay'
        });
        onSelectPaymentType("cash_pay");
      }
    }
  };

  const handleInsuranceVerification = async () => {
    // Validate required fields
    if (!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId || !formData.email) {
      return;
    }

    setVerificationStep('verifying');
    setIsVerifying(true);

    // Format date of birth for API (YYYYMMDD)
    const formatDOB = (dobStr: string): string | null => {
      const [year, month, day] = dobStr.split("-");
      if (!year || !month || !day) return null;
      return `${year}${month}${day}`;
    };

    const dobFormatted = formatDOB(formData.dateOfBirth);
    
    if (!dobFormatted) {
      setVerificationStep('failed');
      setIsVerifying(false);
      return;
    }

    // Prepare API payload
    const payload = {
      controlNumber: "987654321",
      tradingPartnerServiceId: tradingPartnerServiceIdMap[selectedProvider],
      provider: {
        organizationName: "Sol Health",
        npi: "1669282885"
      },
      subscriber: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: dobFormatted,
        memberId: formData.memberId
      }
    };

    try {
      const responseData = await checkEligibility(payload);
      setVerificationResponse(responseData);
      setVerificationStep('success');
      
      // Update form data with verified information from response
      if (responseData.subscriber) {
        setFormData(prev => ({
          ...prev,
          firstName: responseData.subscriber?.firstName || prev.firstName,
          lastName: responseData.subscriber?.lastName || prev.lastName,
          dateOfBirth: responseData.subscriber?.dateOfBirth || prev.dateOfBirth,
          memberId: responseData.subscriber?.memberId || prev.memberId
        }));
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStep('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInsuranceComplete = () => {
    // Ensure preferred name is capitalized
    const capitalizedPreferredName = formData.preferredName 
      ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
      : formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase();

    // Complete the onboarding with verified insurance data
    onComplete({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      preferredName: capitalizedPreferredName,
      state: 'NJ', // Default to NJ for insurance
      provider: selectedProvider,
      memberId: formData.memberId,
      dateOfBirth: formData.dateOfBirth,
      paymentType: 'insurance',
      verificationData: verificationResponse || undefined // Include verification response
    });
    onSelectPaymentType("insurance");
  };

  // Preload all videos at runtime to reduce startup delay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const warmVideos: HTMLVideoElement[] = [];
    let cancelled = false;

    // 1) Ensure local onboarding videos are requested first from the app directory
    const localOnboardingSources = ['/onboarding-video-9x16.mp4', '/onboarding-video-16x9.mp4'];

    const waitForLocalOnboarding = new Promise<void>((resolve) => {
      let readyCount = 0;
      const markReady = () => {
        readyCount += 1;
        if (readyCount >= localOnboardingSources.length) resolve();
      };

      localOnboardingSources.forEach((href) => {
        const v = document.createElement('video');
        v.src = href;
        v.preload = 'auto';
        v.muted = true;
        v.setAttribute('playsinline', '');
        v.oncanplaythrough = markReady;
        v.onloadeddata = markReady;
        try {
          v.load();
        } catch {}
        warmVideos.push(v);
      });

      // Fallback in case events don't fire quickly
      setTimeout(() => resolve(), 1500);
    });

    // 2) After local onboarding is warmed, warm remote videos sequentially to avoid contention
    waitForLocalOnboarding.then(() => {
      if (cancelled) return;

      const urls = Object.entries(VIDEOS)
        .map(([, href]) => href)
        .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
        // do not warm onboarding remotes to avoid duplicate downloads; local versions are preferred
        .filter((u) => !/onboarding-video-(?:9x16|16x9)\.mp4$/i.test(u));

      const loadSequential = (index: number) => {
        if (cancelled || index >= urls.length) return;
        const href = urls[index];
        const v = document.createElement('video');
        v.src = href;
        v.preload = 'auto';
        v.muted = true;
        v.setAttribute('playsinline', '');
        const next = () => loadSequential(index + 1);
        v.oncanplaythrough = next;
        v.onloadeddata = next;
        try {
          v.load();
        } catch {}
        warmVideos.push(v);
      };

      // start sequential warm
      loadSequential(0);
    });

    return () => {
      cancelled = true;
      warmVideos.forEach((v) => {
        try {
          v.src = '';
        } catch {}
      });
    };
  }, []);

  // Splash Screen with Video
  if (currentStep === 0) {
    // Mobile portrait layout - 9:16 video full screen
    if (screenType === 'mobile') {
      return (
        <div className="relative bg-black h-[100dvh] w-full overflow-hidden overscroll-none">
          <video 
            className="absolute inset-0 w-full h-full object-cover object-bottom"
            autoPlay 
            muted 
            loop 
            playsInline
            preload="auto"
            onCanPlayThrough={() => setInitialVideoReady(true)}
          >
            <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {!initialVideoReady && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
              <div className="flex items-center space-x-2 text-white">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-20 px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
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
              preload="auto"
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
                className="w-full py-5 px-8 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-lg font-medium hover:bg-gray-50 transition-colors"
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
              preload="auto"
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
                  className="w-full py-4 lg:py-5 px-8 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-lg font-medium hover:bg-gray-50 transition-colors"
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
            preload="auto"
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
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-base font-medium hover:bg-gray-50 transition-colors"
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
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
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
              className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-colors duration-200 ${
                formData.preferredName.trim() 
                  ? 'bg-blue-100 text-gray-800 hover:bg-blue-200' 
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
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
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
                 placeholder="well@being.co"
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
              className={`w-full py-5 px-8 rounded-full text-white text-lg font-medium transition-colors ${
                formData.email.includes('@')
                  ? 'bg-amber-700 hover:bg-amber-800' 
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
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
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
                  className={`w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors duration-700 ease-in-out ${
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
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                      Associate Therapists
                    </p>
                    <span className="inline-block rounded-full bg-blue-100 text-gray-800 px-2 py-0.5 text-[11px] md:text-xs font-medium">
                      (~$20-40 average session cost)
                    </span>
                  </div>
                </button>
                
                {/* Expanded Insurance Content */}
                <div className={`bg-white border-l border-r border-b border-yellow-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
                  expandedCard === 'insurance' 
                    ? 'max-h-[1000px] opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-5 space-y-4 pb-6">
                     
                     <div>
                       <p className="text-sm font-medium text-gray-800 mb-2">We currently accept:</p>
                       <p className="text-sm text-gray-600">Aetna, Amerihealth, Horizon Blue Cross Blue Shield, Meritain Health</p>
                     </div>
                     
                     <div>
                       <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
                       <ul className="text-sm text-gray-600 space-y-1">
                         <li>• 1-1 virtual sessions (55 min)</li>
                         <li>• We'll automatically verify your benefits and estimate what you'll pay</li>
                         <li>• You'll be matched with an Associate Therapist. Associate Therapists have graduated from their counseling programs, have a provisional license, and are working towards full licensure.</li>
                       </ul>
                     </div>
                     
                     <Button
                       onClick={() => handlePaymentSelection("insurance")}
                       className="w-full bg-blue-200 hover:bg-blue-300 text-gray-800 py-3"
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
                  className={`w-full text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors duration-700 ease-in-out ${
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
                      Pay Out-of-Pocket
                    </h3>
                    <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'cash_pay' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'cash_pay' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                      Graduate Therapists
                    </p>
                    <span className="inline-block rounded-full bg-yellow-100 text-gray-800 px-2 py-0.5 text-[11px] md:text-xs font-medium">
                      ($30 per session)
                    </span>
                  </div>
                </button>
                
                {/* Expanded Cash Pay Content */}
                <div className={`bg-white border-l border-r border-b border-yellow-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
                  expandedCard === 'cash_pay' 
                    ? 'max-h-[1000px] opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-5 space-y-4 pb-6">
                     
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
                       className="w-full bg-yellow-300 hover:bg-yellow-400 text-gray-800 py-3"
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
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
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
              <div className="bg-yellow-100 border border-yellow-400 rounded-full px-4 py-2 flex items-center animate-in fade-in-0 slide-in-from-top-4 duration-500">
                <span className="mr-1 text-base">💰</span>
                <span className="text-gray-800 font-medium text-sm">$30 / Session Out-of-Pocket Selected</span>
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
                          filter: isSelected ? 'brightness(0) invert(1)' : 'none'
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
              className={`w-full py-3 px-6 rounded-full text-base font-medium transition-colors duration-200 ${
                selectedState 
                  ? 'bg-blue-100 text-gray-800 hover:bg-blue-200' 
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

  // NJ Insurance Plan Verification Screen (Step 5)
  if (currentStep === 5) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
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
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
          <div className="max-w-sm md:max-w-md w-full -mt-12">
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl mb-3 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Is Your Health Plan From New Jersey?
              </h1>
            </div>

            {/* State Options */}
            <div className="space-y-3 mb-6">
              {/* Yes, NJ Plan */}
              <button
                onClick={() => setNjInsurancePlan('yes')}
                className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                  njInsurancePlan === 'yes'
                    ? 'border-[#5C3106] text-white shadow-lg' 
                    : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: njInsurancePlan === 'yes' ? '#5C3106' : 'white'
                }}
              >
                <div className={`w-8 h-8 flex items-center justify-center ${njInsurancePlan === 'yes' ? '' : 'opacity-60'}`}>
                  <img 
                    src="/state-icons/nj.svg"
                    alt="New Jersey"
                    className="w-6 h-6"
                    style={{
                      filter: njInsurancePlan === 'yes' ? 'brightness(0) invert(1)' : 'none'
                    }}
                  />
                </div>
                
                <span className={`text-base font-medium flex-1 text-center ${njInsurancePlan === 'yes' ? 'text-white' : 'text-gray-800'}`}>
                  Yes, I have a New Jersey plan
                </span>
                
                <div className="w-8 h-8 flex items-center justify-center">
                  {njInsurancePlan === 'yes' && (
                    <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                      <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                    </div>
                  )}
                </div>
              </button>

              {/* No, Different State */}
              <button
                onClick={() => setNjInsurancePlan('no')}
                className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                  njInsurancePlan === 'no'
                    ? 'border-[#5C3106] text-white shadow-lg' 
                    : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: njInsurancePlan === 'no' ? '#5C3106' : 'white'
                }}
              >
                <div className="w-8 h-8"></div>
                
                <span className={`text-base font-medium flex-1 text-center ${njInsurancePlan === 'no' ? 'text-white' : 'text-gray-800'}`}>
                  No, my plan is in a different state
                </span>
                
                <div className="w-8 h-8 flex items-center justify-center">
                  {njInsurancePlan === 'no' && (
                    <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                      <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Show options based on selection */}
            {njInsurancePlan === 'yes' && (
              <Button
                onClick={() => {
                  // Set state to NJ and go to insurance form
                  setFormData(prev => ({ ...prev, state: 'NJ' }));
                  setCurrentStep(6);
                }}
                className="w-full py-3 px-6 rounded-full text-base font-medium transition-colors duration-200 bg-blue-100 text-gray-800 hover:bg-blue-200"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Verify my insurance benefits
                <ChevronRight className="inline w-4 h-4 ml-2" />
              </Button>
            )}

            {njInsurancePlan === 'no' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 space-y-4">
                <div className="text-center px-2">
                  <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                    We're currently only accepting NJ insurance plans, but we're expanding quickly to other states.
                  </p>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    We offer care for $30/session out-of-pocket where you'll be matched to an intern-therapist.
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    // Switch to cash pay flow
                    setCurrentStep(4); // Go to state selection
                  }}
                  className="w-full py-3 px-4 md:px-6 rounded-full text-sm md:text-base font-medium transition-colors duration-200 bg-yellow-100 text-gray-800 hover:bg-yellow-200"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  <span className="block md:hidden">Choose $30/Session Out-Of-Pocket</span>
                  <span className="hidden md:block">Choose $30 Per Session Out-Of-Pocket</span>
                  <ChevronRight className="inline w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Insurance Form Screen (Step 6)
  if (currentStep === 6) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
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

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={() => setCurrentStep(5)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="w-10"></div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="max-w-md w-full -mt-16">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Great, We're In Network!
              </h1>
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                Next, to verify your eligibility and estimate your co-pay, please enter your insurance information below.
              </p>
            </div>

            {/* Form - Only show when in form or verifying state */}
            {(verificationStep === 'form' || verificationStep === 'verifying') && (
              <div className="space-y-6 mb-8">
                {/* Insurance Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Provider*
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full text-lg border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 text-center disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    <option value="">Select provider</option>
                    {insuranceProviders.map((provider) => (
                      <option key={provider.id} value={provider.name}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Legal First Name - Pre-filled from earlier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Legal First Name*
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full text-lg border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 text-center disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
                    placeholder="John"
                  />
                </div>

                {/* Legal Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Legal Last Name*
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full text-lg border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 text-center disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
                    placeholder="Smith"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full text-lg border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 text-center disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  />
                </div>

                {/* Member ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member ID*
                  </label>
                  <input
                    type="text"
                    value={formData.memberId}
                    onChange={(e) => handleInputChange('memberId', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full text-lg border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 text-center disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-inter)' }}
                    placeholder="Enter your member ID"
                  />
                </div>

                {/* Email - Pre-filled from earlier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email*
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full text-lg border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-700 text-center disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
                    placeholder="melinda@gmail.com"
                  />
                </div>

                {/* Display preferred name info */}
                {formData.preferredName && formData.preferredName !== formData.firstName && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                      <strong>Note:</strong> Your therapist will address you as "{formData.preferredName}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Compact form summary when verification is successful or failed */}
            {(verificationStep === 'success' || verificationStep === 'failed') && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <p className="font-medium">{selectedProvider}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Member ID:</span>
                    <p className="font-medium">{formData.memberId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">DOB:</span>
                    <p className="font-medium">{formData.dateOfBirth}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification States */}
            {verificationStep === 'form' && (
              <Button
                onClick={handleInsuranceVerification}
                disabled={!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId || !formData.email}
                className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-colors ${
                  selectedProvider && formData.firstName && formData.lastName && formData.dateOfBirth && formData.memberId && formData.email
                    ? 'bg-amber-700 text-white hover:bg-amber-800' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Verify Insurance
                <ChevronRight className="inline w-5 h-5 ml-2" />
              </Button>
            )}

            {verificationStep === 'verifying' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Verifying Your Insurance...</h3>
                <p className="text-sm text-gray-600">This usually takes just a few seconds...</p>
              </div>
            )}

            {verificationStep === 'success' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">You're Covered!</h3>
                  {verificationResponse?.benefits && (
                    <>
                      {/* Green Box - Main Benefits Display */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="text-green-800">
                          <p className="font-medium text-base mb-2">
                            {getBenefitsDisplay(verificationResponse.benefits).largeText}
                          </p>
                          <p className="text-sm text-green-700">
                            {getBenefitsDisplay(verificationResponse.benefits).smallText}
                          </p>
                        </div>
                      </div>

                      {/* Yellow Box - Additional Details (if applicable) */}
                      {getBenefitsDisplay(verificationResponse.benefits).additionalDetails && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="text-yellow-800">
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                              {getBenefitsDisplay(verificationResponse.benefits).additionalDetails}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <Button
                  onClick={handleInsuranceComplete}
                  className="w-full py-5 px-8 rounded-full text-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Continue to Questionnaire
                  <ChevronRight className="inline w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {verificationStep === 'failed' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Verification Failed</h3>
                  <p className="text-sm text-gray-600">Please check your information and try again.</p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setVerificationStep('form')}
                    variant="outline"
                    className="flex-1 py-3 px-4 rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)} // Go to cash pay flow
                    className="flex-1 py-3 px-4 rounded-full bg-yellow-100 text-gray-800 hover:bg-yellow-200"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Pay $30/Session
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}