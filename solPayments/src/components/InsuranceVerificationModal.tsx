"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { checkEligibility } from "../app/api/eligibility.js";
// No longer need server-side webhook call; we’ll redirect directly to Typeform

type InsuranceProvider = "aetna" | "cigna" | "meritain" | "carelon" | "bcbs" | "amerihealth" | "cash-pay";

type ModalState =
  | "insurance-form"
  | "verifying"
  | "verification-success"
  | "verification-failed"
  | "cash-pay-form"
  | "submitting"
  | "submission-failed";

interface EligibilityBenefits {
  copay: string;
  coinsurance: string;
  memberObligation: string;
  deductible: string;
  remainingDeductible: string;
  oopMax: string;
  remainingOopMax: string;
  benefitStructure: string;
}

interface VerificationResponse {
  benefits?: EligibilityBenefits;
  // Allow additional unknown fields without using `any`
  [key: string]: unknown;
}

interface InsuranceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueToQuestionnaire: (data: { type: string; [key: string]: string }) => void;
  initialState?: ModalState;
}

export default function InsuranceVerificationModal({
  isOpen,
  onClose,
  onContinueToQuestionnaire,
  initialState
}: InsuranceVerificationModalProps) {
  const [modalState, setModalState] = useState<ModalState>(initialState ?? "insurance-form");
  const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    memberId: "",
    email: "",
    phone: "",  // optional extras
    age: "",
    gender: ""
  });
  const [verificationResponse, setVerificationResponse] = useState<VerificationResponse | null>(null);

  // Reset modal state when it opens
  useEffect(() => {
    if (isOpen) {
      setModalState("insurance-form");
      setSelectedProvider(null);
      setFormData({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        memberId: "",
        email: "",
        phone: "",
        age: "",
        gender: ""
      });
      setVerificationResponse(null);
    }
  }, [isOpen]);

  // Update state if prop changes while modal open
  useEffect(() => {
    if (isOpen && initialState) {
      setModalState(initialState);
    }
  }, [isOpen, initialState]);

  const insuranceProviders = [
    { id: "aetna" as const, name: "Aetna" },
    { id: "cigna" as const, name: "Cigna/Evernorth" },
    { id: "meritain" as const, name: "Meritain" },
    { id: "carelon" as const, name: "Carelon" },
    { id: "bcbs" as const, name: "BCBS" },
    { id: "amerihealth" as const, name: "AmeriHealth" }
  ];

  const tradingPartnerServiceIdMap: Record<InsuranceProvider, string> = {
    aetna: "60054",
    cigna: "62308",
    meritain: "64157",
    carelon: "47198",
    bcbs: "22099", // not used for NJ; you could remove this or keep for structure
    amerihealth: "60061",
    "cash-pay": "" // not needed, but prevents TS error
  };

  const handleVerifyInsurance = async () => {
    if (!selectedProvider) return;

    setModalState("verifying");

    console.log("Raw dateOfBirth from form:", formData.dateOfBirth);
    console.log("Type of dateOfBirth:", typeof formData.dateOfBirth);

    const formatDOB = (dobStr: string): string | null => {
      const [year, month, day] = dobStr.split("-");
      if (!year || !month || !day) return null;
      return `${year}${month}${day}`;
    };

    const dobFormatted = formatDOB(formData.dateOfBirth);
    console.log("Formatted DOB (YYYYMMDD):", dobFormatted);
    console.log("Length of formatted DOB:", dobFormatted?.length);
    
    if (!dobFormatted) {
      setModalState("verification-failed");
      return;
    }

    const payload = {
      controlNumber: "987654321",
      tradingPartnerServiceId: tradingPartnerServiceIdMap[selectedProvider],
      provider: {
        organizationName: "Sol Health",
        npi: "1234567890"
      },
      subscriber: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: dobFormatted,
        memberId: formData.memberId
      }
    };

    console.log("Full payload being sent:", JSON.stringify(payload, null, 2));

    try {
      // This calls Lambda A which creates Insurance IntakeQ profile
      const responseData = await checkEligibility(payload);
      console.log("Response data:", responseData);

      // Treat any 2xx response as success; API errors would have thrown above
      setVerificationResponse(responseData);
      setModalState("verification-success");
    } catch (error: unknown) {
      console.error("Verification error:", error);
      setModalState("verification-failed");
    }
  };

  const handleContinueToQuestionnaire = async () => {
    try {
      setModalState("submitting");

      // Build Typeform URL with hidden params
      const baseUrl = "https://stg.solhealth.co/";
      const params = new URLSearchParams();

      params.set("hidden_email", formData.email);
      params.set("hidden_first_name", formData.firstName);
      params.set("hidden_last_name", formData.lastName);
      params.set("hidden_utm_source", "sol_payments");
      params.set("hidden_utm_medium", "insurance");
      params.set("hidden_utm_campaign", "onboarding");

      if (selectedProvider) {
        params.set("hidden_insurance_provider", getSelectedProviderName());
      }

      // Optional pre-fill
      params.set("email", formData.email);
      if (formData.phone) params.set("phone", formData.phone);
      if (formData.age) params.set("age", formData.age);

      const fullUrl = `${baseUrl}?${params.toString()}`;

      await new Promise((r) => setTimeout(r, 1500));
      window.location.href = fullUrl;
    } catch (error) {
      console.error("Failed to redirect to Typeform:", error);
      setModalState("submission-failed");
    }
  };

  // New handler for cash-pay flow
  const handleOutOfPocketContinue = async () => {
    try {
      setModalState("submitting");

      const baseUrl = "https://solhealth.typeform.com/to/Dgi2e9lw";
      const params = new URLSearchParams();

      params.set("hidden_email", formData.email);
      params.set("hidden_first_name", formData.firstName);
      params.set("hidden_last_name", formData.lastName);
      params.set("hidden_utm_source", "sol_payments");
      params.set("hidden_utm_medium", "cash_pay");
      params.set("hidden_utm_campaign", "onboarding");

      params.set("email", formData.email);
      if (formData.phone) params.set("phone", formData.phone);
      if (formData.age) params.set("age", formData.age);

      const fullUrl = `${baseUrl}?${params.toString()}`;

      await new Promise((r) => setTimeout(r, 1500));
      window.location.href = fullUrl;
    } catch (error) {
      console.error("Failed to redirect to cash-pay Typeform:", error);
      setModalState("submission-failed");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSelectedProviderName = () => {
    return insuranceProviders.find(p => p.id === selectedProvider)?.name || "";
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogHeader><DialogTitle className="sr-only">Insurance Eligibility Modal</DialogTitle></DialogHeader>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFBF3' }}>

        {/* Add transition container for smooth animations */}
        <div className="transition-all duration-500 ease-in-out">

        {/* Provider selection step removed; modal starts directly at insurance-form */}

        {/* Insurance Information Form */}
        {modalState === "insurance-form" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <div className="text-center space-y-4">
              <h1 className="very-vogue-title text-4xl text-gray-800" style={{ fontSize: '30px', lineHeight: '1.1' }}>
                Great, We're In Network!
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '16px', fontWeight: '400', lineHeight: '1.4' }}>
                Next, to verify your eligibility and estimate your co-pay, please enter your insurance information below.
              </p>
            </div>

            <div className="mx-auto max-w-md">
              <div className="border border-gray-300 rounded-xl p-6 bg-white space-y-6">
                {/* Insurance Provider Dropdown */}
                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Insurance Provider*
                  </label>
                  <select
                    value={selectedProvider ?? ""}
                    onChange={(e) => setSelectedProvider(e.target.value as InsuranceProvider)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter bg-white"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="" disabled>Select provider</option>
                    {insuranceProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    First Name*
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="Enter your first name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Last Name*
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="Enter your last name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Member ID*
                  </label>
                  <input
                    type="text"
                    value={formData.memberId}
                    onChange={(e) => handleInputChange("memberId", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="Enter your member ID"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Email*
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="Enter your email address"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Phone Number (optional) */}
                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="(555) 123-4567"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Age (optional) */}
                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="25"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Gender (optional) */}
                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter bg-white"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="">Select gender (optional)</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="transgender">Transgender</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-6 py-3 font-inter rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleVerifyInsurance}
                disabled={!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId || !formData.email}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                style={{ fontSize: '16px' }}
              >
                Verify & estimate cost
              </Button>
            </div>
          </div>
        )}

        {/* Verifying State */}
        {modalState === "verifying" && (
          <div className="space-y-8 text-center py-16 animate-in fade-in-0 zoom-in-95 duration-500">
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                </div>
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              </div>
              <h2 className="very-vogue-title text-gray-800" style={{ fontSize: '26px', lineHeight: '1.2' }}>
                Verifying Your Insurance...
              </h2>
              <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-blue-400 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="font-inter text-gray-600" style={{ fontSize: '16px' }}>
                This usually takes just a few seconds...
              </p>
            </div>
          </div>
        )}

        {/* Redirecting / Submitting State */}
        {modalState === "submitting" && (
          <div className="space-y-8 text-center py-16 animate-in fade-in-0 zoom-in-95 duration-500">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse mx-auto">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <h2 className="very-vogue-title text-gray-800" style={{ fontSize: '26px', lineHeight: '1.2' }}>
                Redirecting to Questionnaire...
              </h2>
              <p className="font-inter text-gray-600" style={{ fontSize: '16px' }}>
                You'll now complete a brief questionnaire to help us match you with your ideal therapist
              </p>
              <div className="text-sm text-gray-500 font-inter">
                If you're not redirected automatically,
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 hover:text-blue-700 underline ml-1"
                >
                  click here
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Success State */}
        {modalState === "verification-success" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in-50 duration-700 delay-300">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '30px', lineHeight: '1.1' }}>
                You're Covered!<br />
                Here's How It Works.
              </h1>
            </div>

            <div className="mx-auto max-w-md">
              <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-6 text-center animate-in fade-in-0 duration-700 delay-500">
                <p className="font-inter text-gray-800" style={{ fontSize: '16px', fontWeight: '500' }}>
                  {verificationResponse?.benefits ? (
                    <>
                      Based on your benefits, your estimated costs are:<br />
                      <strong>Copay: {verificationResponse.benefits.copay}</strong><br />
                      {verificationResponse.benefits.coinsurance !== "0%" && (
                        <>
                          <strong>Coinsurance: {verificationResponse.benefits.coinsurance}</strong><br />
                        </>
                      )}
                      {verificationResponse.benefits.memberObligation !== "$0.00" && (
                        <>
                          <strong>Your cost per session: {verificationResponse.benefits.memberObligation}</strong><br />
                        </>
                      )}
                    </>
                  ) : (
                    <>Given our estimates, you'll pay <strong>$50</strong> for your first session and <strong>$25</strong> for all follow-up sessions.</>
                  )}
                </p>
              </div>

              {verificationResponse?.benefits && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-sm animate-in fade-in-0 duration-700 delay-600">
                  <p className="font-inter text-gray-700">
                    <strong>Additional Coverage Details:</strong><br />
                    Deductible: {verificationResponse.benefits.deductible} (Remaining: {verificationResponse.benefits.remainingDeductible})<br />
                    Out-of-Pocket Max: {verificationResponse.benefits.oopMax} (Remaining: {verificationResponse.benefits.remainingOopMax})<br />
                    Benefit Structure: {verificationResponse.benefits.benefitStructure}
                  </p>
                </div>
              )}

              <div className="space-y-4 text-center text-gray-700 mt-6 animate-in fade-in-0 duration-700 delay-700">
                <p className="font-inter" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                  Next, answer a brief questionnaire to help us find your best fit therapist.
                </p>
                <p className="font-inter" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                  You'll be matched to an Associate-Level Therapist, but you can always browse our $30/session Graduate-Level Therapists.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleContinueToQuestionnaire}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px' }}
              >
                Continue to Questionnaire
              </Button>
            </div>
          </div>
        )}

        {/* Verification Failed State */}
        {modalState === "verification-failed" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in-50 duration-700 delay-300">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '26px', lineHeight: '1.1' }}>
                Sorry, we couldn't verify your eligibility.
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '16px', fontWeight: '400', lineHeight: '1.4' }}>
                Try re-entering your insurance information again, or learn about our Out-of-Pocket offering for $30/session.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setModalState("insurance-form")}
                variant="outline"
                className="px-6 py-3 font-inter rounded-full border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                Re-Enter Insurance
              </Button>
              <Button
                onClick={() => setModalState("cash-pay-form")}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px' }}
              >
                Pay Out-of-Pocket for $30/Session
              </Button>
            </div>
          </div>
        )}

        {/* Cash Pay Form */}
        {modalState === "cash-pay-form" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 border border-yellow-400 rounded-full px-6 py-3 font-inter text-yellow-800 animate-in fade-in-0 duration-700 delay-300" style={{ fontSize: '16px', fontWeight: '500' }}>
                  💰 $30 / Session Out-of-Pocket Selected
                </div>
              </div>
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '30px', lineHeight: '1.1' }}>
                Let's Get You Matched
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '16px', fontWeight: '400', lineHeight: '1.4' }}>
                You'll now fill out a brief questionnaire to help us match you to your best fit therapist.
              </p>
            </div>

            <div className="mx-auto max-w-md">
              <div className="border border-gray-300 rounded-xl p-6 bg-white space-y-6">
                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    First Name*
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 font-inter"
                    placeholder="Enter your first name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Last Name*
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 font-inter"
                    placeholder="Enter your last name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block font-inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Email*
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 font-inter"
                    placeholder="Enter your email address"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-6 py-3 font-inter rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleOutOfPocketContinue}
                disabled={!formData.firstName || !formData.lastName || !formData.email}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                style={{ fontSize: '16px' }}
              >
                Continue to Questionnaire
              </Button>
            </div>
          </div>
        )}

        {/* Submission Failed State */}
        {modalState === "submission-failed" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in-50 duration-700 delay-300">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '26px', lineHeight: '1.1' }}>
                Submission Failed
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '16px', fontWeight: '400', lineHeight: '1.4' }}>
                We were unable to submit your information. Please try again later or contact support.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setModalState("insurance-form")}
                variant="outline"
                className="px-6 py-3 font-inter rounded-full border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                Re-Enter Insurance
              </Button>
              <Button
                onClick={() => setModalState("cash-pay-form")}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px' }}
              >
                Pay Out-of-Pocket for $30/Session
              </Button>
            </div>
          </div>
        )}

        </div>
      </DialogContent>
    </Dialog>

    {/* No embedded Typeform – submission handled via webhook */}
    </>
  );
}