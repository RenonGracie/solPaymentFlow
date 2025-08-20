'use client';

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import IntakeQService, { type IntakeQClientData } from "@/api/services/intakeqService";
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

// Extended booking response that includes all possible fields
interface ExtendedBookAppointmentResponse extends BookAppointmentResponse {
  ClientResponseId?: string;
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
  const [onboardingStep, setOnboardingStep] = useState(0); // Track which step we're on
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
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    console.log('✅ Session booked successfully:', bookedSession);
    setBookingData(bookedSession);
    setCurrentStep(STEPS.CONFIRMATION);
    
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
    try {
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
        
        // Optionally update database with form information
        if (clientData.response_id) {
          try {
            await axiosInstance.patch(`/clients_signup/${clientData.response_id}`, {
              mandatory_form_sent: true,
              mandatory_form_intake_id: formResult.intake_id,
              mandatory_form_intake_url: formResult.intake_url,
              mandatory_form_sent_at: new Date().toISOString()
            });
            console.log('✅ Database updated with mandatory form info');
          } catch (dbError) {
            console.warn('⚠️ Failed to update database with mandatory form info:', dbError);
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
  if (loading || isProcessingResponse) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">
            {isProcessingResponse ? 'Processing your responses...' : 'Finding your perfect therapist match...'}
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
                    try {
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
                      alert('Failed to book appointment. Please try again.');
                    }
                  }}
                />
              );
            })()}
                        
            {currentStep === STEPS.CONFIRMATION && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
                <p className="text-gray-600">Your session has been booked successfully.</p>
              </div>
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