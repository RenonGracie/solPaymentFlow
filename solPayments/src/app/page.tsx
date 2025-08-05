"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import InsuranceVerificationModal from "@/components/InsuranceVerificationModal";
import SquarePaymentModal from "@/components/SquarePaymentModal";
import CustomSurvey from "@/components/CustomSurvey";
import { TherapistProvider } from "@/providers/TherapistProvider";
import { usePollFormAndRequestMatch } from "@/api/hooks/usePollFormAndRequestMatch";
import { STEPS } from "@/constants";
import { BookAppointmentResponse } from "@/api/services";
import Image from "next/image";
import axiosInstance from '@/api/axios';
import MatchedTherapist from "@/components/MatchedTherapist";
import { useAppointmentsService } from "@/api/services";


type PaymentType = "insurance" | "cash_pay";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  memberId?: string;
  provider?: string;
  paymentType?: string;
}

interface SurveyData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  age: string;
  gender: string;
  state: string;
  therapist_specializes_in: string[];
  therapist_identifies_as: string;
  pleasure_doing_things: string;
  feeling_down: string;
  trouble_falling: string;
  feeling_tired: string;
  poor_appetite: string;
  feeling_bad_about_yourself: string;
  trouble_concentrating: string;
  moving_or_speaking_so_slowly: string;
  suicidal_thoughts: string;
  feeling_nervous: string;
  not_control_worrying: string;
  worrying_too_much: string;
  trouble_relaxing: string;
  being_so_restless: string;
  easily_annoyed: string;
  feeling_afraid: string;
  what_brings_you: string;
  lived_experiences: string[];
  university?: string;
  promo_code?: string;
  referred_by?: string;
}

interface ModalContinueData {
  type: string;
  formData: FormData;
}

export default function Home() {
  // Modal states
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  
  // New state for integrated flow
  const [currentStep, setCurrentStep] = useState<STEPS | null>(null);
  const [clientResponseId, setClientResponseId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookAppointmentResponse | null>(null);
  const [isSearchingAnotherTherapist, setIsSearchingAnotherTherapist] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);

  // Appointments service
  const { bookAppointment } = useAppointmentsService();

  // Card expansion states
  const [insuranceExpanded, setInsuranceExpanded] = useState(false);
  const [cashExpanded, setCashExpanded] = useState(false);

  // Use the polling hook from the API
  const { matchData, loading, error, utmUserId, pollFormAndRequestMatch } = usePollFormAndRequestMatch();

  // Toggle helpers
  const toggleInsurance = () => {
    setInsuranceExpanded(prev => !prev);
  };

  const toggleCash = () => {
    setCashExpanded(prev => !prev);
  };

  // Modal handlers
  const handleOpenPaymentModal = () => {
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handlePaymentSuccess = (result: { token: string; details: { card: { last4: string; brand: string } } }) => {
    console.log('Payment completed:', result);
    alert('Payment successful! This modal can be used anywhere in your flow.');
    setIsPaymentModalOpen(false);
  };

  // New handlers for integrated flow
  const handleInsuranceFlow = () => {
    setSelectedPaymentType("insurance");
    setIsInsuranceModalOpen(true);
  };

  const handleCashPayFlow = () => {
    setSelectedPaymentType("cash_pay");
    setIsInsuranceModalOpen(true);
  };

  const handleModalContinue = (data: ModalContinueData) => {
    console.log('Modal continue with data:', data);
    setFormData(data.formData);
    setSelectedPaymentType(data.type as PaymentType);
    setIsInsuranceModalOpen(false);
    setCurrentStep(STEPS.TYPEFORM);
  };

  // Updated to handle custom survey submission
  const handleSurveySubmit = useCallback(async (surveyData: SurveyData) => {
    console.log('🎯 Survey submitted with data:', surveyData);
    setCurrentStep(null); // Hide survey, show loading
    setIsProcessingResponse(true);

    try {
      // Generate a unique response ID
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setClientResponseId(responseId);

      // Add payment type to survey data
      const completeClientData = {
        ...surveyData,
        id: `client_${responseId}`,
        response_id: responseId,
        payment_type: selectedPaymentType,
        state: 'completed',
        utm: {
          utm_source: 'sol_payments',
          utm_medium: 'direct',
          utm_campaign: 'onboarding'
        }
      };

      // Store the client response directly in our backend
      const response = await axiosInstance.post('/clients_signup', completeClientData);
      console.log('✅ Client data stored:', response.data);

      // 👉 Both insurance and cash_pay flows use the SAME therapist-matching API call
      //    This ensures a single entry-point to retrieve matched therapists regardless of payment type
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

      // Debug: log when we receive therapist matches along with the selected payment type
      console.log('📦 Match data received:', {
        paymentType: selectedPaymentType,
        therapistsReturned: matchData.therapists.length,
        therapists: matchData.therapists,
      });
    }
  }, [matchData?.therapists, selectedPaymentType]);

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
        formData={formData || { firstName: "", lastName: "", email: "" }}
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
            {/* This is where you would render the matched therapist components */}
            {currentStep === STEPS.MATCHED_THERAPIST && matchData?.therapists && matchData.therapists.length > 0 && (
              <MatchedTherapist
                therapistsList={matchData.therapists}
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
            )}
                        
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

  // Default: Show the main payment selection page
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header Section */}
      <div className="relative overflow-hidden h-[120px] sm:h-[180px] md:h-[180px] lg:h-[180px]">
        <Image
          src="/onboarding-banner.jpg"
          alt="Onboarding Banner"
          width={1440}
          height={180}
          priority
          className="w-full h-full select-none object-cover"
        />

        <div className="absolute top-0 left-0 px-6 py-8 flex-col items-start space-y-4 hidden md:flex">
          <div className="flex items-center">
            <Image
              src="/sol-health-logo.svg"
              alt="Sol Health"
              width={186}
              height={32}
              className="h-8 w-auto"
            />
            <Button
              onClick={handleOpenPaymentModal}
              size="sm"
              variant="outline"
              className="ml-4 text-xs bg-white/80 border-white/50 text-gray-700 hover:bg-white/90 backdrop-blur-sm"
            >
              <CreditCard className="w-3 h-3 mr-1" />
              Demo Payment
            </Button>
          </div>
          <p className="very-vogue-italic-subtitle text-gray-800 hidden lg:block">Affordable, Modern Therapy Built for Your Life.</p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 text-center">
          <h2
            style={{
              fontFamily: 'Very Vogue Text',
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '28px',
              lineHeight: '80%',
              letterSpacing: '0%'
            }}
            className="text-gray-800"
          >
            <span>CHANGE CAN BE SUNSHINE</span><br />
            <span>IF YOU LET IT IN</span>
          </h2>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-6 py-4 mt-6 mb-2 md:hidden">
        <ArrowLeft className="absolute left-6 w-5 h-5 text-gray-600" />
        <Image
          src="/sol-health-logo.svg"
          alt="Sol Health"
          width={186}
          height={32}
          className="h-8 w-auto"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <ArrowLeft className="hidden md:block w-6 h-6 text-gray-600 mb-8 cursor-pointer hover:text-gray-800 transition-colors" />

          <div className="text-center mb-12">
            <h2
              className="text-gray-800 mb-4 very-vogue-title"
              style={{
                fontSize: '48px',
                textAlign: 'center'
              }}
            >
              Welcome to Sol Health
            </h2>
            <p
              className="text-gray-600 max-w-2xl mx-auto inter-light"
              style={{
                fontSize: '20px',
                textAlign: 'center'
              }}
            >
              Learn about our accessible offerings and choose what's most relevant for you.
            </p>
          </div>
        </div>

        {/* Payment Options Cards */}
        <div className="flex flex-col md:flex-row items-start gap-6 max-w-5xl mx-auto">
          {/* Use My Insurance Card */}
          <Card className="hover:shadow-lg transition-shadow rounded-2xl overflow-hidden border w-full md:flex-1" style={{ backgroundColor: '#FFF8CB', borderColor: '#E6CAAF' }}>
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={toggleInsurance}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-inter font-semibold" style={{ color: '#363943' }}>Use My Insurance</CardTitle>
                <span
                  className="font-inter flex items-center"
                  style={{ color: '#363943' }}
                >
                  <span className="flex items-center">
                    {insuranceExpanded ? 'Hide' : 'Learn More'}
                    <ArrowRight className={`w-4 h-4 ml-1 transition-transform ${insuranceExpanded ? 'rotate-90' : ''}`} />
                  </span>
                </span>
              </div>
              <p className="text-sm font-inter" style={{ color: '#363943' }}>Limited Permit Therapists</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="px-3 py-2 rounded-full inline-block" style={{ backgroundColor: '#FFFAEE' }}>
                <p className="text-sm font-inter font-medium" style={{ color: '#363943' }}>
                  ~ $25-50 / session <span className="font-normal">co-pay on average</span>
                </p>
              </div>

              {insuranceExpanded && (
                <>
                  <div>
                    <p className="font-inter font-semibold mb-2" style={{ color: '#363943' }}>We currently accept:</p>
                    <p className="text-sm font-inter" style={{ color: '#363943' }}>
                      Aetna, Cigna, Meritain, Carelon, BCBS, AmeriHealth
                    </p>
                  </div>

                  <div>
                    <p className="font-inter font-semibold mb-2" style={{ color: '#363943' }}>What to expect:</p>
                    <ul className="text-sm font-inter space-y-1" style={{ color: '#363943' }}>
                      <li>• You'll be matched with a Limited Permit Therapist</li>
                      <li>• Limited Permit Therapists are fully licensed professionals.</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full hover:opacity-90 rounded-full font-inter font-medium py-3 mt-6 border"
                    style={{ backgroundColor: '#FFFAEE', color: '#363943', borderColor: '#E6CAAF' }}
                    onClick={handleInsuranceFlow}
                  >
                    Use My Insurance <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pay Out-of-Pocket Card */}
          <Card className="hover:shadow-lg transition-shadow rounded-2xl overflow-hidden border w-full md:flex-1" style={{ backgroundColor: '#FFF0D7', borderColor: '#E6CAAF' }}>
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={toggleCash}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-inter font-semibold" style={{ color: '#363943' }}>Pay Out-of-Pocket</CardTitle>
                <span
                  className="font-inter flex items-center"
                  style={{ color: '#363943' }}
                >
                  <span className="flex items-center">
                    {cashExpanded ? 'Hide' : 'Learn More'}
                    <ArrowRight className={`w-4 h-4 ml-1 transition-transform ${cashExpanded ? 'rotate-90' : ''}`} />
                  </span>
                </span>
              </div>
              <p className="text-sm font-inter" style={{ color: '#363943' }}>MFT, MHC, MSW Therapists</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="px-3 py-2 rounded-full inline-block" style={{ backgroundColor: '#E6CAAF' }}>
                <p className="text-sm font-inter font-medium" style={{ color: '#363943' }}>
                  $30 flat / session. <span className="font-normal">No hidden fees.</span>
                </p>
              </div>

              {cashExpanded && (
                <>
                  <div>
                    <p className="font-inter font-semibold mb-2" style={{ color: '#363943' }}>Who this is for:</p>
                    <p className="text-sm font-inter" style={{ color: '#363943' }}>
                      • Those who are seeking care or who prefer not to go through insurance
                    </p>
                  </div>

                  <div>
                    <p className="font-inter font-semibold mb-2" style={{ color: '#363943' }}>What to expect:</p>
                    <ul className="text-sm font-inter space-y-1" style={{ color: '#363943' }}>
                      <li>• You'll be matched with MFT, MHC, or MSW level therapists</li>
                      <li>• These are graduate-level therapists working toward full licensure.</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full hover:opacity-90 rounded-full font-inter font-medium py-3 mt-6 border"
                    style={{ backgroundColor: '#E6CAAF', color: '#363943', borderColor: '#E6CAAF' }}
                    onClick={handleCashPayFlow}
                  >
                    Pay Out-of-Pocket <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Insurance Verification Modal */}
      <InsuranceVerificationModal
        isOpen={isInsuranceModalOpen}
        onClose={() => setIsInsuranceModalOpen(false)}
        onContinueToQuestionnaire={handleModalContinue}
        paymentType={selectedPaymentType || "insurance"}
      />

      {/* Demo Square Payment Modal */}
      <SquarePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        amount={30}
        title="Demo Square Payment"
        description="This is a reusable payment modal you can use anywhere"
        onPaymentSuccess={handlePaymentSuccess}
        showBackButton={false}
      />
    </div>
  );
}