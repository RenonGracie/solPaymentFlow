"use client";

import { Widget } from "@typeform/embed-react";

type PaymentType = "insurance" | "cash_pay";

interface TypeformEmbedProps {
  paymentType: PaymentType;
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    provider?: string;
    paymentType?: string;
  };
  onSubmit: (responseId: string) => void;
  onBack: () => void;
  showHeader?: boolean; // Add this prop to control header visibility
}

export default function TypeformEmbed({
  paymentType,
  formData,
  onSubmit,
  onBack,
  showHeader = true, // Default to true for backward compatibility
}: TypeformEmbedProps) {
  // Get UTM parameters from URL (similar to solHealthFE)
  const getUtmParams = (): Record<string, string> => {
    if (typeof window === 'undefined') {
      return {
        utm_source: 'sol_payments',
        utm_medium: 'payments_modal',
        utm_campaign: 'onboarding',
        utm_term: '',
        utm_content: '',
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || 'sol_payments',
      utm_medium: params.get('utm_medium') || 'payments_modal',
      utm_campaign: params.get('utm_campaign') || 'onboarding',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
    };
  };

  // Get client ID from GA cookie (similar to solHealthFE)
  const getClientIdFromGaCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    
    const cookie = document?.cookie
      ?.split('; ')
      ?.find((row) => row?.startsWith('_ga='));

    if (!cookie) return null;

    const [, value] = cookie.split('=');
    if (!value) return null;

    const parts = value.split('.');
    return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
  };

  const hiddenFields: Record<string, string> = {
    // Payment type information
    payment_type: paymentType === "insurance" ? "insurance" : "cash_pay",
    
    // Pre-filled form data
    first_name: formData.firstName || '',
    last_name: formData.lastName || '',
    email: formData.email || '',
    insurance_provider: formData.provider || '',
    
    // UTM parameters
    ...getUtmParams(),
    
    // Client ID from GA (if available)
    client_id: getClientIdFromGaCookie() || '',
  };

  const handleTypeformSubmit = ({ responseId }: { responseId: string }) => {
    console.log('🎯 Typeform onSubmit called');
    console.log('📄 ResponseId:', responseId);
    
    if (!responseId) {
      console.error('❌ No responseId received from Typeform');
      alert('Error: No response ID received from Typeform');
      return;
    }
    
    onSubmit(responseId);
  };

  // If showHeader is false, just return the Typeform widget without any wrapper
  if (!showHeader) {
    return (
      <div className="w-full h-full">
        <Widget
          id={process.env.NEXT_PUBLIC_TYPEFORM_ID || "Dgi2e9lw"}
          className="w-full h-full"
          onSubmit={handleTypeformSubmit}
          hidden={hiddenFields}
        />
      </div>
    );
  }

  // Original component with header (for standalone use)
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header with back button */}
      <div className="relative overflow-hidden h-[120px] sm:h-[180px] md:h-[180px] lg:h-[180px]">
        {/* Banner Image */}
        <img
          src="/onboarding-banner.jpg"
          alt="Onboarding Banner"
          className="w-full h-full select-none object-cover"
        />

        {/* Top-left Content with Back Button */}
        <div className="absolute top-0 left-0 px-6 py-8 flex-col items-start space-y-4 hidden md:flex">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Go back"
            >
              ← {/* ArrowLeft icon */}
            </button>
            <img
              src="/sol-health-logo.svg"
              alt="Sol Health"
              className="h-8 w-auto"
            />
          </div>
          <p className="very-vogue-italic-subtitle text-gray-800 hidden lg:block ml-12">
            {paymentType === "insurance" 
              ? "Let's verify your insurance and get you matched." 
              : "Let's get you matched with your perfect therapist."}
          </p>
        </div>

        {/* Center Quote */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 text-center">
          <h2
            className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal"
            style={{
              fontFamily: 'Very Vogue Text',
              fontWeight: 400,
              fontStyle: 'normal',
              letterSpacing: '0.02em',
              lineHeight: '1.1'
            }}
          >
            <span>CHANGE CAN BE SUNSHINE</span><br />
            <span>IF YOU LET IT IN</span>
          </h2>
        </div>
      </div>

      {/* Mobile Header with back button */}
      <div className="relative flex items-center justify-center px-6 py-4 mt-6 mb-2 md:hidden">
        {/* Back Arrow */}
        <button
          onClick={onBack}
          className="absolute left-6 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          ← {/* ArrowLeft icon */}
        </button>
        {/* Centered Logo */}
        <img
          src="/sol-health-logo.svg"
          alt="Sol Health"
          className="h-8 w-auto"
        />
      </div>

      {/* Typeform Container */}
      <div className="w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        <Widget
          id={process.env.NEXT_PUBLIC_TYPEFORM_ID || "Dgi2e9lw"}
          className="w-full h-full"
          onSubmit={handleTypeformSubmit}
          hidden={hiddenFields}
        />
      </div>
    </div>
  );
}