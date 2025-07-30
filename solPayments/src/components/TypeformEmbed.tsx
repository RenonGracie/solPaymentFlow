"use client";

import { Widget } from "@typeform/embed-react";

interface EmbeddedTypeformProps {
  firstName: string;
  lastName: string;
  email: string;
  insuranceProvider?: string;
  paymentType: "insurance" | "cash_pay";
  onClose?: () => void;
}

export default function EmbeddedTypeform({
  firstName,
  lastName,
  email,
  insuranceProvider,
  paymentType,
  onClose
}: EmbeddedTypeformProps) {
  // Redirect to Thank-You / next-step page after the form submits
  const handleSubmit = ({ responseId }: { responseId: string }) => {
    window.location.href = `https://stg.solhealth.co/${responseId}`;
  };

  // Hidden fields that Typeform will receive
  const hiddenFields = {
    first_name: firstName,
    last_name: lastName,
    email: email,
    insurance_provider: insuranceProvider || "",
    payment_type: paymentType === "insurance" ? "Insurance" : "Cash Pay",
    // UTM / tracking
    utm_source: "sol_payments",
    utm_medium: paymentType,
    utm_campaign: "onboarding"
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <Widget
        id={process.env.NEXT_PUBLIC_TYPEFORM_ID || "Dgi2e9lw"}
        className="w-full h-full"
        onSubmit={handleSubmit}
        hidden={hiddenFields}
      />
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg"
        >
          ✕
        </button>
      )}
    </div>
  );
} 