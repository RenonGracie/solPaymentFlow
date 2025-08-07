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
  
  // Preferences
  therapist_specializes_in: string[];
  therapist_identifies_as: string;
  
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
  what_brings_you: string;
  lived_experiences: string[];
  university?: string;
  promo_code?: string;
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
    verificationData?: any; // Insurance verification response
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
  'demographics',
  'preferences', 
  'mental_health',
  'anxiety',
  'additional'
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
    therapist_specializes_in: [],
    therapist_identifies_as: 'No preference',
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
    what_brings_you: '',
    lived_experiences: [],
    university: '',
    promo_code: '',
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

  const updateSurveyData = (field: keyof SurveyData, value: any) => {
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
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience);
                          return (
                            <button
                              key={experience}
                              onClick={() => toggleLivedExperience(experience)}
                              className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span>{experience}</span>
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
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience);
                          return (
                            <button
                              key={experience}
                              onClick={() => toggleLivedExperience(experience)}
                              className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span>{experience}</span>
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
                          const isSelected = surveyData.therapist_lived_experiences.includes(experience);
                          return (
                            <button
                              key={experience}
                              onClick={() => toggleLivedExperience(experience)}
                              className={`py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#5C3106] text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50'
                              }`}
                              style={{ fontFamily: 'var(--font-inter)' }}
                            >
                              <span>{experience}</span>
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
                          onClick={() => setCurrentStep('demographics')}
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

      case 'demographics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Tell us about yourself</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Age Range*</label>
                <select
                  value={surveyData.age}
                  onChange={(e) => updateSurveyData('age', e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select age range</option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45-54">45-54</option>
                  <option value="55-64">55-64</option>
                  <option value="65+">65+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender*</label>
                <select
                  value={surveyData.gender}
                  onChange={(e) => updateSurveyData('gender', e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State*</label>
              {/* Show state if pre-filled from onboarding, otherwise show dropdown */}
              {surveyData.state && formData.state ? (
                <div className="w-full p-3 border rounded-lg bg-gray-50">
                  <span className="text-gray-700">{surveyData.state}</span>
                  <span className="text-sm text-gray-500 ml-2">(selected during signup)</span>
                </div>
              ) : (
                <select
                  value={surveyData.state}
                  onChange={(e) => updateSurveyData('state', e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select your state</option>
                  <option value="NY">New York</option>
                  <option value="NJ">New Jersey</option>
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                  <option value="PA">Pennsylvania</option>
                  <option value="IL">Illinois</option>
                  <option value="OH">Ohio</option>
                  <option value="GA">Georgia</option>
                  <option value="NC">North Carolina</option>
                  <option value="MI">Michigan</option>
                  <option value="MA">Massachusetts</option>
                  <option value="VA">Virginia</option>
                  <option value="WA">Washington</option>
                  <option value="AZ">Arizona</option>
                  <option value="TN">Tennessee</option>
                  <option value="IN">Indiana</option>
                  <option value="MO">Missouri</option>
                  <option value="MD">Maryland</option>
                  <option value="WI">Wisconsin</option>
                  <option value="CO">Colorado</option>
                  <option value="MN">Minnesota</option>
                  <option value="SC">South Carolina</option>
                  <option value="AL">Alabama</option>
                  <option value="LA">Louisiana</option>
                  <option value="KY">Kentucky</option>
                  <option value="OR">Oregon</option>
                  <option value="OK">Oklahoma</option>
                  <option value="CT">Connecticut</option>
                  <option value="UT">Utah</option>
                  <option value="NV">Nevada</option>
                  <option value="NM">New Mexico</option>
                  <option value="WV">West Virginia</option>
                  <option value="NE">Nebraska</option>
                  <option value="ID">Idaho</option>
                  <option value="HI">Hawaii</option>
                  <option value="ME">Maine</option>
                  <option value="NH">New Hampshire</option>
                  <option value="RI">Rhode Island</option>
                  <option value="MT">Montana</option>
                  <option value="DE">Delaware</option>
                  <option value="SD">South Dakota</option>
                  <option value="ND">North Dakota</option>
                  <option value="AK">Alaska</option>
                  <option value="VT">Vermont</option>
                  <option value="WY">Wyoming</option>
                  <option value="DC">District of Columbia</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone (optional)</label>
              <input
                type="tel"
                value={surveyData.phone}
                onChange={(e) => updateSurveyData('phone', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Display preferred name if different from first name */}
            {surveyData.preferred_name && surveyData.preferred_name !== surveyData.first_name && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your therapist will address you as "{surveyData.preferred_name}"
                </p>
              </div>
            )}

            {/* Display insurance verification info if available */}
            {formData.verificationData?.benefits && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Insurance Verified:</strong> Your estimated costs are{' '}
                  {formData.verificationData.benefits.copay && `Copay: ${formData.verificationData.benefits.copay}`}
                  {formData.verificationData.benefits.memberObligation !== "$0.00" && 
                    `, Session cost: ${formData.verificationData.benefits.memberObligation}`}
                </p>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Therapist Preferences</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">What areas would you like your therapist to specialize in?*</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Anxiety', 'Depression', 'Trauma', 'Relationship challenges', 'Life transitions',
                  'LGBTQ+ identity', 'Eating disorders', 'ADHD', 'OCD', 'Bipolar Disorder',
                  'Substance use', 'Career stress', 'Family life', 'Building confidence',
                  'Stress and burnout', 'Body image', 'Panic attacks', 'Phobias'
                ].map((specialty) => (
                  <label key={specialty} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={surveyData.therapist_specializes_in.includes(specialty)}
                      onChange={(e) => {
                        const current = surveyData.therapist_specializes_in;
                        if (e.target.checked) {
                          updateSurveyData('therapist_specializes_in', [...current, specialty]);
                        } else {
                          updateSurveyData('therapist_specializes_in', current.filter(s => s !== specialty));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{specialty}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Do you have a preference for your therapist's gender identity?</label>
              <select
                value={surveyData.therapist_identifies_as}
                onChange={(e) => updateSurveyData('therapist_identifies_as', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="No preference">No preference</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
          </div>
        );

      case 'mental_health':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Mental Health Assessment</h2>
            <p className="text-center text-gray-600 mb-6">
              Over the last 2 weeks, how often have you been bothered by any of the following problems?
            </p>
            
            {[
              { key: 'pleasure_doing_things', label: 'Little interest or pleasure in doing things' },
              { key: 'feeling_down', label: 'Feeling down, depressed, or hopeless' },
              { key: 'trouble_falling', label: 'Trouble falling or staying asleep, or sleeping too much' },
              { key: 'feeling_tired', label: 'Feeling tired or having little energy' },
              { key: 'poor_appetite', label: 'Poor appetite or overeating' },
              { key: 'feeling_bad_about_yourself', label: 'Feeling bad about yourself or that you are a failure' },
              { key: 'trouble_concentrating', label: 'Trouble concentrating on things' },
              { key: 'moving_or_speaking_so_slowly', label: 'Moving or speaking slowly, or being fidgety/restless' },
              { key: 'suicidal_thoughts', label: 'Thoughts that you would be better off dead' }
            ].map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="block text-sm font-medium">{item.label}*</label>
                <div className="flex space-x-4">
                  {[
                    { value: 'Not at all', label: 'Not at all' },
                    { value: 'Several days', label: 'Several days' },
                    { value: 'More than half the days', label: 'More than half the days' },
                    { value: 'Nearly every day', label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name={item.key}
                        value={option.value}
                        checked={surveyData[item.key as keyof SurveyData] === option.value}
                        onChange={(e) => updateSurveyData(item.key as keyof SurveyData, e.target.value)}
                        required
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'anxiety':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Anxiety Assessment</h2>
            <p className="text-center text-gray-600 mb-6">
              Over the last 2 weeks, how often have you been bothered by the following problems?
            </p>
            
            {[
              { key: 'feeling_nervous', label: 'Feeling nervous, anxious, or on edge' },
              { key: 'not_control_worrying', label: 'Not being able to stop or control worrying' },
              { key: 'worrying_too_much', label: 'Worrying too much about different things' },
              { key: 'trouble_relaxing', label: 'Trouble relaxing' },
              { key: 'being_so_restless', label: 'Being so restless that it is hard to sit still' },
              { key: 'easily_annoyed', label: 'Becoming easily annoyed or irritable' },
              { key: 'feeling_afraid', label: 'Feeling afraid, as if something awful might happen' }
            ].map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="block text-sm font-medium">{item.label}*</label>
                <div className="flex space-x-4">
                  {[
                    { value: 'Not at all', label: 'Not at all' },
                    { value: 'Several days', label: 'Several days' },
                    { value: 'More than half the days', label: 'More than half the days' },
                    { value: 'Nearly every day', label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name={item.key}
                        value={option.value}
                        checked={surveyData[item.key as keyof SurveyData] === option.value}
                        onChange={(e) => updateSurveyData(item.key as keyof SurveyData, e.target.value)}
                        required
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'additional':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Additional Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">What brings you to therapy today?*</label>
              <textarea
                value={surveyData.what_brings_you}
                onChange={(e) => updateSurveyData('what_brings_you', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="Please share what's motivating you to seek therapy at this time..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Do any of these lived experiences apply to you? (Optional)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'LGBTQ+ community member',
                  'First-generation college student', 
                  'Immigration background',
                  'Parent/caregiver',
                  'Career professional',
                  'Student',
                  'Religious/spiritual',
                  'Neurodivergent',
                  'Chronic illness/disability',
                  'Military/veteran'
                ].map((experience) => (
                  <label key={experience} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={surveyData.lived_experiences.includes(experience)}
                      onChange={(e) => {
                        const current = surveyData.lived_experiences;
                        if (e.target.checked) {
                          updateSurveyData('lived_experiences', [...current, experience]);
                        } else {
                          updateSurveyData('lived_experiences', current.filter(exp => exp !== experience));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{experience}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">University/School (Optional)</label>
              <input
                type="text"
                value={surveyData.university}
                onChange={(e) => updateSurveyData('university', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your university or school"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Promo Code (Optional)</label>
              <input
                type="text"
                value={surveyData.promo_code}
                onChange={(e) => updateSurveyData('promo_code', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter promo code if you have one"
              />
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
      case 'demographics':
        return surveyData.age && surveyData.gender && surveyData.state;
      case 'preferences':
        return surveyData.therapist_specializes_in.length > 0;
      case 'mental_health':
        return surveyData.pleasure_doing_things && surveyData.feeling_down && 
               surveyData.trouble_falling && surveyData.feeling_tired &&
               surveyData.poor_appetite && surveyData.feeling_bad_about_yourself &&
               surveyData.trouble_concentrating && surveyData.moving_or_speaking_so_slowly &&
               surveyData.suicidal_thoughts;
      case 'anxiety':
        return surveyData.feeling_nervous && surveyData.not_control_worrying &&
               surveyData.worrying_too_much && surveyData.trouble_relaxing &&
               surveyData.being_so_restless && surveyData.easily_annoyed &&
               surveyData.feeling_afraid;
      case 'additional':
        return surveyData.what_brings_you.trim().length > 0;
      default:
        return false;
    }
  };

  // Special handling for video, safety screening, and therapist matching steps - no progress bar or card wrapper
  if (currentStep === 'video' || currentStep === 'safety_screening' || currentStep === 'therapist_matching' || currentStep === 'therapist_search' || currentStep === 'therapist_preferences' || currentStep === 'alcohol_drugs') {
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