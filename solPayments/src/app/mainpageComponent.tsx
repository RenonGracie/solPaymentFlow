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
import { STEPS } from "@/constants";

type PaymentType = "insurance" | "cash_pay";

// Extended client data interface that includes all possible fields
interface ExtendedClientData {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  preferred_name?: string;
  response_id?: string;
  state?: string;
  phone?: string;
  gender?: string;
  age?: string;
  payment_type?: string;
  // Mental health screening fields
  pleasure_doing_things?: string;
  feeling_down?: string;
  trouble_falling?: string;
  feeling_tired?: string;
  poor_appetite?: string;
  feeling_bad_about_yourself?: string;
  trouble_concentrating?: string;
  moving_or_speaking_so_slowly?: string;
  suicidal_thoughts?: string;
  feeling_nervous?: string;
  not_control_worrying?: string;
  worrying_too_much?: string;
  trouble_relaxing?: string;
  being_so_restless?: string;
  easily_annoyed?: string;
  feeling_afraid?: string;
  // Therapy preferences
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
      verificationData: data.verificationData as FormData['verificationData']
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
    
    // Create IntakeQ profile after successful booking
    createIntakeQProfile(bookedSession);
  };

  // Create IntakeQ profile for the client
  const createIntakeQProfile = async (bookedSession: BookAppointmentResponse) => {
    try {
      if (!matchData?.client || !selectedPaymentType) {
        console.warn('Missing client data or payment type for IntakeQ profile creation');
        return;
      }

      // Prepare client data for IntakeQ
      const clientData: IntakeQClientData = {
        response_id: (bookedSession as ExtendedBookAppointmentResponse)?.ClientResponseId || clientResponseId || '',
        first_name: matchData.client?.first_name || formData?.firstName || onboardingData?.firstName || '',
        last_name: matchData.client?.last_name || formData?.lastName || onboardingData?.lastName || '',
        preferred_name: (matchData.client as ExtendedClientData)?.preferred_name || formData?.preferredName || onboardingData?.preferredName,
        email: matchData.client?.email || formData?.email || '',
        phone: (matchData.client as ExtendedClientData)?.phone || '',
        state: (matchData.client as ExtendedClientData)?.state || formData?.state || '',
        gender: (matchData.client as ExtendedClientData)?.gender || '',
        payment_type: selectedPaymentType,
        
        // Insurance-specific data (only for insurance clients)
        ...(selectedPaymentType === 'insurance' && formData && {
          insurance_provider: formData.provider,
          insurance_member_id: formData.memberId,
          insurance_date_of_birth: formData.dateOfBirth,
          insurance_verification_data: formData.verificationData ? JSON.stringify(formData.verificationData) : undefined,
        }),
        
        // Mental health screening data
        phq9_scores: {
          pleasure_doing_things: (matchData.client as ExtendedClientData)?.pleasure_doing_things || '',
          feeling_down: (matchData.client as ExtendedClientData)?.feeling_down || '',
          trouble_falling: (matchData.client as ExtendedClientData)?.trouble_falling || '',
          feeling_tired: (matchData.client as ExtendedClientData)?.feeling_tired || '',
          poor_appetite: (matchData.client as ExtendedClientData)?.poor_appetite || '',
          feeling_bad_about_yourself: (matchData.client as ExtendedClientData)?.feeling_bad_about_yourself || '',
          trouble_concentrating: (matchData.client as ExtendedClientData)?.trouble_concentrating || '',
          moving_or_speaking_so_slowly: (matchData.client as ExtendedClientData)?.moving_or_speaking_so_slowly || '',
          suicidal_thoughts: (matchData.client as ExtendedClientData)?.suicidal_thoughts || '',
        },
        
        gad7_scores: {
          feeling_nervous: (matchData.client as ExtendedClientData)?.feeling_nervous || '',
          not_control_worrying: (matchData.client as ExtendedClientData)?.not_control_worrying || '',
          worrying_too_much: (matchData.client as ExtendedClientData)?.worrying_too_much || '',
          trouble_relaxing: (matchData.client as ExtendedClientData)?.trouble_relaxing || '',
          being_so_restless: (matchData.client as ExtendedClientData)?.being_so_restless || '',
          easily_annoyed: (matchData.client as ExtendedClientData)?.easily_annoyed || '',
          feeling_afraid: (matchData.client as ExtendedClientData)?.feeling_afraid || '',
        },
        
        // Therapy preferences
        therapist_specializes_in: (matchData.client as ExtendedClientData)?.therapist_specializes_in || [],
        therapist_identifies_as: (matchData.client as ExtendedClientData)?.therapist_identifies_as || '',
      };

      console.log('🔄 Creating IntakeQ profile for client:', {
        email: clientData.email,
        payment_type: clientData.payment_type,
        preferred_name: clientData.preferred_name,
        has_insurance_data: !!(clientData.insurance_provider)
      });

      const intakeQResult = await IntakeQService.createClientProfile(clientData);
      
      if (intakeQResult.success) {
        console.log('✅ IntakeQ profile created successfully:', {
          client_id: intakeQResult.client_id,
          intake_url: intakeQResult.intake_url
        });
        
        // Optionally update the database with IntakeQ client ID
        const responseId = (bookedSession as ExtendedBookAppointmentResponse)?.ClientResponseId;
        if (intakeQResult.client_id && responseId) {
          try {
            await axiosInstance.patch(`/clients_signup/${responseId}`, {
              intakeq_client_id: intakeQResult.client_id,
              intakeq_intake_url: intakeQResult.intake_url
            });
            console.log('✅ Database updated with IntakeQ client ID');
          } catch (error) {
            console.warn('⚠️ Failed to update database with IntakeQ ID:', error);
          }
        }
      } else {
        console.error('❌ IntakeQ profile creation failed:', intakeQResult.error);
      }
      
    } catch (error) {
      console.error('❌ Error creating IntakeQ profile:', error);
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