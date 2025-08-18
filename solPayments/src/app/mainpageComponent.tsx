'use client';

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
// import InsuranceVerificationModal from "@/components/InsuranceVerificationModal"; // No longer needed
import CustomSurvey from "@/components/CustomSurvey";
import OnboardingFlow from "@/components/OnboardingFlow"; // New component
import { TherapistProvider } from "@/providers/TherapistProvider";
import { usePollFormAndRequestMatch } from "@/api/hooks/usePollFormAndRequestMatch";
import { STEPS } from "@/constants";
import { BookAppointmentResponse } from "@/api/services";
import axiosInstance from '@/api/axios';
import MatchedTherapist from "@/components/MatchedTherapist";
import { useAppointmentsService } from "@/api/services";

type PaymentType = "insurance" | "cash_pay";

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

  // Appointments service
  const { bookAppointment } = useAppointmentsService();

  // Use the polling hook from the API
  const { matchData, loading, error, utmUserId, pollFormAndRequestMatch } = usePollFormAndRequestMatch();

  // Check for existing payment type on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !selectedPaymentType) {
      try {
        const savedPaymentType = localStorage.getItem('sol_payment_type');
        const urlPaymentType = new URLSearchParams(window.location.search).get('payment_type');
        
        console.log('🔍 Initial payment type check:');
        console.log('- localStorage:', savedPaymentType);
        console.log('- URL param:', urlPaymentType);
        
        const paymentType = urlPaymentType || savedPaymentType;
        if (paymentType === 'cash_pay' || paymentType === 'insurance') {
          console.log('✅ Restoring payment type from storage:', paymentType);
          setSelectedPaymentType(paymentType as PaymentType);
        }
      } catch (e) {
        console.warn('Failed to check stored payment type:', e);
      }
    }
  }, [selectedPaymentType]);

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
      verificationData?: any;
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
    
    // Store payment type in localStorage for persistence
    try {
      localStorage.setItem('sol_payment_type', paymentType);
      console.log('🎯 Stored payment type in localStorage:', paymentType);
    } catch (e) {
      console.warn('Failed to store payment type in localStorage:', e);
    }
    
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
      verificationData: data.verificationData
    });
    
    setShowOnboarding(false);
    setCurrentStep(STEPS.TYPEFORM);
  };

  const handleSelectPaymentType = (type: PaymentType) => {
    console.log('🎯 Payment type selected:', type);
    setSelectedPaymentType(type);
    
    // Store in localStorage for persistence across reloads
    try {
      localStorage.setItem('sol_payment_type', type);
      console.log('🎯 Stored payment type in localStorage:', type);
    } catch (e) {
      console.warn('Failed to store payment type in localStorage:', e);
    }
    
    // Also add to URL for debugging and consistency
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('payment_type', type);
      window.history.replaceState({}, '', url.toString());
      console.log('🎯 Added payment_type to URL:', type);
    }

    // The onboarding flow will call handleOnboardingComplete when fully done
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
    console.log('🎯 Payment type from localStorage:', localStorage.getItem('sol_payment_type'));
    
    setCurrentStep(null); // Hide survey, show loading
    setIsProcessingResponse(true);

    try {
      // Generate a unique response ID
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setClientResponseId(responseId);

      // Add payment type to survey data WITHOUT overwriting state
      const completeClientData = {
        ...surveyData,
        id: `client_${responseId}`,
        response_id: responseId,
        payment_type: selectedPaymentType,
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
  }, [selectedPaymentType, pollFormAndRequestMatch]);

  const handleBackFromSurvey = () => {
    setCurrentStep(null);
    setSelectedPaymentType(null);
    setFormData(null);
    setShowOnboarding(true);
  };

  const handleBookSession = useCallback((bookedSessionData: BookAppointmentResponse) => {
    setBookingData(bookedSessionData);
    setCurrentStep(STEPS.CONFIRMATION);
  }, []);

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
                payment_type: selectedPaymentType || (matchData.client as any)?.payment_type,
                response_id: clientResponseId || matchData.client?.response_id,
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