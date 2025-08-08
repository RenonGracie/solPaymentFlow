// solPayments/src/components/CustomSurvey.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, X, Plus } from "lucide-react";

interface SurveyData {
  // Safety Screening
  safety_screening: string; // 'yes' | 'no' | ''
  
  // Therapist Matching
  matching_preference: string; // 'match_me' | 'requesting_specific' | ''
  selected_therapist?: string; // For specific therapist requests
  
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
  referred_by?: string;
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

export default function CustomSurvey({ paymentType, formData, onSubmit, onBack }: CustomSurveyProps) {
  const [currentStep, setCurrentStep] = useState<SurveyStep>('video');
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWideScreen, setIsWideScreen] = useState(false);
  
  // Safety screening modal states
  const [showWhyWeAskModal, setShowWhyWeAskModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  
  // Therapist search state
  const [therapistSearchQuery, setTherapistSearchQuery] = useState('');
  
  // Alcohol and drugs carousel state
  const [alcoholDrugsCarouselIndex, setAlcoholDrugsCarouselIndex] = useState(0);
  
  // PHQ-9 carousel state  
  const [phq9CarouselIndex, setPhq9CarouselIndex] = useState(0);
  
  // GAD-7 carousel state
  const [gad7CarouselIndex, setGad7CarouselIndex] = useState(0);
  
  const [surveyData, setSurveyData] = useState<SurveyData>({
    // Safety Screening
    safety_screening: '',
    
    // Therapist Matching
    matching_preference: '',
    selected_therapist: '',
    
    // Therapist Preferences
    therapist_gender_preference: 'No preference',
    therapist_specialization: [],
    therapist_lived_experiences: [],
    
    // Alcohol and Drugs Screening
    alcohol_frequency: '',
    recreational_drugs_frequency: '',
    
    // Pre-fill from form data
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    preferred_name: formData.preferredName || formData.firstName, // Add preferred name with fallback
    phone: '',
    age: '',
    gender: '',
    state: formData.state || '', // Pre-fill state if passed from onboarding
    race_ethnicity: [],
    pleasure_doing_things: '',
    feeling_down: '',
    trouble_falling: '',
    feeling_tired: '',
    poor_appetite: '',
    feeling_bad_about_yourself: '',
    trouble_concentrating: '',
    moving_or_speaking_so_slowly: '',
    suicidal_thoughts: '',
    feeling_nervous: '',
    not_control_worrying: '',
    worrying_too_much: '',
    trouble_relaxing: '',
    being_so_restless: '',
    easily_annoyed: '',
    feeling_afraid: '',
    lived_experiences: [],
    university: '',
    referred_by: ''
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
                <source src="/how-it-works-9x16.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8">
                <Button
                  onClick={handleVideoContinue}
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
                  <source src="/how-it-works-9x16.mp4" type="video/mp4" />
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
                    How It Works
                  </h2>
                  
                  <Button
                    onClick={handleVideoContinue}
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

        // Desktop landscape - For very narrow desktop windows (< 1024px width), use vertical stack
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
                  <source src="/how-it-works-16x9.mp4" type="video/mp4" />
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
                    How It Works
                  </h2>
                  
                  <div className="max-w-md mx-auto w-full">
                    <Button
                      onClick={handleVideoContinue}
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
                <source src="/how-it-works-16x9.mp4" type="video/mp4" />
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
                  How It Works
                </h2>
                
                <Button
                  onClick={handleVideoContinue}
                  className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-base font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
            {/* Header with sunset image */}
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

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
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
              <div className="max-w-md w-full -mt-16">
                <div className="bg-white border-2 border-gray-300 rounded-3xl p-8 shadow-sm">
                  <div className="text-center mb-8">
                    <h1 className="text-xl md:text-2xl mb-6 text-gray-800 leading-relaxed" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Over the past 2 weeks, have you been actively suicidal or homicidal OR have you been experiencing hallucinations or delusions?
                    </h1>
                    
                    <button
                      onClick={() => setShowWhyWeAskModal(true)}
                      className="text-gray-500 text-sm underline hover:text-gray-700 transition-colors"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      Learn about why we ask this
                    </button>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => handleSafetyResponse('yes')}
                      className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      Yes
                    </button>

                    <button
                      onClick={() => handleSafetyResponse('no')}
                      className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
            {/* Header with sunset image */}
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

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <button onClick={() => setCurrentStep('safety_screening')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
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
              <div className="max-w-md w-full -mt-16">
                <div className="bg-white border-2 border-gray-300 rounded-3xl p-8 shadow-sm">
                  <div className="text-center mb-8">
                    <h1 className="text-xl md:text-2xl mb-4 text-gray-800 leading-relaxed" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Would you like to be matched with a therapist, or are you requesting someone specific?
                    </h1>
                    
                    <button
                      className="text-gray-500 text-sm underline hover:text-gray-700 transition-colors"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      Browse our Clinical Team here.
                    </button>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => handleMatchingPreference('match_me')}
                      className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      <span className="mr-3">⚡</span>
                      Match me to my best-fit therapist
                    </button>

                    <button
                      onClick={() => handleMatchingPreference('requesting_specific')}
                      className="w-full py-4 px-6 bg-white border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      <span className="mr-3">😊</span>
                      I'm requesting someone specific
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'therapist_search':
        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
            {/* Header with sunset image */}
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

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <button onClick={() => setCurrentStep('therapist_matching')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
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
              <div className="max-w-md w-full -mt-16">
                <div className="text-center mb-8">
                  <h1 className="text-2xl md:text-3xl mb-4 text-gray-800" 
                      style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                    Search for Your Therapist
                  </h1>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
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
                    className="w-full py-4 px-4 rounded-2xl border-2 border-gray-300 focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  />
                </div>

                {/* Search Results */}
                {therapistSearchQuery && (
                  <div className="bg-white border-2 border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {/* Mock search results - replace with actual therapist data */}
                    {[
                      { id: 'sarah_johnson', name: 'Dr. Sarah Johnson' },
                      { id: 'michael_chen', name: 'Dr. Michael Chen' }
                    ].map((therapist) => (
                      <div 
                        key={therapist.id}
                        onClick={() => {
                          updateSurveyData('selected_therapist', therapist.name);
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
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
            {/* Header with sunset image */}
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

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <button onClick={() => setCurrentStep('therapist_matching')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 pb-16 overflow-y-auto">
              <div className="max-w-lg mx-auto">
                <div className="text-center mb-8 mt-4">
                  <h1 className="text-2xl md:text-3xl mb-4 text-gray-800" 
                      style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                    Therapist Preferences
                  </h1>
                </div>

                {/* Therapist Specializations */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    I would like a therapist that specializes in:
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'ADHD', emoji: '🧠' },
                      { name: 'Anxiety', emoji: '🌿' },
                      { name: 'Body image', emoji: '🪞' },
                      { name: 'Building confidence', emoji: '🌱' },
                      { name: 'Career/academic stress', emoji: '📚' },
                      { name: 'Depression', emoji: '🌧️' },
                      { name: 'Eating disorders', emoji: '🍽️' },
                      { name: 'Emotional regulation', emoji: '🌊' },
                      { name: 'Family life', emoji: '🌳' },
                      { name: 'Grief and loss', emoji: '🦋' },
                      { name: 'LGBTQ+ identity', emoji: '🏳️‍🌈' },
                      { name: 'Life transitions', emoji: '🌟' },
                      { name: 'Loneliness', emoji: '🌙' },
                      { name: 'OCD', emoji: '⚪' },
                      { name: 'Panic attacks', emoji: '🌀' },
                      { name: 'Phobias', emoji: '🌨️' },
                      { name: 'PTSD', emoji: '🔍' },
                      { name: 'Relationship challenges', emoji: '⭐' },
                      { name: 'Stress and burnout', emoji: '📍' },
                      { name: 'Trauma', emoji: '🎯' }
                    ].map((specialization) => {
                      const isSelected = surveyData.therapist_specialization.includes(specialization.name);
                      return (
                        <button
                          key={specialization.name}
                          onClick={() => toggleSpecialization(specialization.name)}
                          className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#5C3106] text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          <span className="flex items-center">
                            <span className="mr-2">{specialization.emoji}</span>
                            {specialization.name}
                          </span>
                          <Plus 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isSelected ? 'rotate-45' : ''
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gender Preference */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    I would like a therapist that identifies as:
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Female', emoji: '👩' },
                      { name: 'Male', emoji: '👨' },
                      { name: 'No preference', emoji: '⭐' }
                    ].map((gender) => (
                      <button
                        key={gender.name}
                        onClick={() => updateSurveyData('therapist_gender_preference', gender.name)}
                        className={`w-full py-3 px-4 rounded-2xl text-left transition-all ${
                          surveyData.therapist_gender_preference === gender.name
                            ? 'bg-[#5C3106] text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                        }`}
                        style={{ fontFamily: 'var(--font-inter)' }}
                      >
                        <span className="mr-3">{gender.emoji}</span>
                        {gender.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lived Experiences */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                    Are there any lived experiences you identify with that you feel are important to your match?
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Family */}
                    <div>
                      <h4 className="text-center font-medium text-gray-600 mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
                        Family
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
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
                              className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span className="flex items-center">
                                <span className="mr-2">{experience.emoji}</span>
                                {experience.name}
                              </span>
                              <Plus 
                                className={`w-4 h-4 transition-transform duration-200 ${
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
                      <h4 className="text-center font-medium text-gray-600 mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
                        Upbringing
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { name: 'Raised in an individualist culture', emoji: '🏛️' },
                          { name: 'Raised in a collectivist culture', emoji: '🤝' },
                          { name: 'Lived in many places', emoji: '📍' },
                          { name: 'First/second generation immigrant', emoji: '🌎' }
                        ].map((experience) => {
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience.name);
                          return (
                            <button
                              key={experience.name}
                              onClick={() => toggleLivedExperience(experience.name)}
                              className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span className="flex items-center">
                                <span className="mr-2">{experience.emoji}</span>
                                {experience.name}
                              </span>
                              <Plus 
                                className={`w-4 h-4 transition-transform duration-200 ${
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
                      <h4 className="text-center font-medium text-gray-600 mb-3" style={{ fontFamily: 'var(--font-inter)' }}>
                        Identity and Experiences
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { name: 'Identifying as LGBTQ+', emoji: '🏳️‍🌈' },
                          { name: 'Negatively affected by social media', emoji: '📱' }
                        ].map((experience) => {
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience.name);
                          return (
                            <button
                              key={experience.name}
                              onClick={() => toggleLivedExperience(experience.name)}
                              className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span className="flex items-center">
                                <span className="mr-2">{experience.emoji}</span>
                                {experience.name}
                              </span>
                              <Plus 
                                className={`w-4 h-4 transition-transform duration-200 ${
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
                <div className="pt-4">
                  <Button
                    onClick={() => setCurrentStep('alcohol_drugs')}
                    className="w-full py-4 px-6 bg-blue-100 hover:bg-blue-200 text-gray-800 rounded-full text-lg font-medium transition-all"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'alcohol_drugs':
        const alcoholDrugsQuestions = [
          {
            question: "Do you drink alcohol? If yes, how often per week?",
            field: 'alcohol_frequency' as keyof SurveyData,
            options: [
              'Not at all',
              'Several days', 
              'More than half the days',
              'Nearly every day'
            ]
          },
          {
            question: "Do you use recreational drugs? If yes, how often per week?",
            field: 'recreational_drugs_frequency' as keyof SurveyData,
            options: [
              'Not at all',
              'Several days',
              'More than half the days', 
              'Nearly every day'
            ]
          }
        ];

        const currentQuestion = alcoholDrugsQuestions[alcoholDrugsCarouselIndex];
        const isLastQuestion = alcoholDrugsCarouselIndex === alcoholDrugsQuestions.length - 1;
        const canContinue = surveyData.alcohol_frequency && surveyData.recreational_drugs_frequency;

        return (
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
            {/* Header with sunset image */}
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

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
              <button 
                onClick={() => {
                  if (alcoholDrugsCarouselIndex > 0) {
                    setAlcoholDrugsCarouselIndex(alcoholDrugsCarouselIndex - 1);
                  } else {
                    setCurrentStep('therapist_preferences');
                  }
                }} 
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
              <div className="w-10"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-6 pb-16">
              <div className="max-w-md w-full -mt-16">
                <div className="text-center mb-8">
                  <h1 className="text-2xl md:text-3xl mb-4 text-gray-800" 
                      style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                    Alcohol and Recreational Drugs
                  </h1>
                  <p className="text-gray-500 text-sm italic" style={{ fontFamily: 'var(--font-inter)' }}>
                    Disclaimer: Your information is confidential and used only for assessment and treatment.
                  </p>
                </div>

                <div className="bg-white border-2 border-gray-300 rounded-3xl p-8 shadow-sm">
                  <div className="text-center mb-8">
                    <h2 className="text-lg md:text-xl mb-6 text-gray-800 leading-relaxed" 
                        style={{ fontFamily: 'var(--font-inter)' }}>
                      {currentQuestion.question}
                    </h2>
                  </div>

                  <div className="space-y-3 mb-8">
                    {currentQuestion.options.map((option) => {
                      const isSelected = surveyData[currentQuestion.field] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => updateSurveyData(currentQuestion.field, option)}
                          className={`w-full py-3 px-6 rounded-2xl text-lg font-medium transition-all ${
                            isSelected
                              ? 'bg-[#5C3106] text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center">
                    {/* Previous Button */}
                    <div className="flex-1">
                      {alcoholDrugsCarouselIndex > 0 && (
                        <Button
                          onClick={() => setAlcoholDrugsCarouselIndex(alcoholDrugsCarouselIndex - 1)}
                          variant="outline"
                          className="py-3 px-6 rounded-full"
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                      )}
                    </div>

                    {/* Progress Dots */}
                    <div className="flex space-x-2">
                      {alcoholDrugsQuestions.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index === alcoholDrugsCarouselIndex ? 'bg-[#5C3106]' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Next/Continue Button */}
                    <div className="flex-1 flex justify-end">
                      {isLastQuestion ? (
                        <Button
                          onClick={() => setCurrentStep('phq9')}
                          disabled={!canContinue}
                          className={`py-3 px-6 rounded-full ${
                            canContinue
                              ? 'bg-blue-100 hover:bg-blue-200 text-gray-800'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setAlcoholDrugsCarouselIndex(alcoholDrugsCarouselIndex + 1)}
                          disabled={!surveyData[currentQuestion.field]}
                          className={`py-3 px-6 rounded-full ${
                            surveyData[currentQuestion.field]
                              ? 'bg-blue-100 hover:bg-blue-200 text-gray-800'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          style={{ fontFamily: 'var(--font-inter)' }}
                        >
                          Next
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        case 'phq9':
          const phq9Questions = [
            {
              question: "Little interest or pleasure in doing things",
              field: 'pleasure_doing_things' as keyof SurveyData,
              emoji: '😔'
            },
            {
              question: "Feeling down, depressed, or hopeless",
              field: 'feeling_down' as keyof SurveyData,
              emoji: '🌧️'
            },
            {
              question: "Trouble falling or staying asleep, or sleeping too much",
              field: 'trouble_falling' as keyof SurveyData,
              emoji: '😴'
            },
            {
              question: "Feeling tired or having little energy",
              field: 'feeling_tired' as keyof SurveyData,
              emoji: '😞'
            },
            {
              question: "Poor appetite or overeating",
              field: 'poor_appetite' as keyof SurveyData,
              emoji: '🍽️'
            },
            {
              question: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
              field: 'feeling_bad_about_yourself' as keyof SurveyData,
              emoji: '😓'
            },
            {
              question: "Trouble concentrating on things, such as reading the newspaper or watching television",
              field: 'trouble_concentrating' as keyof SurveyData,
              emoji: '🧠'
            },
            {
              question: "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
              field: 'moving_or_speaking_so_slowly' as keyof SurveyData,
              emoji: '🔄'
            },
            {
              question: "Thoughts that you would be better off dead, or of hurting yourself",
              field: 'suicidal_thoughts' as keyof SurveyData,
              emoji: '💭'
            }
          ];
   
          const currentPhq9Question = phq9Questions[phq9CarouselIndex];
          const isLastPhq9Question = phq9CarouselIndex === phq9Questions.length - 1;
          const canContinuePhq9 = phq9Questions.every(q => surveyData[q.field]);
   
          return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
              {/* Header with sunset image */}
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
   
              {/* Navigation */}
              <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
                <button 
                  onClick={() => {
                    if (phq9CarouselIndex > 0) {
                      setPhq9CarouselIndex(phq9CarouselIndex - 1);
                    } else {
                      setCurrentStep('alcohol_drugs');
                    }
                  }} 
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
                <div className="w-10"></div>
              </div>
   
              {/* Content */}
              <div className="flex-1 flex items-center justify-center px-6 pb-16">
                <div className="max-w-md w-full -mt-16">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl mb-4 text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Measuring Your Emotional Well-Being
                    </h1>
                    <p className="text-gray-500 text-sm italic" style={{ fontFamily: 'var(--font-inter)' }}>
                      This may feel like a lot, but this snapshot will help us give you the best care.
                    </p>
                  </div>
   
                  <div className="bg-white border-2 border-gray-300 rounded-3xl p-8 shadow-sm">
                    <div className="text-center mb-8">
                      <h2 className="text-lg mb-6 text-gray-800 leading-relaxed" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                        Over the last 2 weeks, how often have you been bothered by any of the following?
                      </h2>
                      
                      {/* Emoji and Question */}
                      <div className="mb-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">{currentPhq9Question.emoji}</span>
                        </div>
                        <p className="text-base text-gray-800 leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
                          {currentPhq9Question.question}
                        </p>
                      </div>
                    </div>
   
                    <div className="space-y-3 mb-8">
                      {scaleOptions.map((option) => {
                        const isSelected = surveyData[currentPhq9Question.field] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => updateSurveyData(currentPhq9Question.field, option)}
                            className={`w-full py-3 px-6 rounded-2xl text-lg font-medium transition-all ${
                              isSelected
                                ? 'bg-[#5C3106] text-white'
                                : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
   
                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center">
                      {/* Previous Button */}
                      <div className="flex-1">
                        {phq9CarouselIndex > 0 && (
                          <Button
                            onClick={() => setPhq9CarouselIndex(phq9CarouselIndex - 1)}
                            variant="outline"
                            className="py-3 px-6 rounded-full"
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                        )}
                      </div>
   
                      {/* Progress Dots */}
                      <div className="flex space-x-2">
                        {phq9Questions.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === phq9CarouselIndex ? 'bg-[#5C3106]' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
   
                      {/* Next/Continue Button */}
                      <div className="flex-1 flex justify-end">
                        {isLastPhq9Question ? (
                          <Button
                            onClick={() => setCurrentStep('gad7')}
                            disabled={!canContinuePhq9}
                            className={`py-3 px-6 rounded-full ${
                              canContinuePhq9
                                ? 'bg-blue-100 hover:bg-blue-200 text-gray-800'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setPhq9CarouselIndex(phq9CarouselIndex + 1)}
                            disabled={!surveyData[currentPhq9Question.field]}
                            className={`py-3 px-6 rounded-full ${
                              surveyData[currentPhq9Question.field]
                                ? 'bg-blue-100 hover:bg-blue-200 text-gray-800'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
   
        case 'gad7':
          const gad7Questions = [
            {
              question: "Feeling nervous, anxious, or on edge",
              field: 'feeling_nervous' as keyof SurveyData,
              emoji: '😰'
            },
            {
              question: "Not being able to stop or control worrying",
              field: 'not_control_worrying' as keyof SurveyData,
              emoji: '🌀'
            },
            {
              question: "Worrying too much about different things",
              field: 'worrying_too_much' as keyof SurveyData,
              emoji: '😟'
            },
            {
              question: "Trouble relaxing",
              field: 'trouble_relaxing' as keyof SurveyData,
              emoji: '😤'
            },
            {
              question: "Being so restless that it is hard to sit still",
              field: 'being_so_restless' as keyof SurveyData,
              emoji: '🚶'
            },
            {
              question: "Becoming easily annoyed or irritable",
              field: 'easily_annoyed' as keyof SurveyData,
              emoji: '😠'
            },
            {
              question: "Feeling afraid, as if something awful might happen",
              field: 'feeling_afraid' as keyof SurveyData,
              emoji: '😨'
            }
          ];
   
          const currentGad7Question = gad7Questions[gad7CarouselIndex];
          const isLastGad7Question = gad7CarouselIndex === gad7Questions.length - 1;
          const canContinueGad7 = gad7Questions.every(q => surveyData[q.field]);
   
          return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
              {/* Header with sunset image */}
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
   
              {/* Navigation */}
              <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
                <button 
                  onClick={() => {
                    if (gad7CarouselIndex > 0) {
                      setGad7CarouselIndex(gad7CarouselIndex - 1);
                    } else {
                      setCurrentStep('phq9');
                    }
                  }} 
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
                <div className="w-10"></div>
              </div>
   
              {/* Content */}
              <div className="flex-1 flex items-center justify-center px-6 pb-16">
                <div className="max-w-md w-full -mt-16">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl mb-4 text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                      Measuring Anxiety
                    </h1>
                    <p className="text-gray-500 text-sm italic" style={{ fontFamily: 'var(--font-inter)' }}>
                      This may feel like a lot, but this snapshot will help us give you the best care.
                    </p>
                  </div>
   
                  <div className="bg-white border-2 border-gray-300 rounded-3xl p-8 shadow-sm">
                    <div className="text-center mb-8">
                      <h2 className="text-lg mb-6 text-gray-800 leading-relaxed" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                        Over the last 2 weeks, how often have you been bothered by any of the following?
                      </h2>
                      
                      {/* Emoji and Question */}
                      <div className="mb-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">{currentGad7Question.emoji}</span>
                        </div>
                        <p className="text-base text-gray-800 leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
                          {currentGad7Question.question}
                        </p>
                      </div>
                    </div>
   
                    <div className="space-y-3 mb-8">
                      {scaleOptions.map((option) => {
                        const isSelected = surveyData[currentGad7Question.field] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => updateSurveyData(currentGad7Question.field, option)}
                            className={`w-full py-3 px-6 rounded-2xl text-lg font-medium transition-all ${
                              isSelected
                                ? 'bg-[#5C3106] text-white'
                                : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
   
                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center">
                      {/* Previous Button */}
                      <div className="flex-1">
                        {gad7CarouselIndex > 0 && (
                          <Button
                            onClick={() => setGad7CarouselIndex(gad7CarouselIndex - 1)}
                            variant="outline"
                            className="py-3 px-6 rounded-full"
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                        )}
                      </div>
   
                      {/* Progress Dots */}
                      <div className="flex space-x-2">
                        {gad7Questions.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === gad7CarouselIndex ? 'bg-[#5C3106]' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
   
                      {/* Next/Continue Button */}
                      <div className="flex-1 flex justify-end">
                        {isLastGad7Question ? (
                          <Button
                            onClick={() => setCurrentStep('matching_complete')}
                            disabled={!canContinueGad7}
                            className={`py-3 px-6 rounded-full ${
                              canContinueGad7
                                ? 'bg-blue-100 hover:bg-blue-200 text-gray-800'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setGad7CarouselIndex(gad7CarouselIndex + 1)}
                            disabled={!surveyData[currentGad7Question.field]}
                            className={`py-3 px-6 rounded-full ${
                              surveyData[currentGad7Question.field]
                                ? 'bg-blue-100 hover:bg-blue-200 text-gray-800'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
   
        case 'matching_complete':
          return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
              {/* Header with sunset image */}
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
   
              {/* Navigation */}
              <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
                <button onClick={() => setCurrentStep('gad7')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
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
              <div className="flex-1 px-6 pb-16 overflow-y-auto">
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8 mt-4">
                    <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl">⚡</span>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl mb-6 text-gray-800" 
                        style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                      We're About To Match You!
                    </h1>
                    
                    <p className="text-gray-600 text-base mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
                      Please confirm your account details below.
                    </p>
                  </div>

                  {/* Basic Information */}
                  <div className="mb-8">
                    <h2 className="text-xl font-medium mb-6 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Basic Information
                    </h2>
                    
                    <div className="space-y-4">
                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={surveyData.preferred_name || surveyData.first_name}
                          onChange={(e) => updateSurveyData('preferred_name', e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white"
                          style={{ fontFamily: 'var(--font-inter)' }}
                        />
                        {/* Show preferred name note if different from original first name */}
                        {surveyData.preferred_name && surveyData.preferred_name !== surveyData.first_name && (
                          <p className="text-sm text-blue-600 mt-1">
                            Your therapist will address you as "{surveyData.preferred_name}"
                          </p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={surveyData.last_name}
                          onChange={(e) => updateSurveyData('last_name', e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white"
                          style={{ fontFamily: 'var(--font-inter)' }}
                        />
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={surveyData.phone || ''}
                          onChange={(e) => updateSurveyData('phone', e.target.value)}
                          placeholder="+11234567890"
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white"
                          style={{ fontFamily: 'var(--font-inter)' }}
                        />
                      </div>

                      {/* Gender and Age Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender
                          </label>
                          <select
                            value={surveyData.gender}
                            onChange={(e) => updateSurveyData('gender', e.target.value)}
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age
                          </label>
                          <input
                            type="number"
                            min="18"
                            max="120"
                            value={surveyData.age}
                            onChange={(e) => updateSurveyData('age', e.target.value)}
                            placeholder="Select your age"
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white"
                            style={{ fontFamily: 'var(--font-inter)' }}
                          />
                        </div>
                      </div>

                      {/* Race/Ethnicity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Race/Ethnicity
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              <label key={ethnicity} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const current = surveyData.race_ethnicity;
                                    if (e.target.checked) {
                                      updateSurveyData('race_ethnicity', [...current, ethnicity]);
                                    } else {
                                      updateSurveyData('race_ethnicity', current.filter(item => item !== ethnicity));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{ethnicity}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* School or University */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          School or University
                        </label>
                        <input
                          type="text"
                          value={surveyData.university || ''}
                          onChange={(e) => updateSurveyData('university', e.target.value)}
                          placeholder="Optional"
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white"
                          style={{ fontFamily: 'var(--font-inter)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* How did you hear about Sol Health */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4 text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
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
                        const isSelected = surveyData.referred_by === source.name;
                        return (
                          <button
                            key={source.name}
                            onClick={() => updateSurveyData('referred_by', isSelected ? '' : source.name)}
                            className={`py-2 px-3 rounded-full text-sm transition-all flex items-center ${
                              isSelected
                                ? 'bg-[#5C3106] text-white'
                                : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                            }`}
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            <span className="mr-2">{source.emoji}</span>
                            {source.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="mb-8">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded"
                        required
                      />
                      <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-inter)' }}>
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
                        .
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={() => onSubmit(surveyData)}
                    className="w-full py-5 px-8 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-full text-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
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
          return true; // Video step is always valid
        case 'safety_screening':
          return surveyData.safety_screening !== ''; // Must have selected yes or no
        case 'therapist_matching':
          return surveyData.matching_preference !== ''; // Must have selected preference
        case 'therapist_search':
          return surveyData.selected_therapist !== ''; // Must have selected a therapist
        case 'therapist_preferences':
          return true; // Optional preferences, always valid
        case 'alcohol_drugs':
          return surveyData.alcohol_frequency !== '' && surveyData.recreational_drugs_frequency !== '';
        case 'phq9':
          // Check if all PHQ-9 questions are answered
          const phq9Fields = [
            'pleasure_doing_things', 'feeling_down', 'trouble_falling', 'feeling_tired',
            'poor_appetite', 'feeling_bad_about_yourself', 'trouble_concentrating', 
            'moving_or_speaking_so_slowly', 'suicidal_thoughts'
          ];
          return phq9Fields.every(field => surveyData[field as keyof SurveyData]);
        case 'gad7':
          // Check if all GAD-7 questions are answered
          const gad7Fields = [
            'feeling_nervous', 'not_control_worrying', 'worrying_too_much', 
            'trouble_relaxing', 'being_so_restless', 'easily_annoyed', 'feeling_afraid'
          ];
          return gad7Fields.every(field => surveyData[field as keyof SurveyData]);
        case 'matching_complete':
          return true; // Final step, always valid
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
            <DialogContent className="max-w-md mx-auto">
              <DialogHeader className="relative">
                <button
                  onClick={() => setShowWhyWeAskModal(false)}
                  className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <DialogTitle className="text-left text-2xl font-medium" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                  Why we ask this question
                </DialogTitle>
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
                <button
                  onClick={() => setShowReferralModal(false)}
                  className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <DialogTitle className="text-left text-3xl font-medium leading-tight" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>
                  Let's get you to the right level of care
                </DialogTitle>
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
   
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      window.open('https://solhealth.co/resources', '_blank');
                    }}
                    className="w-full py-4 px-6 bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full text-lg font-medium transition-all border-2 border-gray-800"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Referrals Resource List →
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }
   
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-2">
          <div 
            className="bg-blue-500 h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
   
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center">
                Step {currentStepIndex} of {totalSteps - 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
              
              <div className="flex justify-between mt-8">
                <Button
                  onClick={goToPrevStep}
                  variant="outline"
                  className="flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {currentStepIndex === 1 ? 'Back to Payment' : 'Previous'}
                </Button>
                
                <Button
                  onClick={goToNextStep}
                  disabled={!isStepValid()}
                  className="flex items-center"
                >
                  {currentStepIndex === totalSteps - 1 ? 'Find My Therapist' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
   }