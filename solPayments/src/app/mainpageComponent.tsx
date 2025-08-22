'use client';

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, User, Mail, CheckCircle, ExternalLink } from "lucide-react";
import Image from "next/image";
import CustomSurvey from "@/components/CustomSurvey";
import OnboardingFlow from "@/components/OnboardingFlow";
import MatchedTherapist from "@/components/MatchedTherapist";
import { TherapistProvider } from "@/providers/TherapistProvider";
import { 
  useAppointmentsService,
  type BookAppointmentResponse 
} from "@/api/services";
import { usePollFormAndRequestMatch } from "@/api/hooks/usePollFormAndRequestMatch";
import axiosInstance from "@/api/axios";
import IntakeQService from "@/api/services/intakeqService";
import { sendMandatoryForm } from "@/app/api/intakeq";
import { STEPS } from "@/constants";

type PaymentType = "insurance" | "cash_pay";

// Interface for mandatory form API response
interface MandatoryFormResponse {
  success: boolean;
  intake_id?: string;
  intake_url?: string;
  client_id?: string;
  questionnaire_id?: string;
  intakeq_response?: Record<string, unknown>;
  error?: string;
}

// Comprehensive user data interface that includes ALL possible fields
interface ComprehensiveUserData {
  // Core Identity
  id?: string;
  response_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  phone?: string;
  
  // Assessment Scores (calculated)
  phq9_total?: number;
  gad7_total?: number;
  phq9_scores?: Record<string, string>;
  gad7_scores?: Record<string, string>;
  
  // Complete demographics
  age?: string;
  gender?: string;
  date_of_birth?: string;
  state?: string;
  race_ethnicity?: string[];
  lived_experiences?: string[];
  university?: string;
  
  // Therapy context
  what_brings_you?: string;
  therapist_gender_preference?: string;
  therapist_specialization?: string[];
  therapist_lived_experiences?: string[];
  
  // Substance screening
  alcohol_frequency?: string;
  recreational_drugs_frequency?: string;
  
  // Safety and matching
  safety_screening?: string;
  matching_preference?: string;
  
  // Selected therapist & appointment info
  selected_therapist?: {
    id: string;
    name: string;
    email: string;
    bio: string;
    specialties: string[];
    image_link?: string;
    states: string[];
    therapeutic_orientation?: string[];
  };
  
  // Appointment details
  appointment?: {
    date: string;
    time: string;
    timezone: string;
    duration: number;
    session_type: string;
  };
  
  // Insurance (if applicable)
  insurance_data?: {
    provider?: string;
    member_id?: string;
    date_of_birth?: string;
    verification_response?: Record<string, unknown>;
    benefits?: {
      copay?: string;
      deductible?: string;
      coinsurance?: string;
      oopMax?: string;
      remainingDeductible?: string;
      remainingOopMax?: string;
      memberObligation?: string;
      benefitStructure?: string;
    };
  };
  
  // Payment info
  payment_type?: string;
  
  // Tracking
  utm?: Record<string, string>;
  referred_by?: string | string[];
  onboarding_completed_at?: string;
  survey_completed_at?: string;
  last_updated?: string;
  
  // IntakeQ integration
  intakeq_client_id?: string;
  intakeq_intake_url?: string;
  
  // Mandatory form tracking
  mandatory_form_sent?: boolean;
  mandatory_form_intake_id?: string;
  mandatory_form_intake_url?: string;
}

// Extended client data interface (for backward compatibility)
interface ExtendedClientData extends ComprehensiveUserData {
  // Legacy fields for backward compatibility
  therapist_specializes_in?: string[];
  therapist_identifies_as?: string;
}

// BookingConfirmation Component
interface BookingConfirmationProps {
  bookingData: BookAppointmentResponse | null;
  currentUserData: ComprehensiveUserData | null;
  onBack: () => void;
}

function BookingConfirmation({ bookingData, currentUserData, onBack }: BookingConfirmationProps) {
  const [imageError, setImageError] = useState(false);

  // Handle image URL
  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink) return '';
    if (imageLink.startsWith('http://') || imageLink.startsWith('https://')) {
      return imageLink;
    }
    console.warn('Image link is not a full URL:', imageLink);
    return '';
  };

  // Format appointment date and time
  const formatAppointmentDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return { dateStr, timeStr, timezone };
  };

  // Handle portal setup
  const handlePortalSetup = () => {
    // This would route to portal setup - placeholder for now
    alert('Portal setup feature coming soon!');
  };

  if (!bookingData || !currentUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>
            Booking information not available
          </p>
          <Button onClick={onBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const appointment = currentUserData.appointment;
  const therapist = currentUserData.selected_therapist;
  const { dateStr, timeStr, timezone } = appointment ? 
    formatAppointmentDateTime(new Date(`${appointment.date} ${appointment.time}`).toISOString()) : 
    { dateStr: '', timeStr: '', timezone: '' };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header with Sol Health Logo */}
      <div className="relative h-20 overflow-hidden flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4 max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </button>
          
          {/* Sol Health Logo placeholder - you may need to add the actual logo */}
          <div className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
            Sol Health
          </div>
          
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="very-vogue-title text-3xl sm:text-4xl md:text-5xl text-gray-800 mb-2">
              A Warm Welcome to Sol, {currentUserData.preferred_name || currentUserData.first_name}!
            </h1>
          </div>

          {/* Therapist and Appointment Info Card */}
          <Card className="mb-8 bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
            <CardContent className="p-6 md:p-8">
              <div className="text-center space-y-6">
                {/* Therapist Profile */}
                <div className="flex flex-col items-center space-y-4">
                  {therapist?.image_link && !imageError ? (
                    <img
                      src={getImageUrl(therapist.image_link)}
                      alt={therapist.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                      <User className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h2 className="very-vogue-title text-2xl sm:text-3xl text-gray-800 mb-1">
                      {therapist?.name || 'Your Therapist'}
                    </h2>
                    <p className="text-lg text-gray-600" style={{ fontFamily: 'var(--font-inter)' }}>
                      {therapist?.bio?.includes('Limited Permit') ? 'Associate Therapist' : 'Graduate Therapist'}
                    </p>
                  </div>
                </div>

                {/* Appointment Information */}
                <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
                  <h3 className="very-vogue-title text-xl text-gray-800 mb-4">Your Session</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <p className="font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                        {dateStr}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <p className="font-medium text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                        {timeStr} ({timezone})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect Section */}
          <Card className="mb-8 bg-white border border-[#5C3106] rounded-3xl shadow-[1px_1px_0_#5C3106]">
            <CardContent className="p-6 md:p-8">
              <h3 className="very-vogue-title text-2xl sm:text-3xl text-gray-800 mb-6 text-center">
                What to Expect
              </h3>
              
              <div className="space-y-4 text-center max-w-2xl mx-auto">
                <p className="text-gray-700" style={{ fontFamily: 'var(--font-inter)' }}>
                  Your session confirmation and invite should land in your inbox shortly
                </p>
                
                <p className="text-gray-700" style={{ fontFamily: 'var(--font-inter)' }}>
                  Fill out the Mandatory New Client form (also in your inbox)
                </p>
                
                <p className="text-gray-700 mb-6" style={{ fontFamily: 'var(--font-inter)' }}>
                  Register to your new client portal below (takes 3 seconds!)
                </p>

                <Button
                  onClick={handlePortalSetup}
                  className="w-full max-w-md bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106] text-lg py-3"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Finish Portal Setup →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
              Questions?
            </p>
            
            <div className="space-y-2">
              <a 
                href="mailto:contact@solhealth.co"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                <Mail className="w-4 h-4" />
                Contact Us
              </a>
            </div>

            {/* Instagram Link */}
            <div className="mt-8">
              <a 
                href="https://instagram.com/solhealth" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                <ExternalLink className="w-4 h-4" />
                Follow us on Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  preferredName?: string;
  state?: string;
  dateOfBirth?: string;
  memberId?: string;
  provider?: string;
  paymentType?: string;
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
  };}

interface SurveyData {
  // Safety Screening
  safety_screening: string;
  
  // Therapist Matching
  matching_preference: string;
  selected_therapist?: string;
  
  // Therapist Preferences (for matching algorithm)
  therapist_gender_preference: string;
  therapist_specialization: string[];
  therapist_lived_experiences: string[];
  
  // Alcohol and Drugs Screening
  alcohol_frequency: string;
  recreational_drugs_frequency: string;
  
  // Demographics
  first_name: string;
  last_name: string;
  email: string;
  preferred_name?: string;
  phone?: string;
  age: string;
  gender: string;
  state: string;
  race_ethnicity: string[];
  
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
}

// No longer needed
// interface ModalContinueData {
//   type: string;
//   formData: FormData;
// }

export default function MainPageComponent() {
  // Add new state for onboarding
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep] = useState(0); // Track which step we're on
  const [onboardingData, setOnboardingData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
    whatBringsYou?: string;
  } | null>(null);
  
  // Modal states - no longer needed
  // const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<STEPS | null>(null);
  const [clientResponseId, setClientResponseId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookAppointmentResponse | null>(null);
  const [isSearchingAnotherTherapist, setIsSearchingAnotherTherapist] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [isIntakeQProcessing, setIsIntakeQProcessing] = useState(false);
  
  // Comprehensive user data state
  const [currentUserData, setCurrentUserData] = useState<ComprehensiveUserData | null>(null);

  // Appointments service
  const { bookAppointment } = useAppointmentsService();

  // Use the polling hook from the API
  const { matchData, loading, error, utmUserId, pollFormAndRequestMatch } = usePollFormAndRequestMatch();

  // No payment type persistence - always start fresh

  // Handle onboarding completion
  const handleOnboardingComplete = (
    data: {
      firstName: string;
      lastName: string;
      email: string;
      preferredName?: string;
      state?: string;
      provider?: string;
      memberId?: string;
      dateOfBirth?: string;
      paymentType?: string;
      whatBringsYou?: string;
      verificationData?: FormData['verificationData'];
    }
  ) => {
    console.log('🎯 ONBOARDING COMPLETE - Data received:', data);
    console.log('🎯 Payment type from onboarding:', data.paymentType);
    
    setOnboardingData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferredName: data.preferredName,
      state: data.state,
    });
    
    // Set payment type from onboarding data
    const paymentType = data.paymentType as PaymentType;
    console.log('🎯 Setting selectedPaymentType to:', paymentType);
    setSelectedPaymentType(paymentType);
    
    setFormData({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferredName: data.preferredName,
      state: data.state,
      provider: data.provider,
      memberId: data.memberId,
      dateOfBirth: data.dateOfBirth,
      paymentType: paymentType,
      verificationData: data.verificationData as FormData['verificationData']
    });
    
    setShowOnboarding(false);
    setCurrentStep(STEPS.TYPEFORM);
  };

  const handleSelectPaymentType = (type: PaymentType) => {
    console.log('🎯 Payment type selected:', type);
    setSelectedPaymentType(type);
  };

  // No longer needed - insurance is handled in onboarding flow
  // const handleModalContinue = (data: ModalContinueData) => {
  //   console.log('Modal continue with data:', data);
  //   // Merge onboarding data with insurance verification data
  //   setFormData({
  //     ...data.formData,
  //     ...(onboardingData || {})
  //   });
  //   setSelectedPaymentType(data.type as PaymentType);
  //   setCurrentStep(STEPS.TYPEFORM);
  // };

  // Updated to handle custom survey submission
  const handleSurveySubmit = useCallback(async (surveyData: SurveyData) => {
    console.log('🎯 Survey submitted with data:', surveyData);
    console.log('🎯 Current selectedPaymentType state:', selectedPaymentType);
    
    setCurrentStep(null); // Hide survey, show loading
    setIsProcessingResponse(true);

    try {
      // Generate a unique response ID
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      setClientResponseId(responseId);

      // Calculate assessment scores
      const calculatePHQ9Score = (scores: Record<string, string>): number => {
        const scoreMap = { "Not at all": 0, "Several days": 1, "More than half the days": 2, "Nearly every day": 3 };
        return Object.values(scores).reduce((total, answer) => total + (scoreMap[answer as keyof typeof scoreMap] || 0), 0);
      };

      const calculateGAD7Score = (scores: Record<string, string>): number => {
        const scoreMap = { "Not at all": 0, "Several days": 1, "More than half the days": 2, "Nearly every day": 3 };
        return Object.values(scores).reduce((total, answer) => total + (scoreMap[answer as keyof typeof scoreMap] || 0), 0);
      };

      // Calculate date of birth from age
      const calculateDateOfBirthFromAge = (age: string | number): string => {
        if (!age) return "";
        const ageNum = typeof age === 'string' ? parseInt(age) : age;
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) return "";
        
        const currentDate = new Date();
        const birthYear = currentDate.getFullYear() - ageNum;
        // Use January 1st as default since we only have age, not exact birth date
        const birthDate = new Date(birthYear, 0, 1); // January 1st of birth year
        return birthDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
      };

      // Build comprehensive user data with ALL collected information
      const comprehensiveUserData: ComprehensiveUserData = {
        // Core identity
        id: `client_${responseId}`,
        response_id: responseId,
        first_name: surveyData.first_name || formData?.firstName || onboardingData?.firstName || "",
        last_name: surveyData.last_name || formData?.lastName || onboardingData?.lastName || "",
        preferred_name: surveyData.preferred_name || formData?.preferredName || onboardingData?.preferredName,
        email: surveyData.email,
        phone: surveyData.phone,
        
        // Assessment scores with detailed breakdown
        phq9_scores: {
          pleasure_doing_things: surveyData.pleasure_doing_things,
          feeling_down: surveyData.feeling_down,
          trouble_falling: surveyData.trouble_falling,
          feeling_tired: surveyData.feeling_tired,
          poor_appetite: surveyData.poor_appetite,
          feeling_bad_about_yourself: surveyData.feeling_bad_about_yourself,
          trouble_concentrating: surveyData.trouble_concentrating,
          moving_or_speaking_so_slowly: surveyData.moving_or_speaking_so_slowly,
          suicidal_thoughts: surveyData.suicidal_thoughts
        },
        gad7_scores: {
          feeling_nervous: surveyData.feeling_nervous,
          not_control_worrying: surveyData.not_control_worrying,
          worrying_too_much: surveyData.worrying_too_much,
          trouble_relaxing: surveyData.trouble_relaxing,
          being_so_restless: surveyData.being_so_restless,
          easily_annoyed: surveyData.easily_annoyed,
          feeling_afraid: surveyData.feeling_afraid
        },
        
        // Calculate assessment totals
        phq9_total: calculatePHQ9Score({
          pleasure_doing_things: surveyData.pleasure_doing_things,
          feeling_down: surveyData.feeling_down,
          trouble_falling: surveyData.trouble_falling,
          feeling_tired: surveyData.feeling_tired,
          poor_appetite: surveyData.poor_appetite,
          feeling_bad_about_yourself: surveyData.feeling_bad_about_yourself,
          trouble_concentrating: surveyData.trouble_concentrating,
          moving_or_speaking_so_slowly: surveyData.moving_or_speaking_so_slowly,
          suicidal_thoughts: surveyData.suicidal_thoughts
        }),
        gad7_total: calculateGAD7Score({
          feeling_nervous: surveyData.feeling_nervous,
          not_control_worrying: surveyData.not_control_worrying,
          worrying_too_much: surveyData.worrying_too_much,
          trouble_relaxing: surveyData.trouble_relaxing,
          being_so_restless: surveyData.being_so_restless,
          easily_annoyed: surveyData.easily_annoyed,
          feeling_afraid: surveyData.feeling_afraid
        }),
        
        // Complete demographics
        age: surveyData.age,
        date_of_birth: (() => {
          // Prefer insurance DOB if available, otherwise calculate from age
          if (selectedPaymentType === 'insurance' && formData?.dateOfBirth) {
            console.log('📅 Using insurance verification DOB:', formData.dateOfBirth);
            return formData.dateOfBirth; // This is from insurance verification
          }
          const calculatedDOB = calculateDateOfBirthFromAge(surveyData.age);
          console.log('📅 Calculated DOB from age:', { age: surveyData.age, calculated_dob: calculatedDOB });
          return calculatedDOB;
        })(),
        gender: surveyData.gender,
        state: surveyData.state,
        race_ethnicity: surveyData.race_ethnicity,
        lived_experiences: surveyData.lived_experiences,
        university: surveyData.university,
        
        // Therapy context
        what_brings_you: onboardingData?.whatBringsYou,
        therapist_gender_preference: surveyData.therapist_gender_preference,
        therapist_specialization: surveyData.therapist_specialization,
        therapist_lived_experiences: surveyData.therapist_lived_experiences,
        
        // Substance screening
        alcohol_frequency: surveyData.alcohol_frequency,
        recreational_drugs_frequency: surveyData.recreational_drugs_frequency,
        
        // Safety and matching
        safety_screening: surveyData.safety_screening,
        matching_preference: surveyData.matching_preference,
        
        // Payment info
        payment_type: selectedPaymentType || undefined,
        
        // Insurance data (if applicable)
        ...(selectedPaymentType === 'insurance' && formData && (() => {
          console.log('💳 Insurance Data Processing:', {
            provider: formData.provider,
            member_id: formData.memberId,
            has_verification_data: !!formData.verificationData,
            has_benefits: !!formData.verificationData?.benefits,
            member_obligation: formData.verificationData?.benefits?.memberObligation,
            verification_data_keys: formData.verificationData ? Object.keys(formData.verificationData) : [],
            benefits_keys: formData.verificationData?.benefits ? Object.keys(formData.verificationData.benefits) : []
          });
          
          return {
            insurance_data: {
              provider: formData.provider,
              member_id: formData.memberId,
              date_of_birth: formData.dateOfBirth,
              verification_response: formData.verificationData,
              benefits: formData.verificationData?.benefits
            }
          };
        })()),
        
        // Tracking
        utm: {
          utm_source: 'sol_payments',
          utm_medium: 'direct',
          utm_campaign: 'onboarding'
        },
        referred_by: Array.isArray(surveyData.referred_by) ? surveyData.referred_by : (surveyData.referred_by ? [surveyData.referred_by] : undefined),
        onboarding_completed_at: new Date().toISOString(),
        survey_completed_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      // Store comprehensive user data in state for later use
      setCurrentUserData(comprehensiveUserData);

      console.log('📦 Comprehensive user data created:', {
        response_id: comprehensiveUserData.response_id,
        has_phq9_scores: !!comprehensiveUserData.phq9_scores,
        phq9_total: comprehensiveUserData.phq9_total,
        has_gad7_scores: !!comprehensiveUserData.gad7_scores,
        gad7_total: comprehensiveUserData.gad7_total,
        has_therapist_preferences: !!(comprehensiveUserData.therapist_gender_preference || comprehensiveUserData.therapist_specialization?.length),
        has_substance_data: !!(comprehensiveUserData.alcohol_frequency || comprehensiveUserData.recreational_drugs_frequency),
        has_demographics: !!(comprehensiveUserData.race_ethnicity?.length || comprehensiveUserData.lived_experiences?.length),
        payment_type: comprehensiveUserData.payment_type,
        total_fields: Object.keys(comprehensiveUserData).length
      });

      // Add payment type to survey data WITHOUT overwriting state
      const completeClientData = {
        ...surveyData,
        id: `client_${responseId}`,
        response_id: responseId,
        payment_type: selectedPaymentType,
        
        // Ensure onboarding data is preserved (especially preferred_name)
        preferred_name: surveyData.preferred_name || formData?.preferredName || onboardingData?.preferredName,
        first_name: surveyData.first_name || formData?.firstName || onboardingData?.firstName,
        
        // Add insurance information if available
        ...(selectedPaymentType === 'insurance' && formData && {
          insurance_provider: formData.provider,
          insurance_member_id: formData.memberId,
          insurance_date_of_birth: formData.dateOfBirth,
          insurance_verification_data: formData.verificationData ? JSON.stringify(formData.verificationData) : null,
        }),
        
        // REMOVED: state: 'completed' - keep the actual US state from survey
        utm: {
          utm_source: 'sol_payments',
          utm_medium: 'direct',
          utm_campaign: 'onboarding'
        }
      };

      console.log('📦 Complete client data being sent:', completeClientData);
      console.log('📦 Payment type in client data:', completeClientData.payment_type);

      // Store the client response directly in our backend
      const response = await axiosInstance.post('/clients_signup', completeClientData);
      console.log('✅ Client data stored:', response.data);

      // Both insurance and cash_pay flows use the SAME therapist-matching API call
      await pollFormAndRequestMatch(responseId);
      
    } catch (error) {
      console.error('❌ Error processing survey:', error);
      alert('Error processing your survey. Please try again.');
      setCurrentStep(STEPS.TYPEFORM);
    } finally {
      setIsProcessingResponse(false);
    }
  }, [selectedPaymentType, pollFormAndRequestMatch, formData, onboardingData]);

  const handleBackFromSurvey = () => {
    setCurrentStep(null);
    setSelectedPaymentType(null);
    setFormData(null);
    setShowOnboarding(true);
  };

  const handleBookSession = (bookedSession: BookAppointmentResponse) => {
    // Prevent duplicate processing of the same booking
    if (isBookingInProgress) {
      console.warn('⚠️ Booking already in progress, ignoring duplicate call');
      return;
    }
    
    console.log('✅ Session booked successfully:', bookedSession);
    setBookingData(bookedSession);
    setCurrentStep(STEPS.CONFIRMATION);
    setIsBookingInProgress(false); // Reset booking state
    
    // Enrich current user data with booking information
    if (currentUserData) {
      console.log('🔄 Enriching user data with booking information...');
      
      // Extract booking details from the response
      const enrichedUserData: ComprehensiveUserData = {
        ...currentUserData,
        // Note: We'll need to get therapist info from the booking context
        // This will be populated when we have the therapist data available
        last_updated: new Date().toISOString()
      };
      
      console.log('📋 Creating IntakeQ profile with enriched data:', {
        response_id: enrichedUserData.response_id,
        has_booking_data: !!bookedSession,
        total_fields: Object.keys(enrichedUserData).length
      });
      
      // Create comprehensive IntakeQ profile immediately
      createComprehensiveIntakeQProfile(enrichedUserData);
      
      // Update the user data state
      setCurrentUserData(enrichedUserData);
    } else {
      console.warn('⚠️ No currentUserData available for IntakeQ profile creation');
      console.log('Current state:', {
        currentUserData: currentUserData,
        bookedSession: bookedSession,
        clientResponseId: clientResponseId
      });
    }
  };

  const createComprehensiveIntakeQProfile = async (clientData: ComprehensiveUserData) => {
    // Prevent duplicate IntakeQ profile creation
    if (isIntakeQProcessing) {
      console.warn('⚠️ IntakeQ profile creation already in progress, skipping duplicate call');
      return;
    }
    
    try {
      setIsIntakeQProcessing(true);
      console.log('🔄 =================================================');
      console.log('🔄 CREATING COMPREHENSIVE INTAKEQ PROFILE');
      console.log('🔄 =================================================');
      
      console.log('📋 Client Overview:', {
        email: clientData.email,
        preferred_name: clientData.preferred_name,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        payment_type: clientData.payment_type,
        response_id: clientData.response_id
      });

      console.log('📊 Assessment Data:', {
        has_phq9_scores: !!(clientData.phq9_scores && Object.keys(clientData.phq9_scores).length > 0),
        phq9_total: clientData.phq9_total,
        has_gad7_scores: !!(clientData.gad7_scores && Object.keys(clientData.gad7_scores).length > 0),
        gad7_total: clientData.gad7_total,
        phq9_questions_answered: clientData.phq9_scores ? Object.keys(clientData.phq9_scores).length : 0,
        gad7_questions_answered: clientData.gad7_scores ? Object.keys(clientData.gad7_scores).length : 0
      });

      console.log('🎯 Therapy Preferences:', {
        therapist_gender_preference: clientData.therapist_gender_preference,
        specialization_count: clientData.therapist_specialization?.length || 0,
        lived_experience_count: clientData.therapist_lived_experiences?.length || 0,
        therapist_specializations: clientData.therapist_specialization,
        therapist_lived_experiences: clientData.therapist_lived_experiences
      });

      console.log('🔍 Substance Use Screening:', {
        alcohol_frequency: clientData.alcohol_frequency,
        recreational_drugs_frequency: clientData.recreational_drugs_frequency
      });

      console.log('👤 Demographics:', {
        age: clientData.age,
        gender: clientData.gender,
        state: clientData.state,
        race_ethnicity_count: clientData.race_ethnicity?.length || 0,
        lived_experiences_count: clientData.lived_experiences?.length || 0,
        university: clientData.university
      });

      console.log('💳 Insurance Data:', {
        has_insurance_data: !!(clientData.insurance_data?.provider),
        provider: clientData.insurance_data?.provider,
        member_id: clientData.insurance_data?.member_id,
        has_benefits: !!(clientData.insurance_data?.benefits)
      });

      console.log('👩‍⚕️ Selected Therapist:', {
        has_selected_therapist: !!(clientData.selected_therapist),
        therapist_name: clientData.selected_therapist?.name,
        therapist_email: clientData.selected_therapist?.email,
        therapist_specialties_count: clientData.selected_therapist?.specialties?.length || 0
      });

      console.log('📅 Appointment Info:', {
        has_appointment: !!(clientData.appointment),
        date: clientData.appointment?.date,
        time: clientData.appointment?.time,
        timezone: clientData.appointment?.timezone
      });

      const totalFieldsPopulated = Object.entries(clientData).filter(([, value]) => {
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
      }).length;

      console.log('📊 Data Completeness:', {
        total_fields_in_interface: Object.keys(clientData).length,
        total_fields_populated: totalFieldsPopulated,
        completeness_percentage: Math.round((totalFieldsPopulated / Object.keys(clientData).length) * 100)
      });

      // Convert comprehensive data to IntakeQ format
      const intakeQData = {
        ...clientData,
        // Flatten insurance data for backward compatibility
        ...(clientData.insurance_data && {
          insurance_provider: clientData.insurance_data.provider,
          insurance_member_id: clientData.insurance_data.member_id,
          insurance_date_of_birth: clientData.insurance_data.date_of_birth,
          insurance_verification_data: clientData.insurance_data.verification_response ? JSON.stringify(clientData.insurance_data.verification_response) : undefined,
          // Extract benefits if available
          ...(clientData.insurance_data.benefits && {
            copay: clientData.insurance_data.benefits.copay,
            deductible: clientData.insurance_data.benefits.deductible,
            coinsurance: clientData.insurance_data.benefits.coinsurance,
            out_of_pocket_max: clientData.insurance_data.benefits.oopMax,
            remaining_deductible: clientData.insurance_data.benefits.remainingDeductible,
            remaining_oop_max: clientData.insurance_data.benefits.remainingOopMax,
            member_obligation: clientData.insurance_data.benefits.memberObligation,
            benefit_structure: clientData.insurance_data.benefits.benefitStructure
          })
        }),
        // Flatten UTM data
        ...(clientData.utm && {
          utm_source: clientData.utm.utm_source,
          utm_medium: clientData.utm.utm_medium,
          utm_campaign: clientData.utm.utm_campaign
        })
      };

      console.log('🚀 Calling IntakeQ API with payload:', {
        payload_keys: Object.keys(intakeQData),
        payload_size: JSON.stringify(intakeQData).length,
        has_assessment_totals: !!(intakeQData.phq9_total !== undefined && intakeQData.gad7_total !== undefined),
        payment_type: intakeQData.payment_type
      });

      const intakeQResult = await IntakeQService.createClientProfile(intakeQData);
      
      console.log('📥 IntakeQ API Response:', {
        success: intakeQResult.success,
        client_id: intakeQResult.client_id,
        intake_url: intakeQResult.intake_url,
        error: intakeQResult.error
      });
      
      if (intakeQResult.success) {
        console.log('✅ =================================================');
        console.log('✅ INTAKEQ PROFILE CREATED SUCCESSFULLY!');
        console.log('✅ =================================================');
        console.log('✅ Profile Details:', {
          client_id: intakeQResult.client_id,
          intake_url: intakeQResult.intake_url,
          total_fields_sent: Object.keys(intakeQData).length,
          assessment_scores: {
            phq9_total: clientData.phq9_total,
            gad7_total: clientData.gad7_total
          },
          therapist_info: clientData.selected_therapist ? {
            name: clientData.selected_therapist.name,
            email: clientData.selected_therapist.email
          } : 'None selected',
          appointment_info: clientData.appointment ? {
            date: clientData.appointment.date,
            time: clientData.appointment.time
          } : 'None scheduled'
        });
        
        // Send mandatory form after successful client creation
        if (intakeQResult.client_id) {
          await sendMandatoryFormAfterBooking(intakeQResult.client_id, clientData);
        } else {
          console.warn('⚠️ No client_id available to send mandatory form');
        }
        
        // Update the user data state with IntakeQ info
        if (currentUserData) {
          setCurrentUserData({
            ...currentUserData,
            intakeq_client_id: intakeQResult.client_id,
            intakeq_intake_url: intakeQResult.intake_url,
            last_updated: new Date().toISOString()
          });
        }
        
        // Update the database with IntakeQ client ID
        if (intakeQResult.client_id && clientData.response_id) {
          try {
            await axiosInstance.patch(`/clients_signup/${clientData.response_id}`, {
              intakeq_client_id: intakeQResult.client_id,
              intakeq_intake_url: intakeQResult.intake_url
            });
            console.log('✅ Database updated with IntakeQ client ID');
          } catch (error) {
            console.warn('⚠️ Failed to update database with IntakeQ ID:', error);
          }
        }
      } else {
        console.error('❌ =================================================');
        console.error('❌ INTAKEQ PROFILE CREATION FAILED!');
        console.error('❌ =================================================');
        console.error('❌ Error Details:', {
          error: intakeQResult.error,
          payload_size: Object.keys(intakeQData).length,
          payment_type: intakeQData.payment_type,
          client_email: intakeQData.email
        });
      }
      
    } catch (error) {
      console.error('❌ =================================================');
      console.error('❌ EXCEPTION IN INTAKEQ PROFILE CREATION!');
      console.error('❌ =================================================');
      console.error('❌ Exception Details:', {
        error: error,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : 'No stack trace',
        client_data_available: !!clientData,
        response_id: clientData?.response_id
      });
    } finally {
      setIsIntakeQProcessing(false);
    }
  };

  // Function to send mandatory form after successful booking
  const sendMandatoryFormAfterBooking = async (clientId: string, clientData: ComprehensiveUserData) => {
    try {
      console.log('📋 =================================================');
      console.log('📋 SENDING MANDATORY INTAKEQ FORM');
      console.log('📋 =================================================');
      
      // Determine payment type from client data
      const paymentType = clientData.payment_type || 'cash_pay';
      console.log('💳 Payment type:', paymentType);
      
      // Prepare form data
      const formData = {
        payment_type: paymentType,
        client_id: clientId,
        // Add practitioner/therapist ID if available
        practitioner_id: clientData.selected_therapist?.id || undefined,
        // Add therapist email for practitioner identification
        therapist_email: clientData.selected_therapist?.email || undefined,
        // Add external client ID for tracking
        external_client_id: clientData.response_id
      };
      
      console.log('📤 Form data being sent:', formData);
      
      // Send the mandatory form
      const formResult = await sendMandatoryForm(formData) as MandatoryFormResponse;
      
      console.log('📥 Mandatory form response:', {
        success: formResult.success,
        intake_id: formResult.intake_id,
        intake_url: formResult.intake_url,
        questionnaire_id: formResult.questionnaire_id
      });
      
      if (formResult.success) {
        console.log('✅ =================================================');
        console.log('✅ MANDATORY FORM SENT SUCCESSFULLY!');
        console.log('✅ =================================================');
        console.log('✅ Form Details:', {
          intake_id: formResult.intake_id,
          intake_url: formResult.intake_url,
          client_id: clientId,
          payment_type: paymentType,
          therapist_name: clientData.selected_therapist?.name || 'Not specified',
          client_name: `${clientData.first_name} ${clientData.last_name}`.trim()
        });
        
        // Update user data with form information
        if (currentUserData) {
          setCurrentUserData({
            ...currentUserData,
            mandatory_form_sent: true,
            mandatory_form_intake_id: formResult.intake_id,
            mandatory_form_intake_url: formResult.intake_url,
            last_updated: new Date().toISOString()
          });
        }
        
        // Update database with form information (temporarily disabled until schema is updated)
        if (clientData.response_id) {
          try {
            // Only update with existing fields for now
            await axiosInstance.patch(`/clients_signup/${clientData.response_id}`, {
              // mandatory_form_sent: true,  // TODO: Enable after schema update
              // mandatory_form_intake_id: formResult.intake_id,
              // mandatory_form_intake_url: formResult.intake_url,
              // mandatory_form_sent_at: new Date().toISOString()
            });
            console.log('✅ Database updated (mandatory form tracking temporarily disabled)');
          } catch (dbError) {
            console.warn('⚠️ Failed to update database:', dbError);
            // Don't fail the flow if database update fails
          }
        }
        
      } else {
        console.error('❌ Failed to send mandatory form:', formResult);
      }
      
    } catch (error) {
      console.error('❌ =================================================');
      console.error('❌ EXCEPTION IN MANDATORY FORM SENDING!');
      console.error('❌ =================================================');
      console.error('❌ Exception Details:', {
        error: error,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : 'No stack trace',
        client_id: clientId,
        client_data_available: !!clientData,
        response_id: clientData?.response_id
      });
      
      // Don't throw the error - we don't want to break the booking flow
      // if the mandatory form fails to send
      console.warn('⚠️ Mandatory form sending failed, but continuing with booking flow');
    }
  };

  const handleShowBookingSection = useCallback(() => {
    // Additional logic when showing booking section
  }, []);

  const handleHideBookingSection = useCallback(() => {
    // Additional logic when hiding booking section
  }, []);

  // Effect to handle match results
  useEffect(() => {
    if (matchData?.therapists) {
      if (matchData.therapists.length > 0) {
        setCurrentStep(STEPS.MATCHED_THERAPIST);
      } else {
        setCurrentStep(STEPS.NO_MATCH);
      }

      console.log('📦 Match data received:', {
        paymentType: selectedPaymentType,
        therapistsReturned: matchData.therapists.length,
        therapists: matchData.therapists,
      });
    }
  }, [matchData?.therapists, selectedPaymentType]);

  // If showing onboarding flow
  if (showOnboarding) {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        onSelectPaymentType={handleSelectPaymentType}
        initialStep={onboardingStep} // Pass the current step
      />
    );
  }

  // If we're in loading state, show loading
  if (loading || isProcessingResponse || isBookingInProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">
            {isBookingInProgress ? 'Booking your session...' : 
             isProcessingResponse ? 'Processing your responses...' : 
             'Finding your perfect therapist match...'}
          </p>
        </div>
      </div>
    );
  }

  // If we have an error, show error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // If showing Custom Survey, render it
  if (currentStep === STEPS.TYPEFORM) {
    return (
      <CustomSurvey
        paymentType={selectedPaymentType || "insurance"}
        formData={{
          firstName: formData?.firstName || onboardingData?.firstName || "",
          lastName: formData?.lastName || onboardingData?.lastName || "",
          email: formData?.email || onboardingData?.email || "",
          preferredName: formData?.preferredName || onboardingData?.preferredName || "",
          state: formData?.state || onboardingData?.state || "", // Pass the state from onboarding
          provider: formData?.provider || "", // Insurance provider
          paymentType: formData?.paymentType || selectedPaymentType || "",
          dateOfBirth: formData?.dateOfBirth || "", // Insurance date of birth
          memberId: formData?.memberId || "", // Insurance member ID
          verificationData: formData?.verificationData || undefined // Insurance verification response
        }}
        onSubmit={handleSurveySubmit}
        onBack={handleBackFromSurvey}
      />
    );
  }

  // If we have matched therapists or other steps, show with TherapistProvider
  if (currentStep === STEPS.MATCHED_THERAPIST || currentStep === STEPS.CONFIRMATION || currentStep === STEPS.NO_MATCH) {
    return (
      <TherapistProvider
        initialTherapistsList={matchData?.therapists || []}
        clientResponseId={clientResponseId}
        bookingData={bookingData}
        onBookSession={handleBookSession}
        onShowBooking={handleShowBookingSection}
        onHideBooking={handleHideBookingSection}
        setIsSearchingAnotherTherapist={setIsSearchingAnotherTherapist}
        utmUserId={utmUserId}
      >
        {isSearchingAnotherTherapist ? (
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-medium">Finding another therapist...</p>
            </div>
          </div>
        ) : (
          <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
            {currentStep === STEPS.MATCHED_THERAPIST && matchData?.therapists && matchData.therapists.length > 0 && (() => {
              const clientData = {
                ...matchData.client,
                payment_type: selectedPaymentType || (matchData.client as ExtendedClientData)?.payment_type,
                response_id: clientResponseId || (matchData.client as ExtendedClientData)?.response_id,
              };
              
              console.log('🔍 CLIENT DATA DEBUG - Passing to MatchedTherapist:');
              console.log('selectedPaymentType:', selectedPaymentType);
              console.log('matchData.client:', matchData.client);
              console.log('final clientData:', clientData);
              
              return (
                <MatchedTherapist
                  therapistsList={matchData.therapists}
                  clientData={clientData}
                  initialIndex={0}
                  onBack={() => {
                    setCurrentStep(STEPS.TYPEFORM);
                    setClientResponseId(null);
                  }}
                  onBookSession={async (therapistData, slot) => {
                    // Prevent duplicate booking attempts
                    if (isBookingInProgress) {
                      console.warn('⚠️ Booking already in progress, ignoring duplicate attempt');
                      return;
                    }
                    
                    try {
                      setIsBookingInProgress(true);
                      const therapist = therapistData.therapist;
                      
                      // Enrich current user data with selected therapist info BEFORE booking
                      if (currentUserData) {
                        const therapistInfo = {
                          id: therapist.id || therapist.email || 'unknown',
                          name: therapist.intern_name || 'Unknown',
                          email: therapist.email || '',
                          bio: therapist.biography || '',
                          specialties: therapist.specialities || [],
                          image_link: therapist.image_link || undefined,
                          states: therapist.states || [],
                          therapeutic_orientation: therapist.therapeutic_orientation || []
                        };
                        
                        const appointmentInfo = {
                          date: new Date(slot).toLocaleDateString(),
                          time: new Date(slot).toLocaleTimeString(),
                          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                          duration: 45,
                          session_type: 'initial'
                        };
                        
                        const enrichedData = {
                          ...currentUserData,
                          selected_therapist: therapistInfo,
                          appointment: appointmentInfo,
                          last_updated: new Date().toISOString()
                        };
                        
                        console.log('🎯 Enriching user data with therapist selection:', {
                          therapist_name: therapistInfo.name,
                          therapist_specialties: therapistInfo.specialties,
                          appointment_date: appointmentInfo.date,
                          appointment_time: appointmentInfo.time
                        });
                        
                        setCurrentUserData(enrichedData);
                      }
                      
                      const bookedSession = await bookAppointment.makeRequest({
                        data: {
                          client_response_id: clientResponseId as string,
                          therapist_email: therapist.email || '',
                          therapist_name: therapist.intern_name || '',
                          datetime: slot,
                          send_client_email_notification: true,
                          reminder_type: 'email',
                          status: 'scheduled',
                        },
                      });

                      handleBookSession(bookedSession);
                    } catch (error) {
                      console.error('Error booking appointment:', error);
                      setIsBookingInProgress(false); // Reset on error
                      alert('Failed to book appointment. Please try again.');
                    }
                  }}
                />
              );
            })()}
                        
            {currentStep === STEPS.CONFIRMATION && (
              <BookingConfirmation 
                bookingData={bookingData}
                currentUserData={currentUserData}
                onBack={() => {
                  setCurrentStep(null);
                  setBookingData(null);
                  setShowOnboarding(true);
                }}
              />
            )}
            
            {currentStep === STEPS.NO_MATCH && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">No matches found</h2>
                <p className="text-gray-600 mb-4">We couldn't find any therapists matching your preferences for {selectedPaymentType} clients.</p>
                <Button onClick={handleBackFromSurvey}>
                  Update Preferences
                </Button>
              </div>
            )}
          </div>
        )}
      </TherapistProvider>
    );
  }

  // Default fallback - should not normally reach here
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Loading...</h2>
        <p className="text-gray-600">Preparing your experience...</p>
      </div>
    </div>
  );
} 