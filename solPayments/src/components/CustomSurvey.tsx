// solPayments/src/components/CustomSurvey.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";
import { VIDEOS } from "@/lib/videos";
import { useTherapistSearch } from "@/api/hooks/useTherapistSearch";

interface SurveyData {
  // Safety Screening
  safety_screening: string; // 'yes' | 'no' | ''
  
  // Therapist Matching
  matching_preference: string; // 'match_me' | 'requesting_specific' | ''
  selected_therapist?: string; // For specific therapist requests (name)
  selected_therapist_email?: string; // For specific therapist requests (email)
  
  // Therapist Preferences (for matching algorithm)
  therapist_gender_preference: string; // 'Female' | 'Male' | 'No preference'
  therapist_specialization: string[]; // Multiple selections
  therapist_lived_experiences: string[]; // Multiple selections
  
  // Alcohol and Drugs Screening
  alcohol_frequency: string; // 'Not at all' | 'Several days' | 'More than half the days' | 'Nearly every day'
  recreational_drugs_frequency: string; // 'Not at all' | 'Several days' | 'More than half the days' | 'Nearly every day'
  
  // Demographics
  first_name: string;
  last_name: string;
  email: string;
  preferred_name?: string; // Add this field
  phone?: string;
  age: string;
  date_of_birth: string;
  gender: string;
  state: string; // This is US state, not status!
  race_ethnicity: string[]; // Multi-select race/ethnicity
  
  // Mental Health Screening (PHQ-9)
  pleasure_doing_things: string;
  feeling_down: string;
  trouble_falling: string;
  feeling_tired: string;
  poor_appetite: string;
  feeling_bad_about_yourself: string;
  trouble_concentrating: string;
  moving_or_speaking_so_slowly: string;
  suicidal_thoughts: string;
  
  // Anxiety Screening (GAD-7)
  feeling_nervous: string;
  not_control_worrying: string;
  worrying_too_much: string;
  trouble_relaxing: string;
  being_so_restless: string;
  easily_annoyed: string;
  feeling_afraid: string;
  
  // Additional
  lived_experiences: string[];
  university?: string;
  referred_by?: string | string[];
  
  // Terms and Conditions
  terms_accepted: boolean;
}

interface CustomSurveyProps {
  paymentType: "insurance" | "cash_pay";
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
    provider?: string;
    paymentType?: string;
    dateOfBirth?: string;
    memberId?: string;
    verificationData?: {
      benefits?: {
        copay: string;
        coinsurance: string;
        memberObligation: string;
        deductible: string;
        remainingDeductible: string;
        oopMax: string;
        remainingOopMax: string;
        benefitStructure: string;
      };
      [key: string]: unknown;
    };
  };
  existingUserData?: {
    therapist_gender_preference?: string;
    therapist_specialization?: string[];
    therapist_lived_experiences?: string[];
    matching_preference?: string;
    selected_therapist?: {
      name: string;
      email: string;
    };
    safety_screening?: string;
    alcohol_frequency?: string;
    recreational_drugs_frequency?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    preferred_name?: string;
    phone?: string;
    age?: string;
    date_of_birth?: string;
    gender?: string;
    state?: string;
    race_ethnicity?: string[];
    lived_experiences?: string[];
    university?: string;
    referred_by?: string | string[];
    phq9_scores?: {
      pleasure_doing_things?: string;
      feeling_down?: string;
      trouble_falling?: string;
      feeling_tired?: string;
      poor_appetite?: string;
      feeling_bad_about_yourself?: string;
      trouble_concentrating?: string;
      moving_or_speaking_so_slowly?: string;
      suicidal_thoughts?: string;
    };
    gad7_scores?: {
      feeling_nervous?: string;
      not_control_worrying?: string;
      worrying_too_much?: string;
      trouble_relaxing?: string;
      being_so_restless?: string;
      easily_annoyed?: string;
      feeling_afraid?: string;
    };
  };
  onSubmit: (surveyData: SurveyData) => void;
  onBack: () => void;
}

const SURVEY_STEPS = [
  'video', // Add video step at the beginning
  'safety_screening', // Add safety screening after video
  'therapist_matching', // New: therapist matching preference
  'therapist_search', // New: search for specific therapist (conditional)
  'therapist_preferences', // New: matching algorithm preferences (conditional)
  'alcohol_drugs', // New: alcohol and recreational drugs screening
  'phq9', // PHQ-9 depression screening
  'gad7', // GAD-7 anxiety screening
  'matching_complete' // We're about to match you screen
] as const;

type SurveyStep = typeof SURVEY_STEPS[number];

// Banner slogans (kept small-size via CSS on each usage)
const SLOGANS = [
  "CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN",
  "YOU ARE EXACTLY WHERE YOU NEED TO BE",
];
function getSlogan(key: string): string {
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % 997;
  return SLOGANS[sum % SLOGANS.length];
}

export default function CustomSurvey({ paymentType, formData, existingUserData, onSubmit, onBack }: CustomSurveyProps) {
  const [currentStep, setCurrentStep] = useState<SurveyStep>(
    existingUserData ? 'therapist_preferences' : 'video'
  );
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  
  // Safety screening modal states
  const [showWhyWeAskModal, setShowWhyWeAskModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  
  // Therapist search (debounced autocomplete)
  const {
    searchQuery: therapistSearchQuery,
    setSearchQuery: setTherapistSearchQuery,
    searchResults: therapistSearchResults,
    isSearching: isSearchingTherapists,
    searchError: therapistSearchError,
  } = useTherapistSearch({ paymentType, clientState: formData.state || '' });
  
  // Alcohol and drugs section (no carousel)
  
  // PHQ-9 carousel state  
  const [phq9CarouselIndex, setPhq9CarouselIndex] = useState(0);
  const [phq9IsTransitioning, setPhq9IsTransitioning] = useState(false);
  
  // GAD-7 carousel state
  const [gad7CarouselIndex, setGad7CarouselIndex] = useState(0);
  const [gad7IsTransitioning, setGad7IsTransitioning] = useState(false);
  
  // Section intro videos
  const [showPhq9Intro, setShowPhq9Intro] = useState(true);
  const [phq9IntroEnded, setPhq9IntroEnded] = useState(false);
  const [showGad7Intro, setShowGad7Intro] = useState(true);
  const [gad7IntroEnded, setGad7IntroEnded] = useState(false);
  
  // Intro video early-continue flags
  const [phq9IntroTimerReady, setPhq9IntroTimerReady] = useState(false);
  const [gad7IntroTimerReady, setGad7IntroTimerReady] = useState(false);
  
  // Video loading states for bloom animation
  const [phq9VideoLoaded, setPhq9VideoLoaded] = useState(false);
  const [gad7VideoLoaded, setGad7VideoLoaded] = useState(false);
  
  const [surveyData, setSurveyData] = useState<SurveyData>({
    // Safety Screening
    safety_screening: existingUserData?.safety_screening || '',
    
    // Therapist Matching - preserve existing preferences
    matching_preference: existingUserData?.matching_preference || '',
    selected_therapist: existingUserData?.selected_therapist?.name || '',
    selected_therapist_email: existingUserData?.selected_therapist?.email || '',
    
    // Therapist Preferences - preserve existing preferences
    therapist_gender_preference: existingUserData?.therapist_gender_preference || '',
    therapist_specialization: existingUserData?.therapist_specialization || [],
    therapist_lived_experiences: existingUserData?.therapist_lived_experiences || [],
    
    // Alcohol and Drugs Screening - preserve existing data
    alcohol_frequency: existingUserData?.alcohol_frequency || '',
    recreational_drugs_frequency: existingUserData?.recreational_drugs_frequency || '',
    
    // Pre-fill from form data or existing data
    first_name: existingUserData?.first_name || formData.firstName,
    last_name: existingUserData?.last_name || formData.lastName,
    email: existingUserData?.email || formData.email,
    preferred_name: existingUserData?.preferred_name || formData.preferredName || formData.firstName,
    phone: existingUserData?.phone || '',
    age: existingUserData?.age || '',
    date_of_birth: existingUserData?.date_of_birth || formData.dateOfBirth || '',
    gender: existingUserData?.gender || '',
    state: existingUserData?.state || formData.state || '',
    race_ethnicity: existingUserData?.race_ethnicity || [],
    
    // Mental health screening - preserve existing data
    pleasure_doing_things: existingUserData?.phq9_scores?.pleasure_doing_things || '',
    feeling_down: existingUserData?.phq9_scores?.feeling_down || '',
    trouble_falling: existingUserData?.phq9_scores?.trouble_falling || '',
    feeling_tired: existingUserData?.phq9_scores?.feeling_tired || '',
    poor_appetite: existingUserData?.phq9_scores?.poor_appetite || '',
    feeling_bad_about_yourself: existingUserData?.phq9_scores?.feeling_bad_about_yourself || '',
    trouble_concentrating: existingUserData?.phq9_scores?.trouble_concentrating || '',
    moving_or_speaking_so_slowly: existingUserData?.phq9_scores?.moving_or_speaking_so_slowly || '',
    suicidal_thoughts: existingUserData?.phq9_scores?.suicidal_thoughts || '',
    feeling_nervous: existingUserData?.gad7_scores?.feeling_nervous || '',
    not_control_worrying: existingUserData?.gad7_scores?.not_control_worrying || '',
    worrying_too_much: existingUserData?.gad7_scores?.worrying_too_much || '',
    trouble_relaxing: existingUserData?.gad7_scores?.trouble_relaxing || '',
    being_so_restless: existingUserData?.gad7_scores?.being_so_restless || '',
    easily_annoyed: existingUserData?.gad7_scores?.easily_annoyed || '',
    feeling_afraid: existingUserData?.gad7_scores?.feeling_afraid || '',
    lived_experiences: existingUserData?.lived_experiences || [],
    university: existingUserData?.university || '',
    referred_by: existingUserData?.referred_by || '',
    
    // Terms and Conditions
    terms_accepted: false
  });

  // Detect viewport orientation and screen type
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = height / width;
      
      setIsPortrait(aspectRatio > 1);
      setIsWideScreen(width > 1024);
      
      if (width < 768 && aspectRatio > 1) {
        setScreenType('mobile');
      } else if (aspectRatio > 1) {
        setScreenType('tablet');
      } else {
        setScreenType('desktop');
      }
      setScreenReady(true);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const updateSurveyData = (field: keyof SurveyData, value: string | string[]) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const handleVideoContinue = () => {
    setCurrentStep('safety_screening');
  };

  const handleSafetyResponse = (response: 'yes' | 'no') => {
    updateSurveyData('safety_screening', response);
    if (response === 'yes') {
      setShowReferralModal(true);
    } else {
      setCurrentStep('therapist_matching');
    }
  };

  const handleMatchingPreference = (preference: 'match_me' | 'requesting_specific') => {
    updateSurveyData('matching_preference', preference);
    if (preference === 'requesting_specific') {
      setCurrentStep('therapist_search');
    } else {
      setCurrentStep('therapist_preferences');
    }
  };

  const toggleSpecialization = (specialization: string) => {
    const current = surveyData.therapist_specialization;
    if (current.includes(specialization)) {
      updateSurveyData('therapist_specialization', current.filter(s => s !== specialization));
    } else {
      updateSurveyData('therapist_specialization', [...current, specialization]);
    }
  };

  const toggleLivedExperience = (experience: string) => {
    const current = surveyData.therapist_lived_experiences;
    if (current.includes(experience)) {
      updateSurveyData('therapist_lived_experiences', current.filter(e => e !== experience));
    } else {
      updateSurveyData('therapist_lived_experiences', [...current, experience]);
    }
  };

  const currentStepIndex = SURVEY_STEPS.indexOf(currentStep);
  const totalSteps = SURVEY_STEPS.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Required fields validation for matching_complete screen
  const isMatchingCompleteValid = () => {
    const hasFirst = (surveyData.preferred_name || '').trim().length > 0;
    const hasLast = (surveyData.last_name || '').trim().length > 0;
    const hasPhone = (surveyData.phone || '').trim().length > 0;
    const hasGender = (surveyData.gender || '').trim().length > 0;
    const hasDob = (surveyData.date_of_birth || '').trim().length > 0;
    const hasRace = (surveyData.race_ethnicity || []).length > 0;
    const hasTermsAccepted = surveyData.terms_accepted;
    return hasFirst && hasLast && hasPhone && hasGender && hasDob && hasRace && hasTermsAccepted;
  };

  const scaleOptions = [
    'Not at all',
    'Several days',
    'More than half the days',
    'Nearly every day'
  ];

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < totalSteps) {
      setCurrentStep(SURVEY_STEPS[nextIndex]);
    } else {
      // Submit survey
      onSubmit(surveyData);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(SURVEY_STEPS[prevIndex]);
    } else {
      onBack();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'video':
        if (!screenReady) {
          return (
            <div className="h-[100svh] relative overflow-hidden bg-black" />
          );
        }
        // Mobile portrait layout - 9:16 video full screen
        if (screenType === 'mobile') {
          return (
            <div className="h-[100svh] relative overflow-hidden bg-black">
              <video 
                className="absolute inset-0 w-full h-full object-cover object-bottom"
                autoPlay 
                muted 
                loop 
                playsInline
                preload="auto"
              >
                <source src={VIDEOS.howItWorks9x16} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8">
                <Button
                    onClick={handleVideoContinue}
                    className="w-full py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-colors"
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
            <div className="h-[100svh] flex flex-row" style={{ backgroundColor: '#FFFAEE' }}>
              <div className="relative overflow-hidden" style={{ width: '56.25vh', backgroundColor: '#FFFAEE' }}>
                <video 
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  preload="auto"
                >
                  <source src={VIDEOS.howItWorks9x16} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
                <div className="max-w-md w-full space-y-8">
                  <h2 
                    className="text-center text-xl sm:text-2xl md:text-3xl text-gray-800"
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      lineHeight: '1.1'
                    }}
                  >
                    How It Works
                  </h2>
                  
                  <Button
                    onClick={handleVideoContinue}
                    className="w-full py-5 px-8 bg-transparent border-2 border-gray-300 rounded-lg text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-colors"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        // Desktop landscape - For very narrow desktop windows (< 1024px width), use vertical stack
        if (isWideScreen === false && screenType === 'desktop') {
          return (
            <div className="h-[100svh] flex flex-col" style={{ backgroundColor: '#FFFAEE' }}>
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
                  <source src={VIDEOS.howItWorks16x9} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Content below - minimal space */}
              <div className="flex-1 flex flex-col justify-center items-center px-8 py-8 lg:py-10 min-h-[200px] max-h-[300px]">
                <div className="max-w-2xl w-full space-y-6">
                  <h2 
                    className="text-center text-xl sm:text-2xl md:text-3xl text-gray-800"
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      lineHeight: '1.1'
                    }}
                  >
                    How It Works
                  </h2>
                  
                  <div className="max-w-md mx-auto w-full">
                    <Button
                      onClick={handleVideoContinue}
                      className="w-full py-4 lg:py-5 px-8 bg-transparent border-2 border-gray-300 rounded-lg text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-colors"
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
          <div className="h-[100svh] flex flex-row" style={{ backgroundColor: '#FFFAEE' }}>
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
                <source src={VIDEOS.howItWorks16x9} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Content section - takes 25% of width */}
            <div className="w-1/4 flex flex-col justify-center items-center px-8 py-12">
              <div className="w-full max-w-sm space-y-6">
                <h2 
                  className="text-center text-2xl sm:text-3xl md:text-4xl text-gray-800"
                  style={{ 
                    fontFamily: 'var(--font-very-vogue), Georgia, serif',
                    lineHeight: '1.1'
                  }}
                >
                  How It Works
                </h2>
                
                <Button
                  onClick={handleVideoContinue}
                  className="w-full py-4 px-6 bg-transparent border-2 border-gray-300 rounded-lg text-gray-800 text-base font-medium hover:bg-[#F5E8D1] transition-colors"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        );

      case 'safety_screening':
        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
            {/* Header with sunset image */}
            <div className="relative h-20 md:h-24 overflow-visible">
              <img 
                src="/onboarding-banner.jpg" 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-xs md:text-sm lg:text-base text-gray-800 font-normal px-4" 
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      lineHeight: '1.1'
                    }}
                    dangerouslySetInnerHTML={{ __html: getSlogan('safety_screening') }}
                />
              </div>
            </div>

            {/* Navigation (no brand) */}
            <div className="flex items-center justify-between px-4 py-3 sm:py-4 flex-shrink-0">
              <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 min-h-0">
              <div className="w-full max-w-md mx-auto">
                <div className="bg-transparent border border-[#5C3106] rounded-3xl p-6 sm:p-8 shadow-[1px_1px_0_#5C3106]">
                  <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl md:text-3xl mb-4 sm:mb-6 text-gray-800 leading-[1.1]" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Over the past 2 weeks, have you been actively suicidal or homicidal OR have you been experiencing hallucinations or delusions?
                    </h1>
                    
                    <button
                      onClick={() => setShowWhyWeAskModal(true)}
                      className="text-gray-500 text-xs sm:text-sm underline hover:text-gray-700 transition-colors"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      Learn about why we ask this
                    </button>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <button
                      onClick={() => handleSafetyResponse('yes')}
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border border-[#5C3106] rounded-2xl text-gray-800 text-base sm:text-lg font-medium hover:bg-[#F5E8D1] transition-colors shadow-[1px_1px_0_#5C3106]"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      Yes
                    </button>

                    <button
                      onClick={() => handleSafetyResponse('no')}
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border border-[#5C3106] rounded-2xl text-gray-800 text-base sm:text-lg font-medium hover:bg-[#F5E8D1] transition-colors shadow-[1px_1px_0_#5C3106]"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'therapist_matching':
        return (
          <div className="h-full flex flex-col"
          >
            {/* Header with sunset image */}
            <div className="relative h-20 md:h-24 overflow-visible">
              <img 
                src="/onboarding-banner.jpg" 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl text-gray-800 font-normal px-4" 
                     style={{ 
                       fontFamily: 'var(--font-very-vogue), Georgia, serif',
                       fontWeight: 400,
                       letterSpacing: '0.02em',
                       lineHeight: '1.1'
                     }}>
                  CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
                </p>
              </div>
            </div>

            {/* Navigation (no brand) */}
            <div className="flex items-center justify-between px-4 py-3 sm:py-4 flex-shrink-0">
              <button onClick={() => setCurrentStep('safety_screening')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 min-h-0">
              <div className="w-full max-w-md mx-auto">
                <div className="bg-transparent border border-[#5C3106] rounded-3xl p-6 sm:p-8 shadow-[1px_1px_0_#5C3106] space-y-6">
                  <div className="text-center space-y-4">
                    <h1 className="text-xl sm:text-2xl md:text-3xl text-gray-800 leading-tight"
                         style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                       Would you like to be matched with a therapist, or are you requesting someone specific?
                     </h1>
                    <p className="text-gray-500 text-base sm:text-lg" style={{ fontFamily: 'var(--font-inter)' }}>
                      Browse our Clinical Team{' '}
                      <a href="https://www.solhealth.co/providers" className="underline" target="_blank" rel="noreferrer">
                        here
                      </a>.
                    </p>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <button
                      onClick={() => handleMatchingPreference('match_me')}
                      onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                      onTouchEnd={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                      className="relative w-full py-3 sm:py-4 px-6 bg-white border border-[#5C3106] rounded-2xl text-gray-800 text-base sm:text-lg font-medium md:hover:bg-[#F5E8D1] transition-colors shadow-[1px_1px_0_#5C3106] flex items-center justify-center"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      <span className="absolute left-4 sm:left-5">🪄</span>
                      <span className="px-6 text-center">Match me to my best-fit therapist</span>
                    </button>

                    <button
                      onClick={() => handleMatchingPreference('requesting_specific')}
                      onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                      onTouchEnd={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                      className="relative w-full py-3 sm:py-4 px-6 bg-white border border-[#5C3106] rounded-2xl text-gray-800 text-base sm:text-lg font-medium md:hover:bg-[#F5E8D1] transition-colors shadow-[1px_1px_0_#5C3106] flex items-center justify-center"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      <span className="absolute left-4 sm:left-5">🎯</span>
                      <span className="px-6 text-center">I'm requesting someone specific</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'therapist_search':
        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
            {/* Header with sunset image */}
            <div className="relative h-20 md:h-24 overflow-visible">
              <img 
                src="/onboarding-banner.jpg" 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-xs md:text-sm lg:text-base text-gray-800 font-normal px-4" 
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      lineHeight: '1.1'
                    }}
                    dangerouslySetInnerHTML={{ __html: getSlogan('therapist_search') }}
                />
              </div>
            </div>

            {/* Navigation (no brand) */}
            <div className="flex items-center justify-between px-4 py-3 sm:py-4 flex-shrink-0">
              <button onClick={() => setCurrentStep('therapist_matching')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-8 min-h-0">
              <div className="w-full max-w-md mx-auto border border-[#5C3106] rounded-3xl p-6 sm:p-8 shadow-[1px_1px_0_#5C3106] bg-transparent space-y-6">
                <div className="text-center space-y-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl text-gray-800" 
                      style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                    Search for Your Therapist
                  </h1>
                  <p className="text-gray-600 text-xs sm:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                    {paymentType === 'cash_pay' 
                      ? 'Search our graduate therapists available for $30/session'
                      : 'Search our associate therapists available through insurance'
                    }
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                  <input
                    type="text"
                    value={therapistSearchQuery}
                    onChange={(e) => setTherapistSearchQuery(e.target.value)}
                    placeholder="Start typing therapist name..."
                    className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg shadow-[1px_1px_0_#5C3106]"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  />
                </div>

                {/* Search Results */}
                {therapistSearchQuery && (
                  <div className="bg-white border-2 border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {isSearchingTherapists && (
                      <div className="p-3 text-sm text-gray-500">Searching…</div>
                    )}
                    {therapistSearchError && !isSearchingTherapists && (
                      <div className="p-3 text-sm text-red-600">{therapistSearchError}</div>
                    )}
                    {!isSearchingTherapists && !therapistSearchError && therapistSearchResults.map((therapist) => (
                      <div
                        key={therapist.id}
                        onClick={() => {
                          updateSurveyData('selected_therapist', therapist.name);
                          updateSurveyData('selected_therapist_email', therapist.email);
                          setCurrentStep('alcohol_drugs');
                        }}
                        className="p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                      >
                        <p className="font-medium">{therapist.name}</p>
                        <p className="text-sm text-gray-600">
                          {paymentType === 'cash_pay' ? 'Graduate Therapist' : 'Associate Therapist'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'therapist_preferences':
        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
            {/* Header with sunset image */}
            <div className="relative h-20 md:h-24 overflow-visible">
              <img 
                src="/onboarding-banner.jpg" 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-xs md:text-sm lg:text-base text-gray-800 font-normal px-4" 
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      lineHeight: '1.1'
                    }}
                    dangerouslySetInnerHTML={{ __html: getSlogan('therapist_preferences') }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-3 sm:py-4 flex-shrink-0">
              <button onClick={() => setCurrentStep('therapist_matching')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 sm:px-6 pb-10 sm:pb-14 min-h-0">
              <div className="flow-narrow mx-auto -mt-4">
                <div className="text-center mb-4 sm:mb-6 mt-2 flow-narrow mx-auto">
                  <h1 className="text-xl sm:text-2xl md:text-3xl mb-3 sm:mb-4 text-gray-800" 
                      style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                    Therapist Preferences
                  </h1>
                </div>

                {/* Therapist Specializations */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    I would like a therapist that specializes in:
                  </h3>
                  <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 items-center">
                    {[
                      { name: 'ADHD', emoji: '🌀' },
                      { name: 'Anxiety', emoji: '🌊' },
                      { name: 'Body image', emoji: '🪞' },
                      { name: 'Building confidence', emoji: '🌱' },
                      { name: 'Career/academic stress', emoji: '📚' },
                      { name: 'Depression', emoji: '☁️' },
                      { name: 'Eating disorders', emoji: '🌾' },
                      { name: 'Emotional regulation', emoji: '🌊' },
                      { name: 'Family life', emoji: '🏡' },
                      { name: 'Grief and loss', emoji: '🍂' },
                      { name: 'LGBTQ+ identity', emoji: '🏳️‍🌈' },
                      { name: 'Life transitions', emoji: '🦋' },
                      { name: 'Loneliness', emoji: '🌙' },
                      { name: 'OCD', emoji: '🐾' },
                      { name: 'Panic attacks', emoji: '🫧' },
                      { name: 'Phobias', emoji: '⛰️' },
                      { name: 'PTSD', emoji: '🌫️' },
                      { name: 'Relationship challenges', emoji: '🌻' },
                      { name: 'Stress and burnout', emoji: '🪫' },
                      { name: 'Trauma', emoji: '🕊️' }
                    ].map((specialization) => {
                      const isSelected = surveyData.therapist_specialization.includes(specialization.name);
                      return (
                        <button
                          key={specialization.name}
                          onClick={() => toggleSpecialization(specialization.name)}
                          className={`relative h-9 sm:h-10 px-7 sm:px-8 rounded-xl text-[11px] sm:text-xs transition-colors inline-flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#5C3106] text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          <span className="absolute left-2 sm:left-3 text-base sm:text-lg leading-none">{specialization.emoji}</span>
                          <span className="text-center truncate whitespace-nowrap leading-none px-2">
                            {specialization.name}
                          </span>
                          <Plus 
                            className={`absolute right-2 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
                              isSelected ? 'rotate-45' : ''
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gender Preference */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    I would like a therapist that identifies as <span className="text-red-500">*</span>
                  </h3>
                  <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {[
                      { name: 'Female', emoji: '👩' },
                      { name: 'Male', emoji: '👨' },
                      { name: 'No preference', emoji: '⭐' }
                    ].map((gender) => (
                      <button
                        key={gender.name}
                        onClick={() => updateSurveyData('therapist_gender_preference', gender.name)}
                        className={`h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl transition-colors text-[11px] sm:text-xs inline-flex items-center justify-center ${
                          surveyData.therapist_gender_preference === gender.name
                            ? 'bg-[#5C3106] text-white'
                            : `bg-white border-2 text-gray-800 hover:bg-gray-50 ${surveyData.therapist_gender_preference === '' ? 'border-red-300' : 'border-gray-300'}`
                        }`}
                        style={{ fontFamily: 'var(--font-inter)' }}
                      >
                        <div className="grid grid-cols-[20px,auto,20px] items-center gap-2">
                          <span className="text-base sm:text-lg leading-none">{gender.emoji}</span>
                          <span className="text-center leading-none">{gender.name}</span>
                          <span />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lived Experiences */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    Are there any lived experiences you identify with that you feel are important to your match?
                  </h3>
                  
                  <div className="space-y-4 sm:space-y-6">
                    {/* Family */}
                    <div>
                      <h4 className="text-center font-medium text-gray-600 mb-2 sm:mb-3 text-base sm:text-lg" style={{ fontFamily: 'var(--font-inter)' }}>
                        Family
                      </h4>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 items-center">
                        {[
                          { name: 'Raised in a non-traditional family', emoji: '🌿' },
                          { name: 'Been in a caretaker role', emoji: '👤' },
                          { name: 'Have children', emoji: '🧡' }
                        ].map((experience) => {
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience.name);
                          return (
                            <button
                              key={experience.name}
                              onClick={() => toggleLivedExperience(experience.name)}
                              className={`relative h-9 sm:h-10 px-7 sm:px-8 rounded-xl text-[11px] sm:text-xs transition-colors inline-flex items-center justify-center ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span className="absolute left-2 sm:left-3 text-base sm:text-lg leading-none">{experience.emoji}</span>
                              <span className="text-center truncate whitespace-nowrap leading-none px-2">{experience.name}</span>
                              <Plus 
                                className={`absolute right-2 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
                                  isSelected ? 'rotate-45' : ''
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Upbringing */}
                    <div>
                      <h4 className="text-center font-medium text-gray-600 mb-2 sm:mb-3 text-base sm:text-lg" style={{ fontFamily: 'var(--font-inter)' }}>
                        Upbringing
                      </h4>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 items-center">
                        {[
                          { name: 'Raised in an individualist culture', emoji: '🧍' },
                          { name: 'Raised in a collectivist culture', emoji: '🤝' },
                          { name: 'Lived in many places', emoji: '🗺️' },
                          { name: 'First/second generation immigrant', emoji: '🌎' }
                        ].map((experience) => {
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience.name);
                          return (
                            <button
                              key={experience.name}
                              onClick={() => toggleLivedExperience(experience.name)}
                              className={`relative h-9 sm:h-10 px-7 sm:px-8 rounded-xl text-[11px] sm:text-xs transition-colors inline-flex items-center justify-center ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span className="absolute left-2 sm:left-3 text-base sm:text-lg leading-none">{experience.emoji}</span>
                              <span className="text-center truncate whitespace-nowrap leading-none px-2">{experience.name}</span>
                              <Plus 
                                className={`absolute right-2 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
                                  isSelected ? 'rotate-45' : ''
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Identity and Experiences */}
                    <div>
                      <h4 className="text-center font-medium text-gray-600 mb-2 sm:mb-3 text-base sm:text-lg" style={{ fontFamily: 'var(--font-inter)' }}>
                        Identity and Experiences
                      </h4>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 items-center">
                        {[
                          { name: 'Identifying as LGBTQ+', emoji: '🏳️‍🌈' },
                          { name: 'Negatively affected by social media', emoji: '📱' }
                        ].map((experience) => {
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience.name);
                          return (
                            <button
                              key={experience.name}
                              onClick={() => toggleLivedExperience(experience.name)}
                              className={`relative h-9 sm:h-10 px-7 sm:px-8 rounded-xl text-[11px] sm:text-xs transition-colors inline-flex items-center justify-center ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span className="absolute left-2 sm:left-3 text-base sm:text-lg leading-none">{experience.emoji}</span>
                              <span className="text-center truncate whitespace-nowrap leading-none px-2">{experience.name}</span>
                              <Plus 
                                className={`absolute right-2 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
                                  isSelected ? 'rotate-45' : ''
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="pointer-events-none">
                  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 transform z-20">
                    <Button
                      onClick={() => setCurrentStep('alcohol_drugs')}
                      className="pointer-events-auto bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full text-sm md:text-base font-medium transition-colors px-5 md:px-6 py-2 md:py-2.5 shadow-[1px_1px_0_#5C3106] border border-[#5C3106]"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'alcohol_drugs':
        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
            {/* Header with sunset image */}
            <div className="relative h-20 md:h-24 overflow-visible">
              <img 
                src="/onboarding-banner.jpg" 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal px-4" 
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      lineHeight: '1.1'
                    }}>
                  CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0">
              <button 
                onClick={() => setCurrentStep('therapist_preferences')} 
                className="p-1.5 sm:p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div></div>
              <div className="w-8"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex-1 flex items-center justify-center">
                <div className="max-w-md w-full">
                  <div className="text-center mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-3 text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Alcohol and Recreational Drugs
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm italic px-4" style={{ fontFamily: 'var(--font-inter)' }}>
                      Disclaimer: Your information is confidential and used only for assessment and treatment.
                    </p>
                  </div>

                  {/* Stacked Questions */}
                  <div className="bg-transparent border border-[#5C3106] rounded-3xl p-6 sm:p-8 shadow-[1px_1px_0_#5C3106] space-y-6">
                    {/* Alcohol */}
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl text-gray-800 leading-[1.1] px-2 mb-4" 
                          style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                        Do you drink alcohol? If yes, how often per week?
                      </h2>
                      <div className="space-y-3 sm:space-y-4">
                        {['Not at all','Several days','More than half the days','Nearly every day'].map((option) => {
                          const isSelected = surveyData.alcohol_frequency === option;
                          return (
                            <button
                              key={option}
                              onClick={() => {
                                updateSurveyData('alcohol_frequency', option);
                              }}
                              className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl text-sm sm:text-base font-medium transition-colors shadow-[1px_1px_0_#5C3106] ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white border border-[#5C3106]'
                                  : 'bg-white border border-[#5C3106] text-gray-800 hover:bg-[#F5E8D1]'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recreational Drugs */}
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl text-gray-800 leading-[1.1] px-2 mb-4" 
                          style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                        Do you use recreational drugs? If yes, how often per week?
                      </h2>
                      <div className="space-y-3 sm:space-y-4">
                        {['Not at all','Several days','More than half the days','Nearly every day'].map((option) => {
                          const isSelected = surveyData.recreational_drugs_frequency === option;
                          return (
                            <button
                              key={option}
                              onClick={() => {
                                updateSurveyData('recreational_drugs_frequency', option);
                              }}
                              className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl text-sm sm:text-base font-medium transition-colors shadow-[1px_1px_0_#5C3106] ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white border border-[#5C3106]'
                                  : 'bg-white border border-[#5C3106] text-gray-800 hover:bg-[#F5E8D1]'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              {surveyData.alcohol_frequency && surveyData.recreational_drugs_frequency && (
                <div className="pt-6 flex justify-center">
                  <Button
                    onClick={() => {
                      setShowPhq9Intro(true);
                      setPhq9IntroEnded(false);
                      setCurrentStep('phq9');
                    }}
                    className="max-w-md py-4 px-6 bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full text-base font-medium transition-colors shadow-[1px_1px_0_#5C3106] border border-[#5C3106] min-w-[200px]"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Continue →
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'phq9':
        const phq9Questions = [
          {
            question: "Little interest or pleasure in doing things",
            field: 'pleasure_doing_things' as keyof SurveyData
          },
          {
            question: "Feeling down, depressed, or hopeless",
            field: 'feeling_down' as keyof SurveyData
          },
          {
            question: "Trouble falling or staying asleep, or sleeping too much",
            field: 'trouble_falling' as keyof SurveyData
          },
          {
            question: "Feeling tired or having little energy",
            field: 'feeling_tired' as keyof SurveyData
          },
          {
            question: "Poor appetite or overeating",
            field: 'poor_appetite' as keyof SurveyData
          },
          {
            question: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
            field: 'feeling_bad_about_yourself' as keyof SurveyData
          },
          {
            question: "Trouble concentrating on things, such as reading the newspaper or watching television",
            field: 'trouble_concentrating' as keyof SurveyData
          },
          {
            question: "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
            field: 'moving_or_speaking_so_slowly' as keyof SurveyData
          },
          {
            question: "Thoughts that you would be better off dead, or of hurting yourself",
            field: 'suicidal_thoughts' as keyof SurveyData
          }
        ];
 
        const currentPhq9Question = phq9Questions[phq9CarouselIndex];
        const isLastPhq9Question = phq9CarouselIndex === phq9Questions.length - 1;
        const canContinuePhq9 = phq9Questions.every(q => surveyData[q.field]);

        if (showPhq9Intro) {
          return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
              <div className="relative h-20 md:h-24 overflow-visible">
                <img src="/onboarding-banner.jpg" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              </div>
              <div className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0">
                <button 
                  onClick={() => setCurrentStep('alcohol_drugs')} 
                  className="p-1.5 sm:p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </button>
                <div className="w-8"></div>
              </div>

              <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-8 sm:pt-12 pb-2 sm:pb-4">
                <div className="max-w-sm w-full">
                  {/* PHQ-9 Square Video Container */}
                  <div className="relative border border-[#5C3106] rounded-3xl p-0 shadow-[1px_1px_0_#5C3106] overflow-hidden bg-white aspect-square">
                    {/* White background that shows while video loads */}
                    <div className={`absolute inset-0 bg-white transition-opacity duration-600 z-0 ${phq9VideoLoaded ? 'opacity-0' : 'opacity-100'}`} />
                    
                    <video
                      className={`w-full h-full object-cover transition-opacity duration-600 relative ${phq9VideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                      style={{ zIndex: 1 }}
                      src={VIDEOS.emotionalWellBeing}
                      autoPlay
                      muted
                      playsInline
                      loop={false}
                      controls={false}
                      preload="metadata"
                      onLoadedData={() => setPhq9VideoLoaded(true)}
                      onCanPlayThrough={() => setPhq9VideoLoaded(true)}
                      onPlay={() => {
                        setPhq9IntroTimerReady(false);
                        setTimeout(() => setPhq9IntroTimerReady(true), 2500);
                        // Hard fallback to enable continue even if onEnded doesn't fire
                        setTimeout(() => setPhq9IntroEnded(true), 8000);
                      }}
                      onEnded={(e) => {
                        setPhq9IntroEnded(true);
                       }}
                      onError={() => {
                        console.warn('PHQ-9 video load error');
                        setPhq9VideoLoaded(true); // Continue anyway
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-3 flex justify-center z-10 pointer-events-none">
                      <Button
                        onClick={() => setShowPhq9Intro(false)}
                        className="py-2 sm:py-2.5 px-5 rounded-full text-base sm:text-lg bg-white/90 hover:bg-white text-gray-800 shadow-lg pointer-events-auto"
                         style={{ fontFamily: 'var(--font-inter)', zIndex: 20 }}
                       >
                         Continue
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
            {/* Header with sunset image - smaller for mobile */}
            <div className="relative h-20 md:h-24 overflow-visible">
              <img 
                src="/onboarding-banner.jpg" 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal px-4" 
                    style={{ 
                      fontFamily: 'var(--font-very-vogue), Georgia, serif',
                      fontWeight: 400,
                      letterSpacing: '0.02em',
                      lineHeight: '1.1'
                    }}
                    dangerouslySetInnerHTML={{ __html: getSlogan('phq9') }}
                />
              </div>
            </div>
 
            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0">
              <button 
                onClick={() => {
                  if (showPhq9Intro) {
                    setCurrentStep('alcohol_drugs');
                  } else if (phq9CarouselIndex > 0) {
                    setPhq9CarouselIndex(phq9CarouselIndex - 1);
                  } else {
                    setCurrentStep('alcohol_drugs');
                  }
                }} 
                className="p-1.5 sm:p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="w-8"></div>
            </div>
 
            {/* Content */}
            <div className="flex-1 flex flex-col justify-between px-4 sm:px-6 pt-4 sm:pt-8 pb-6 sm:pb-8">
              <div className="flex-1 flex items-start justify-center">
                <div className="max-w-md w-full">
                  <div className="text-center mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-3 text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Over the last 2 weeks, how often have you been bothered by any of the following?
                    </h1>
                  </div>

                  <div className="bg-transparent border border-[#5C3106] rounded-3xl p-6 sm:p-8 shadow-[1px_1px_0_#5C3106] w-full max-w-md mx-auto">
                    <div key={phq9CarouselIndex} className={`text-center mb-6 sm:mb-8 ${phq9IsTransitioning ? 'animate-question-exit' : 'animate-question'}`}>
                      {/* Question */}
                      <div className="mb-4 sm:mb-5">
                        <p className="text-lg sm:text-xl md:text-2xl text-gray-800 leading-[1.1] px-2" style={{ fontFamily: 'var(--font-inter)' }}>
                          {currentPhq9Question.question}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {scaleOptions.map((option) => {
                        const isSelected = surveyData[currentPhq9Question.field] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => {
                              updateSurveyData(currentPhq9Question.field, option);
                              if (isLastPhq9Question) {
                                const allAnsweredAfterSelect = phq9Questions.every((q) => {
                                  const val = q.field === currentPhq9Question.field ? option : surveyData[q.field];
                                  return Boolean(val);
                                });
                                if (allAnsweredAfterSelect) {
                                  setShowGad7Intro(true);
                                  setGad7IntroEnded(false);
                                  setCurrentStep('gad7');
                                }
                              } else {
                                // Smooth transition to next question
                                setPhq9IsTransitioning(true);
                                setTimeout(() => {
                                  setPhq9CarouselIndex(phq9CarouselIndex + 1);
                                  setPhq9IsTransitioning(false);
                                }, 180);
                              }
                            }}
                            onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                            onTouchEnd={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                            className={`w-full max-w-sm mx-auto py-2.5 sm:py-3 px-4 rounded-2xl text-base sm:text-lg font-medium transition-colors shadow-[1px_1px_0_#5C3106] ${
                              isSelected
                                ? 'bg-[#5C3106] text-white border border-[#5C3106]'
                                : 'bg-white border border-[#5C3106] text-gray-800 md:hover:bg-[#F5E8D1]'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {/* Progress and back arrow inside box */}
                    <div className="mt-6 sm:mt-8">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <button
                          onClick={() => phq9CarouselIndex > 0 ? setPhq9CarouselIndex(phq9CarouselIndex - 1) : setCurrentStep('alcohol_drugs')}
                          className="p-2 rounded-full hover:bg-gray-100"
                          aria-label="Previous"
                        >
                          <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        {phq9Questions.map((_, index) => (
                          <div
                            key={index}
                            className={`h-0.5 transition-all duration-300 ${
                              index === phq9CarouselIndex ? 'w-8 bg-[#5C3106]' : 'w-6 bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation removed to mirror GAD-7 layout */}
            </div>
          </div>
        );

     case 'gad7':
       const gad7Questions = [
         {
           question: "Feeling nervous, anxious, or on edge",
           field: 'feeling_nervous' as keyof SurveyData
         },
         {
           question: "Not being able to stop or control worrying",
           field: 'not_control_worrying' as keyof SurveyData
         },
         {
           question: "Worrying too much about different things",
           field: 'worrying_too_much' as keyof SurveyData
         },
         {
           question: "Trouble relaxing",
           field: 'trouble_relaxing' as keyof SurveyData
         },
         {
           question: "Being so restless that it is hard to sit still",
           field: 'being_so_restless' as keyof SurveyData
         },
         {
           question: "Becoming easily annoyed or irritable",
           field: 'easily_annoyed' as keyof SurveyData
         },
         {
           question: "Feeling afraid, as if something awful might happen",
           field: 'feeling_afraid' as keyof SurveyData
         }
       ];

       const currentGad7Question = gad7Questions[gad7CarouselIndex];
       const isLastGad7Question = gad7CarouselIndex === gad7Questions.length - 1;
       const canContinueGad7 = gad7Questions.every(q => surveyData[q.field]);

       if (showGad7Intro) {
         return (
           <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
             <div className="relative h-20 md:h-24 overflow-visible">
               <img src="/onboarding-banner.jpg" alt="" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
             </div>
             <div className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0">
               <button 
                 onClick={() => setCurrentStep('phq9')} 
                 className="p-1.5 sm:p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
               >
                 <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
               </button>
               <div className="w-8"></div>
             </div>

             <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-8 sm:pt-12 pb-2 sm:pb-4">
               <div className="max-w-sm w-full">
                 {/* GAD-7 Square Video Container */}
                 <div className="relative border border-[#5C3106] rounded-3xl p-0 shadow-[1px_1px_0_#5C3106] overflow-hidden bg-white aspect-square">
                   {/* White background that shows while video loads */}
                   <div className={`absolute inset-0 bg-white transition-opacity duration-600 z-0 ${gad7VideoLoaded ? 'opacity-0' : 'opacity-100'}`} />
                   
                   <video
                     className={`w-full h-full object-cover transition-opacity duration-600 relative ${gad7VideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                     style={{ zIndex: 1 }}
                     src={VIDEOS.measuringAnxiety}
                     autoPlay
                     muted
                     playsInline
                     loop={false}
                     controls={false}
                     preload="metadata"
                     onLoadedData={() => setGad7VideoLoaded(true)}
                     onCanPlayThrough={() => setGad7VideoLoaded(true)}
                     onPlay={() => {
                       setGad7IntroTimerReady(false);
                       setTimeout(() => setGad7IntroTimerReady(true), 2500);
                       setTimeout(() => setGad7IntroEnded(true), 8000);
                     }}
                     onEnded={(e) => {
                       setGad7IntroEnded(true);
                       }}
                     onError={() => {
                       console.warn('GAD-7 video load error');
                       setGad7VideoLoaded(true); // Continue anyway
                     }}
                   />
                   <div className="absolute inset-x-0 bottom-3 flex justify-center z-10 pointer-events-none">
                     <Button
                       onClick={() => setShowGad7Intro(false)}
                       className="py-2 sm:py-2.5 px-5 rounded-full text-base sm:text-lg bg-white/90 hover:bg-white text-gray-800 shadow-lg pointer-events-auto"
                         style={{ fontFamily: 'var(--font-inter)', zIndex: 20 }}
                       >
                         Continue
                       </Button>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         );
       }

       return (
         <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
           {/* Header with sunset image - smaller for mobile */}
           <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
             <img 
               src="/onboarding-banner.jpg" 
               alt="" 
               className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <p className="text-center text-xs sm:text-sm md:text-base lg:text-lg text-gray-800 font-normal px-4" 
                   style={{ 
                     fontFamily: 'var(--font-very-vogue), Georgia, serif',
                     fontWeight: 400,
                     letterSpacing: '0.02em',
                     lineHeight: '1.1'
                   }}
                   dangerouslySetInnerHTML={{ __html: getSlogan('gad7') }}
               />
             </div>
           </div>

           {/* Navigation */}
           <div className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0">
                           <button 
                onClick={() => {
                  if (showGad7Intro) {
                    setCurrentStep('phq9');
                  } else if (gad7CarouselIndex > 0) {
                    setGad7CarouselIndex(gad7CarouselIndex - 1);
                  } else {
                    setCurrentStep('phq9');
                  }
                }} 
                className="p-1.5 sm:p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
               <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
             </button>
             <div className="w-8"></div>
           </div>

           {/* Content */}
           <div className="flex-1 flex flex-col justify-between px-4 sm:px-6 pt-4 sm:pt-8 pb-6 sm:pb-8">
             <div className="flex-1 flex items-start justify-center">
               <div className="max-w-md w-full">
                 <div className="text-center mb-4 sm:mb-6">
                   <h1 className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-3 text-gray-800" 
                       style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                     {showGad7Intro ? 'Measuring Anxiety' : 'Over the last 2 weeks, how often have you been bothered by any of the following?'}
                   </h1>
                   {showGad7Intro && (
                     <p className="text-gray-500 text-xs sm:text-sm italic px-4" style={{ fontFamily: 'var(--font-inter)' }}>
                       This may feel like a lot, but this snapshot will help us give you the best care.
                     </p>
                   )}
                 </div>

                 <div className="bg-transparent border border-[#5C3106] rounded-3xl p-6 sm:p-8 shadow-[1px_1px_0_#5C3106] w-full max-w-md mx-auto">
                   <div key={gad7CarouselIndex} className={`text-center mb-6 sm:mb-8 ${gad7IsTransitioning ? 'animate-question-exit' : 'animate-question'}`}>
                     {/* Question */}
                     <div className="mb-4 sm:mb-5">
                       <p className="text-lg sm:text-xl md:text-2xl text-gray-800 leading-[1.1] px-2" style={{ fontFamily: 'var(--font-inter)' }}>
                         {currentGad7Question.question}
                       </p>
                     </div>
                   </div>

                   <div className="space-y-3 sm:space-y-4">
                     {scaleOptions.map((option) => {
                       const isSelected = surveyData[currentGad7Question.field] === option;
                       return (
                         <button
                           key={option}
                           onClick={() => {
                             updateSurveyData(currentGad7Question.field, option);
                             if (isLastGad7Question) {
                               const allAnsweredAfterSelect = gad7Questions.every((q) => {
                                 const val = q.field === currentGad7Question.field ? option : surveyData[q.field];
                                 return Boolean(val);
                               });
                               if (allAnsweredAfterSelect) {
                                 setCurrentStep('matching_complete');
                               }
                             } else {
                               // Smooth transition to next question
                               setGad7IsTransitioning(true);
                               setTimeout(() => {
                                 setGad7CarouselIndex(gad7CarouselIndex + 1);
                                 setGad7IsTransitioning(false);
                               }, 180);
                             }
                           }}
                           onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                           onTouchEnd={(e) => (e.currentTarget as HTMLButtonElement).blur()}
                           className={`w-full max-w-sm mx-auto py-2.5 sm:py-3 px-4 rounded-2xl text-base sm:text-lg font-medium transition-colors shadow-[1px_1px_0_#5C3106] ${
                             isSelected
                               ? 'bg-[#5C3106] text-white border border-[#5C3106]'
                               : 'bg-white border border-[#5C3106] text-gray-800 md:hover:bg-[#F5E8D1]'
                           }`}
                           style={{ fontFamily: 'var(--font-inter)' }}
                         >
                           {option}
                         </button>
                       );
                     })}
                   </div>

                   {/* Progress and back arrow inside box */}
                   <div className="mt-6 sm:mt-8">
                     <div className="flex items-center justify-center space-x-2 mb-2">
                       <button
                         onClick={() => gad7CarouselIndex > 0 ? setGad7CarouselIndex(gad7CarouselIndex - 1) : setCurrentStep('phq9')}
                         className="p-2 rounded-full hover:bg-gray-100"
                         aria-label="Previous"
                       >
                         <ArrowLeft className="w-5 h-5 text-gray-700" />
                       </button>
                       {gad7Questions.map((_, index) => (
                         <div
                           key={index}
                           className={`h-0.5 transition-all duration-300 ${
                             index === gad7CarouselIndex ? 'w-8 bg-[#5C3106]' : 'w-6 bg-gray-300'
                           }`}
                         />
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             {/* Bottom Navigation removed to mirror PHQ-9 layout */}
           </div>
         </div>
       );

     case 'matching_complete':
       // Required validations for subtle red outlines
       const invalidFirst = !(surveyData.preferred_name || '').trim();
       const invalidLast = !(surveyData.last_name || '').trim();
       const invalidPhone = !(surveyData.phone || '').trim();
       const invalidGender = !(surveyData.gender || '').trim();
       const invalidDob = !(surveyData.date_of_birth || '').trim();
       const invalidRace = (surveyData.race_ethnicity || []).length === 0;

       return (
         <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
           {/* Header with sunset image */}
           <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
             <img 
               src="/onboarding-banner.jpg" 
               alt="" 
               className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <p className="text-center text-base sm:text-lg md:text-lg lg:text-xl xl:text-2xl text-gray-800 font-normal px-4" 
                   style={{ 
                     fontFamily: 'var(--font-very-vogue), Georgia, serif',
                     fontWeight: 400,
                     letterSpacing: '0.02em',
                     lineHeight: '1.1'
                   }}>
                 CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
               </p>
             </div>
           </div>

           {/* Navigation (no brand) */}
           <div className="flex items-center justify-between px-4 py-3 sm:py-4 flex-shrink-0">
             <button onClick={() => setCurrentStep('gad7')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
               <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
             </button>
             <div className="w-10"></div>
           </div>

           {/* Content */}
           <div className="flex-1 px-4 sm:px-6 pb-8 sm:pb-16 min-h-0">
             <div className="flow-narrow mx-auto">
               <div className="text-center mb-6 sm:mb-8 mt-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
                   <span className="text-3xl sm:text-4xl">🎉</span>
                 </div>
                 
                 <h1 className="text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6 text-gray-800" 
                     style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                   We're About To Match You!
                 </h1>
                 
                 <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed px-4" style={{ fontFamily: 'var(--font-inter)' }}>
                   Please confirm your account details below.
                 </p>
               </div>

               {/* Basic Information */}
               <div className="mb-6 sm:mb-8">
                 <h2 className="text-lg sm:text-xl font-medium mb-4 sm:mb-6 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                   Basic Information
                 </h2>
                 
                 <div className="space-y-3 sm:space-y-4">
                   {/* First Name */}
                   <div>
                     <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                       First Name
                     </label>
                     <input
                       type="text"
                       value={surveyData.first_name}
                       onChange={(e) => {
                         const inputValue = e.target.value;
                         const formattedName = inputValue ? inputValue.charAt(0).toUpperCase() + inputValue.slice(1) : '';
                         updateSurveyData('first_name', formattedName);
                         // If preferred_name is empty or same as old first_name, update it too
                         if (!surveyData.preferred_name || surveyData.preferred_name === surveyData.first_name) {
                           updateSurveyData('preferred_name', formattedName);
                         }
                       }}
                       className={`w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center shadow-[1px_1px_0_#5C3106] ${invalidFirst ? 'ring-1 ring-red-300 border-red-300' : ''}`}
                       style={{ fontFamily: 'var(--font-inter)' }}
                     />
                     {surveyData.preferred_name && surveyData.preferred_name !== surveyData.first_name && (
                       <p className="text-xs sm:text-sm text-blue-600 mt-1">
                         Your therapist will address you as "{surveyData.preferred_name}"
                       </p>
                     )}
                   </div>

                   {/* Preferred Name (Optional) */}
                   <div>
                     <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                       Preferred Name <span className="text-gray-500">(Optional - if different from first name)</span>
                     </label>
                     <input
                       type="text"
                       value={surveyData.preferred_name || ''}
                       onChange={(e) => {
                         const inputValue = e.target.value;
                         const formattedName = inputValue ? inputValue.charAt(0).toUpperCase() + inputValue.slice(1) : '';
                         updateSurveyData('preferred_name', formattedName || surveyData.first_name);
                       }}
                       placeholder={`Leave empty to use "${surveyData.first_name}"`}
                       className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center"
                       style={{ fontFamily: 'var(--font-inter)' }}
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       How would you like your therapist to address you?
                     </p>
                   </div>

                   {/* Last Name */}
                   <div>
                     <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                       Last Name
                     </label>
                     <input
                       type="text"
                       value={surveyData.last_name}
                       onChange={(e) => {
                         const inputValue = e.target.value;
                         const formattedName = inputValue ? inputValue.charAt(0).toUpperCase() + inputValue.slice(1) : '';
                         updateSurveyData('last_name', formattedName);
                       }}
                       className={`w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center ${invalidLast ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}`}
                       style={{ fontFamily: 'var(--font-inter)' }}
                     />
                   </div>

                   {/* Phone Number */}
                   <div>
                     <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                       Phone Number
                     </label>
                     <input
                       type="tel"
                       value={surveyData.phone || ''}
                       onChange={(e) => updateSurveyData('phone', e.target.value)}
                       placeholder="+11234567890"
                       className={`w-full p-2.5 sm:p-3 border-2 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center ${invalidPhone ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}`}
                       style={{ fontFamily: 'var(--font-inter)' }}
                     />
                   </div>

                   {/* Gender and Age Row */}
                   <div className="grid grid-cols-2 gap-3 sm:gap-4">
                     <div>
                       <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                         Gender
                       </label>
                       <select
                         value={surveyData.gender}
                         onChange={(e) => updateSurveyData('gender', e.target.value)}
                         className={`w-full p-2.5 sm:p-3 border-2 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center ${invalidGender ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}`}
                         style={{ fontFamily: 'var(--font-inter)' }}
                       >
                         <option value="">Select Gender</option>
                         <option value="Female">Female</option>
                         <option value="Male">Male</option>
                         <option value="Non-binary">Non-binary</option>
                         <option value="Prefer not to say">Prefer not to say</option>
                         <option value="Other">Other</option>
                       </select>
                     </div>

                     <div>
                       <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                         Date of Birth
                       </label>
                       <input
                         type="date"
                         value={surveyData.date_of_birth || ''}
                         onChange={(e) => updateSurveyData('date_of_birth', e.target.value)}
                         placeholder={new Date().toISOString().split('T')[0]}
                         className={`w-full p-2.5 sm:p-3 border-2 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center ${invalidDob ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}`}
                         style={{ fontFamily: 'var(--font-inter)' }}
                       />
                     </div>
                   </div>

                   {/* Race/Ethnicity - pill multi-select */}
                   <div>
                     <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                       Race/Ethnicity
                     </label>
                     <div className={`flex flex-wrap gap-2 sm:gap-2.5 rounded-lg ${invalidRace ? 'ring-1 ring-red-300' : ''}`}>
                       {[
                         'Black / African',
                         'Hispanic / Latinx', 
                         'White',
                         'Middle Eastern / North African (MENA)',
                         'East Asian',
                         'South Asian',
                         'Southeast Asian',
                         'Native Hawaiian / Other Pacific Islander',
                         'Indigenous (Native American / Alaska Native / First Nations)',
                         'Prefer not to say'
                       ].map((ethnicity) => {
                         const isSelected = surveyData.race_ethnicity.includes(ethnicity);
                         return (
                           <button
                             key={ethnicity}
                             onClick={() => {
                               const current = surveyData.race_ethnicity;
                               if (isSelected) {
                                 updateSurveyData('race_ethnicity', current.filter(item => item !== ethnicity));
                               } else {
                                 updateSurveyData('race_ethnicity', [...current, ethnicity]);
                               }
                             }}
                             className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-[11px] sm:text-xs transition-colors inline-flex items-center justify-center ${
                               isSelected
                                 ? 'bg-[#5C3106] text-white'
                                 : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                             }`}
                             style={{ fontFamily: 'var(--font-inter)' }}
                           >
                             <span className="text-center whitespace-nowrap leading-none">{ethnicity}</span>
                           </button>
                         );
                       })}
                     </div>
                   </div>

                   {/* School or University */}
                   <div>
                     <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                       School or University
                     </label>
                     <input
                       type="text"
                       value={surveyData.university || ''}
                       onChange={(e) => updateSurveyData('university', e.target.value)}
                       placeholder="Optional"
                       className="w-full p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-base sm:text-lg text-center"
                       style={{ fontFamily: 'var(--font-inter)' }}
                     />
                   </div>
                 </div>
               </div>

               {/* How did you hear about Sol Health - pill multi-select */}
               <div className="mb-6 sm:mb-8">
                 <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                   How did you hear about Sol Health?
                 </h3>
                 <div className="flex flex-wrap gap-2">
                   {[
                     { name: 'Friend/Family', emoji: '👥' },
                     { name: 'In-Person Event', emoji: '🎪' },
                     { name: 'Instagram', emoji: '📷' },
                     { name: 'TikTok', emoji: '🎵' },
                     { name: 'Psychology Today', emoji: '🧠' },
                     { name: 'ZocDoc', emoji: '🩺' },
                     { name: 'Open Path Collective', emoji: '🛤️' },
                     { name: 'MyAtlas', emoji: '🗺️' },
                     { name: 'Referral from healthcare professional', emoji: '👩‍⚕️' },
                     { name: 'Sad Girls Club - Remedy Winner', emoji: '🌙' },
                     { name: 'Flyer', emoji: '📄' },
                     { name: 'Email', emoji: '✉️' },
                     { name: 'Google', emoji: '🔍' }
                   ].map((source) => {
                     const isSelected = (surveyData.referred_by || '') === source.name || Array.isArray(surveyData.referred_by) && (surveyData.referred_by as unknown as string[]).includes(source.name);
                     return (
                       <button
                         key={source.name}
                         onClick={() => {
                           const current = Array.isArray(surveyData.referred_by) ? (surveyData.referred_by as unknown as string[]) : (surveyData.referred_by ? [surveyData.referred_by] : []);
                           if (isSelected) {
                             updateSurveyData('referred_by', current.filter(item => item !== source.name));
                           } else {
                             updateSurveyData('referred_by', [...current, source.name]);
                           }
                         }}
                         className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-full text-xs sm:text-sm transition-all flex items-center ${
                           isSelected
                             ? 'bg-[#5C3106] text-white'
                             : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                         }`}
                         style={{ fontFamily: 'var(--font-inter)' }}
                       >
                         <span className="mr-1 sm:mr-2">{source.emoji}</span>
                         {source.name}
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* Terms and Conditions */}
               <div className="mb-6 sm:mb-8">
                 <label className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                   !surveyData.terms_accepted ? 'border-red-300 bg-red-50' : 'border-transparent bg-transparent'
                 }`}>
                                                           <input
                     type="checkbox"
                     checked={surveyData.terms_accepted}
                     onChange={(e) => setSurveyData(prev => ({ ...prev, terms_accepted: e.target.checked }))}
                     className="mt-1 w-4 h-4 text-[#5C3106] bg-white border-2 border-gray-300 rounded focus:ring-[#5C3106] focus:ring-2 checked:bg-[#5C3106] checked:border-[#5C3106]"
                     style={{ 
                       appearance: 'none',
                       WebkitAppearance: 'none',
                       MozAppearance: 'none',
                       backgroundImage: surveyData.terms_accepted ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z\'/%3e%3c/svg%3e")' : 'none',
                       backgroundSize: '100% 100%',
                       backgroundPosition: 'center',
                       backgroundRepeat: 'no-repeat'
                     }}
                     required
                   />
                   <span className="text-xs sm:text-sm text-gray-700" style={{ fontFamily: 'var(--font-inter)' }}>
                     I agree to Sol Health's{' '}
                     <a href="https://solhealth.co/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline text-gray-900 hover:text-gray-700">
                       Terms of Service
                     </a>
                     ,{' '}
                     <a href="https://solhealth.co/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-gray-900 hover:text-gray-700">
                       Privacy Policy
                     </a>
                     , and{' '}
                     <a href="https://solhealth.co/telehealth-consent" target="_blank" rel="noopener noreferrer" className="underline text-gray-900 hover:text-gray-700">
                       Telehealth Consent
                     </a>
                     . <span className="text-red-500">*</span>
                   </span>
                 </label>
                 {!surveyData.terms_accepted && (
                   <p className="text-xs text-red-600 mt-2 ml-7" style={{ fontFamily: 'var(--font-inter)' }}>
                     You must agree to the terms to continue
                   </p>
                 )}
               </div>

               {/* Submit Button */}
               <Button
                 onClick={() => onSubmit(surveyData)}
                 disabled={!isMatchingCompleteValid()}
                 className={`w-full py-4 sm:py-5 px-6 sm:px-8 rounded-full text-base sm:text-lg font-medium transition-colors ${
                   isMatchingCompleteValid() ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                 }`}
                 style={{ fontFamily: 'var(--font-inter)' }}
               >
                 ⚡ Match me to my therapist →
               </Button>
             </div>
           </div>
         </div>
       );

     default:
       return null;
   }
 };

 const isStepValid = () => {
   switch (currentStep) {
     case 'video':
       return true;
     case 'safety_screening':
       return surveyData.safety_screening !== '';
     case 'therapist_matching':
       return surveyData.matching_preference !== '';
     case 'therapist_search':
       return surveyData.selected_therapist !== '' && surveyData.selected_therapist_email !== '';
     case 'therapist_preferences':
       return surveyData.therapist_gender_preference !== '';
     case 'alcohol_drugs':
       return surveyData.alcohol_frequency !== '' && surveyData.recreational_drugs_frequency !== '';
     case 'phq9':
       const phq9Fields = [
         'pleasure_doing_things', 'feeling_down', 'trouble_falling', 'feeling_tired',
         'poor_appetite', 'feeling_bad_about_yourself', 'trouble_concentrating', 
         'moving_or_speaking_so_slowly', 'suicidal_thoughts'
       ];
       return phq9Fields.every(field => surveyData[field as keyof SurveyData]);
     case 'gad7':
       const gad7Fields = [
         'feeling_nervous', 'not_control_worrying', 'worrying_too_much', 
         'trouble_relaxing', 'being_so_restless', 'easily_annoyed', 'feeling_afraid'
       ];
       return gad7Fields.every(field => surveyData[field as keyof SurveyData]);
     case 'matching_complete':
       return true;
     default:
       return false;
   }
 };

 // Special handling for all steps - no progress bar or card wrapper
 if (currentStep === 'video' || currentStep === 'safety_screening' || currentStep === 'therapist_matching' || currentStep === 'therapist_search' || currentStep === 'therapist_preferences' || currentStep === 'alcohol_drugs' || currentStep === 'phq9' || currentStep === 'gad7' || currentStep === 'matching_complete') {
   return (
     <>
       {renderStepContent()}
       
       {/* Why We Ask Modal */}
       <Dialog open={showWhyWeAskModal} onOpenChange={setShowWhyWeAskModal}>
         <DialogContent className="max-w-md mx-auto" /* close button rendered by dialog; we won't add another */>
           <DialogHeader className="relative">
             {/* Remove extra manual X to avoid duplicate */}
             <DialogTitle className="text-left text-2xl font-medium" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
               Why we ask this question
             </DialogTitle>
             <DialogDescription>
               Learn why this question is important for providing you with safe and appropriate therapy care.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
             <p>
               At Sol Health, we want to make sure you're safe and matched to the right level of care. Our therapists are trained to work with those with mild to moderate symptoms. When someone is facing active suicidal or homicidal thoughts or hallucinations/delusions, a more intensive setting is the best and safest option.
             </p>
             
             <div>
               <h4 className="font-medium text-gray-800 mb-2">What we'll do if this applies to you</h4>
               <ul className="list-disc pl-5 space-y-1">
                 <li>Share a referral list with affordable, in-network and community options</li>
               </ul>
             </div>

             <p className="italic">
               We ask this to protect your wellbeing. Your answers are confidential and used only to guide care. This form isn't monitored 24/7 and isn't suitable for urgent situations.
             </p>

             <p className="font-medium">
               If you're in immediate danger or feel unsafe, call 988 (Suicide and Crisis Lifeline), 911, or go to the nearest emergency room.
             </p>
           </div>
         </DialogContent>
       </Dialog>

       {/* Referral Modal for "Yes" Response */}
       <Dialog open={showReferralModal} onOpenChange={setShowReferralModal}>
         <DialogContent className="max-w-md mx-auto">
           <DialogHeader className="relative">
             {/* Remove extra manual X to avoid duplicate */}
             <DialogTitle className="text-left text-3xl font-medium leading-tight" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
               Let's get you to the right level of care
             </DialogTitle>
             <DialogDescription>
               Based on your responses, we recommend connecting you with appropriate care resources and crisis support.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-6 text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
             <p>
               Because our therapists are trained to provide care for those with mild to moderate needs, we're not the right fit for your right now. Your safety comes first, and a higher level of care will serve you best.
             </p>
             
             <p>
               At Sol Health, we want to prioritize people's well-being above all else, and as such, we can refer you to other affordable options.
             </p>

             <p className="italic text-sm">
               *If you're in crisis or need immediate support, call 988 (Suicide and Crisis Lifeline), 911, or go to your nearest emergency room.
             </p>

             <div className="pt-4 flow-narrow mx-auto">
               <Button
                 onClick={() => {
                   window.open('https://solhealth.co/resources', '_blank');
                 }}
                 className="w-full py-4 px-6 bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full text-lg font-medium transition-colors border-2 border-gray-800"
                 style={{ fontFamily: 'var(--font-inter)' }}
               >
                 Referrals Resource List →
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Enhanced style for smooth, bubbly transitions */}
       <style jsx>{`
         .animate-question { 
           animation: appleSpringIn 850ms cubic-bezier(0.175, 0.885, 0.32, 1.4) both;
         }
         
         .animate-question-exit {
           animation: appleSpringOut 320ms cubic-bezier(0.55, 0.085, 0.68, 0.53) both;
         }
         
         @keyframes appleSpringIn {
           0% { 
             opacity: 0; 
             transform: scale(0.7) translateY(60px) rotateX(15deg); 
             filter: blur(6px);
           }
           30% {
             opacity: 0.3;
             transform: scale(0.9) translateY(20px) rotateX(8deg);
             filter: blur(3px);
           }
           60% {
             opacity: 0.8;
             transform: scale(1.12) translateY(-12px) rotateX(-2deg);
             filter: blur(0px);
           }
           100% { 
             opacity: 1; 
             transform: scale(1) translateY(0px); 
             filter: blur(0px);
           }
         }
         
         @keyframes bubbleOutQuestion {
           0% {
             opacity: 1;
             transform: scale(1) translateY(0px);
             filter: blur(0px);
           }
           100% {
             opacity: 0;
             transform: scale(0.9) translateY(-15px);
             filter: blur(2px);
           }
         }
         
         /* Delightful bounce for buttons when they appear */
         .animate-question .space-y-3 > button,
         .animate-question .space-y-4 > button {
           animation: appleButtonBounce 950ms cubic-bezier(0.175, 0.885, 0.32, 1.4) both;
           animation-delay: 450ms;
           transform-origin: center bottom;
         }
         
         @keyframes appleButtonBounce {
           0% {
             opacity: 0;
             transform: scale(0.8) translateY(25px) rotate(-1deg);
           }
           50% {
             opacity: 0.7;
             transform: scale(1.08) translateY(-5px) rotate(0.5deg);
           }
           75% {
             opacity: 0.95;
             transform: scale(0.98) translateY(2px) rotate(-0.2deg);
           }
           100% {
             opacity: 1;
             transform: scale(1) translateY(0px) rotate(0deg);
           }
         }
         
         /* Stagger the button animations for a beautiful cascading effect */
         .animate-question .space-y-3 > button:nth-child(1),
         .animate-question .space-y-4 > button:nth-child(1) { animation-delay: 350ms; }
         .animate-question .space-y-3 > button:nth-child(2),
         .animate-question .space-y-4 > button:nth-child(2) { animation-delay: 400ms; }
         .animate-question .space-y-3 > button:nth-child(3),
         .animate-question .space-y-4 > button:nth-child(3) { animation-delay: 450ms; }
         .animate-question .space-y-3 > button:nth-child(4),
         .animate-question .space-y-4 > button:nth-child(4) { animation-delay: 500ms; }
         
         /* Enhanced hover animations with gentle spring */
         .animate-question button:hover {
           transform: scale(1.03) translateY(-1px);
           transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
           box-shadow: 0 4px 8px rgba(92, 49, 6, 0.15);
         }
         
         /* Active state with satisfying squish */
         .animate-question button:active {
           transform: scale(0.98) translateY(1px);
           transition: transform 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
         }
         
         /* Enhanced progress dots animation */
         .animate-question + * .h-0\\.5 {
           animation: progressDotPulse 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
           animation-delay: 550ms;
         }
         
         @keyframes progressDotPulse {
           0% {
             opacity: 0;
             transform: scale(0.3) translateY(10px);
           }
           30% {
             opacity: 0.4;
             transform: scale(0.8) translateY(-2px);
           }
           60% {
             opacity: 0.8;
             transform: scale(1.3) translateY(-1px);
           }
           100% {
             opacity: 1;
             transform: scale(1) translateY(0px);
           }
         }
         
         /* Add a subtle glow effect when buttons are selected */
         .animate-question button[class*="bg-[#5C3106]"] {
           box-shadow: 0 0 20px rgba(92, 49, 6, 0.3);
           animation: selectedGlow 300ms ease-out both;
         }
         
         @keyframes selectedGlow {
           0% {
             box-shadow: 0 0 0px rgba(92, 49, 6, 0);
             transform: scale(1);
           }
           50% {
             box-shadow: 0 0 25px rgba(92, 49, 6, 0.4);
             transform: scale(1.05);
           }
           100% {
             box-shadow: 0 0 20px rgba(92, 49, 6, 0.3);
             transform: scale(1);
           }
         }
         
         /* Add subtle entrance animation for the question container */
         .animate-question > div:first-child {
           animation: questionTextFloat 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
           animation-delay: 100ms;
         }
         
         @keyframes questionTextFloat {
           0% {
             opacity: 0;
             transform: translateY(15px);
           }
           100% {
             opacity: 1;
             transform: translateY(0px);
           }
         }
         
        /* Extra Apple-style warm glow for the whole question card */
        .animate-question::before {
          content: '';
          position: absolute;
          inset: -8px;
          background: linear-gradient(135deg, 
            rgba(255, 193, 7, 0.08), 
            rgba(92, 49, 6, 0.05), 
            rgba(255, 193, 7, 0.08));
          border-radius: inherit;
          z-index: -1;
          opacity: 0;
          animation: warmCardGlow 3s ease-in-out infinite alternate;
          animation-delay: 2s;
          filter: blur(3px);
        }
        
        @keyframes warmCardGlow {
          0% {
            opacity: 0;
            transform: scale(0.98);
          }
          100% {
            opacity: 0.4;
            transform: scale(1.02);
          }
        }

        /* Enhanced selected button celebration */
        .animate-question button[class*="bg-[#5C3106]"] {
          animation: selectedCelebration 500ms cubic-bezier(0.175, 0.885, 0.32, 1.4) both !important;
        }
        
        @keyframes selectedCelebration {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0px rgba(92, 49, 6, 0);
          }
          25% {
            transform: scale(1.15) rotate(2deg);
            box-shadow: 0 0 25px rgba(92, 49, 6, 0.5), 0 5px 20px rgba(255, 193, 7, 0.3);
          }
          50% {
            transform: scale(0.92) rotate(-1deg);
            box-shadow: 0 0 30px rgba(92, 49, 6, 0.6);
          }
          75% {
            transform: scale(1.08) rotate(0.5deg);
            box-shadow: 0 0 22px rgba(92, 49, 6, 0.45);
          }
          100% {
            transform: scale(1) rotate(0deg);
            box-shadow: 0 0 20px rgba(92, 49, 6, 0.35), 0 3px 12px rgba(92, 49, 6, 0.25);
          }
        }
      `}</style>
     </>
   );
 }

 return null;
}

