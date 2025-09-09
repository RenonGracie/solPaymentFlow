"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { checkEligibility } from "../app/api/eligibility.js";
import { PAYER_ID_BY_PROVIDER, NPI, getSessionCostForPayer } from "@/api/eligibilityConfig";
import { useInputFocus } from "@/hooks/useInputFocus";

type InsuranceProvider = "aetna" | "meritain" | "horizon_bcbs_nj" | "amerihealth" | "cash-pay";

type ModalState =
  | "insurance-form"
  | "verifying"
  | "verification-success"
  | "verification-failed"
  | "cash-pay-form";

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
  [key: string]: unknown;
}

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  memberId: string;
  email: string;
  provider?: string;
  paymentType?: string;
}

interface ModalContinueData {
  type: string;
  formData: FormData;
}

interface InsuranceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueToQuestionnaire: (data: ModalContinueData) => void;
  initialState?: ModalState;
  paymentType: "insurance" | "cash_pay";
}

export default function InsuranceVerificationModal({
  isOpen,
  onClose,
  onContinueToQuestionnaire,
  initialState,
  paymentType
}: InsuranceVerificationModalProps) {
  const [modalState, setModalState] = useState<ModalState>(
    initialState ?? (paymentType === "insurance" ? "insurance-form" : "cash-pay-form")
  );
  const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    memberId: "",
    email: ""
  });
  const [verificationResponse, setVerificationResponse] = useState<VerificationResponse | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Input focus hooks for better mobile keyboard handling
  const firstNameInputRef = useInputFocus({ scrollOffset: 100 });
  const lastNameInputRef = useInputFocus({ scrollOffset: 100 });
  const dobInputRef = useInputFocus({ scrollOffset: 100 });
  const memberIdInputRef = useInputFocus({ scrollOffset: 100 });
  const emailInputRef = useInputFocus({ scrollOffset: 100 });

  // Reset modal state when it opens
  useEffect(() => {
    if (isOpen) {
      const defaultState = paymentType === "insurance" ? "insurance-form" : "cash-pay-form";
      setModalState(initialState ?? defaultState);
      setSelectedProvider(null);
      setFormData({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        memberId: "",
        email: ""
      });
      setVerificationResponse(null);
    }
  }, [isOpen, initialState, paymentType]);

  const insuranceProviders = [
    { id: "aetna" as const, name: "Aetna" },
    { id: "meritain" as const, name: "Meritain Health" },
    { id: "horizon_bcbs_nj" as const, name: "Horizon Blue Cross Blue Shield of NJ" },
    { id: "amerihealth" as const, name: "AmeriHealth" }
  ];

  const tradingPartnerServiceIdMap: Record<InsuranceProvider, string> = {
    aetna: PAYER_ID_BY_PROVIDER["Aetna"],
    meritain: PAYER_ID_BY_PROVIDER["Meritain Health"],
    horizon_bcbs_nj: PAYER_ID_BY_PROVIDER["Horizon Blue Cross Blue Shield of NJ"],
    amerihealth: PAYER_ID_BY_PROVIDER["AmeriHealth"],
    "cash-pay": ""
  };

  const handleVerifyInsurance = async () => {
    if (!selectedProvider) return;

    setIsTransitioning(true);
    // Brief delay to show fade out animation
    setTimeout(() => {
      setModalState("verifying");
      setIsTransitioning(false);
    }, 300);

    const formatDOB = (dobStr: string): string | null => {
      const [year, month, day] = dobStr.split("-");
      if (!year || !month || !day) return null;
      return `${year}${month}${day}`;
    };

    const dobFormatted = formatDOB(formData.dateOfBirth);
    
    if (!dobFormatted) {
      setModalState("verification-failed");
      return;
    }

    const payerId = tradingPartnerServiceIdMap[selectedProvider];
    if (!payerId) {
      console.warn("Missing payerId for provider", selectedProvider);
      setModalState("verification-failed");
      return;
    }
    const sessionCostCents = Math.round(getSessionCostForPayer(payerId, 200) * 100);

    const payload = {
      controlNumber: "987654321",
      tradingPartnerServiceId: payerId,
      cptCode: "90837",
      provider: {
        organizationName: "Sol Health",
        npi: NPI,
        sessionCost: sessionCostCents
      },
      subscriber: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: dobFormatted,
        memberId: formData.memberId
      }
    };

    try {
      const responseData = await checkEligibility(payload);
      setVerificationResponse(responseData);
      setIsTransitioning(true);
      // Brief delay to show fade out animation before success state
      setTimeout(() => {
        setModalState("verification-success");
        setIsTransitioning(false);
      }, 300);
    } catch (error) {
      console.error("Verification error:", error);
      setModalState("verification-failed");
    }
  };

  const handleContinueToQuestionnaire = () => {
    // Pass the form data and type to the parent
    onContinueToQuestionnaire({
      type: paymentType,
      formData: {
        ...formData,
        provider: getSelectedProviderName(),
        paymentType: paymentType
      }
    });
  };

  const handleCashPayContinue = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      return;
    }
    
    // For cash pay, go directly to questionnaire
    onContinueToQuestionnaire({
      type: "cash_pay",
      formData: {
        ...formData,
        paymentType: "cash_pay"
      }
    });
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSelectedProviderName = () => {
    return insuranceProviders.find(p => p.id === selectedProvider)?.name || "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFBF3', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
        <DialogHeader className="sr-only">
          <DialogTitle>Insurance Eligibility Verification</DialogTitle>
          <DialogDescription>
            Enter your insurance information to verify your eligibility and benefits for therapy sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="transition-all duration-500 ease-in-out">

        {/* Insurance Information Form */}
        {modalState === "insurance-form" && (
          <div className={`space-y-6 py-4 transition-all duration-300 ${isTransitioning ? 'animate-out fade-out-0 scale-out-95' : 'animate-in fade-in-0 slide-in-from-bottom-5'} duration-500`}>
            <div className="mx-auto max-w-md">
              <div className="border border-gray-300 rounded-xl p-6 bg-white space-y-6">
                {/* Insurance Provider Dropdown */}
                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Insurance Provider*
                  </label>
                  <select
                    value={selectedProvider ?? ""}
                    onChange={(e) => setSelectedProvider(e.target.value as InsuranceProvider)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 inter bg-white"
                    style={{ fontSize: '16px' }}
                  >
                    <option value="" disabled>Select provider</option>
                    {insuranceProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    First Name*
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 inter"
                    placeholder="Enter your first name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Last Name*
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 inter"
                    placeholder="Enter your last name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Date of Birth*
                  </label>
                  <input
                    ref={dobInputRef}
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 inter"
                    style={{ fontSize: '16px' }}
                    autoComplete="bday"
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Member ID*
                  </label>
                  <input
                    ref={memberIdInputRef}
                    type="text"
                    value={formData.memberId}
                    onChange={(e) => handleInputChange("memberId", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 inter"
                    placeholder="Enter your member ID"
                    style={{ fontSize: '16px' }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    inputMode="text"
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Email*
                  </label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 inter"
                    placeholder="Enter your email address"
                    style={{ fontSize: '16px' }}
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    inputMode="email"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-6 py-3 inter rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleVerifyInsurance}
                disabled={!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId || !formData.email}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 inter rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
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
              <h2 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800" style={{ lineHeight: '1.2' }}>
                Verifying Your Insurance...
              </h2>
              <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-blue-400 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="inter text-gray-600" style={{ fontSize: '16px' }}>
                This usually takes just a few seconds...
              </p>
            </div>
          </div>
        )}

        {/* Verification Success State */}
        {modalState === "verification-success" && (
          <div className="space-y-6 py-4 px-2 animate-in fade-in-0 scale-in-95 duration-700">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in-50 duration-700 delay-300">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h1 className="very-vogue-title text-xl sm:text-2xl md:text-3xl text-gray-800" style={{ lineHeight: '1.1' }}>
                You're Covered!<br />
                Here's How It Works.
              </h1>
            </div>

            <div className="mx-auto max-w-md">
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-6 text-center animate-in fade-in-0 duration-700 delay-500 shadow-sm" style={{ backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
                <p className="inter text-gray-800" style={{ fontSize: '16px', fontWeight: '500' }}>
                  {verificationResponse?.benefits ? (
                    <>
                      {(() => {
                        const mo = verificationResponse.benefits.memberObligation;
                        // Parse like "$137.26" -> 137.26
                        const amt = typeof mo === 'string' ? parseFloat(mo.replace(/[$,]/g, '')) : NaN;
                        const display = !isNaN(amt) && amt > 100 ? "You can expect to pay $90-110 per session" : `You can expect to pay ~${mo} for your sessions`;
                        return (
                          <>
                            <strong>{display}</strong><br />
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>Given our estimates, you'll pay <strong>$50</strong> for your first session and <strong>$25</strong> for all follow-up sessions.</>
                  )}
                </p>
              </div>

              {verificationResponse?.benefits && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mt-4 text-sm animate-in fade-in-0 duration-700 delay-600 shadow-sm">
                  <p className="inter text-gray-700" style={{ lineHeight: '1.4' }}>
                    <strong className="text-blue-800">Additional Coverage Details:</strong><br />
                    <span className="mt-2 block">
                      <strong>Deductible:</strong> {verificationResponse.benefits.deductible} (Remaining: {verificationResponse.benefits.remainingDeductible})<br />
                      <strong>Out-of-Pocket Max:</strong> {verificationResponse.benefits.oopMax} (Remaining: {verificationResponse.benefits.remainingOopMax})<br />
                      <strong>Benefit Structure:</strong> {verificationResponse.benefits.benefitStructure}
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-3 text-center text-gray-700 mt-4 animate-in fade-in-0 duration-700 delay-700">
                <p className="inter" style={{ fontSize: '15px', lineHeight: '1.5' }}>
                  Next, answer a brief questionnaire to help us find your best fit therapist.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleContinueToQuestionnaire}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 inter rounded-full font-medium transition-all duration-300 hover:scale-105"
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
              <h1 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800" style={{ lineHeight: '1.1' }}>
                Sorry, we couldn't verify your eligibility.
              </h1>
              <p className="inter text-gray-600" style={{ fontSize: '16px', fontWeight: '400', lineHeight: '1.4' }}>
                Try re-entering your insurance information again, or learn about our Out-of-Pocket offering for $30/session.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setModalState("insurance-form")}
                variant="outline"
                className="px-6 py-3 inter rounded-full border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                Re-Enter Insurance
              </Button>
              <Button
                onClick={() => setModalState("cash-pay-form")}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 inter rounded-full font-medium transition-all duration-300 hover:scale-105"
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
                <div className="bg-yellow-100 border border-yellow-400 rounded-full px-6 py-3 inter text-yellow-800 animate-in fade-in-0 duration-700 delay-300" style={{ fontSize: '16px', fontWeight: '500', backgroundImage: 'url("/beige texture 2048.svg")', backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}>
                  💰 $30 / Session Out-of-Pocket Selected
                </div>
              </div>
              <h1 className="very-vogue-title text-2xl sm:text-3xl md:text-4xl text-gray-800" style={{ lineHeight: '1.1' }}>
                Let's Get You Matched
              </h1>
              <p className="inter text-gray-600" style={{ fontSize: '16px', fontWeight: '400', lineHeight: '1.4' }}>
                You'll now fill out a brief questionnaire to help us match you to your best fit therapist.
              </p>
            </div>

            <div className="mx-auto max-w-md">
              <div className="border border-gray-300 rounded-xl p-6 bg-white space-y-6">
                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    First Name*
                  </label>
                  <input
                    ref={firstNameInputRef}
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 inter"
                    placeholder="Enter your first name"
                    style={{ fontSize: '16px' }}
                    autoComplete="given-name"
                    autoCorrect="off"
                    autoCapitalize="words"
                    inputMode="text"
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Last Name*
                  </label>
                  <input
                    ref={lastNameInputRef}
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 inter"
                    placeholder="Enter your last name"
                    style={{ fontSize: '16px' }}
                    autoComplete="family-name"
                    autoCorrect="off"
                    autoCapitalize="words"
                    inputMode="text"
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 inter"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block inter text-gray-700 mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    Email*
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 inter"
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
                className="px-6 py-3 inter rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCashPayContinue}
                disabled={!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.email}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 inter rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                style={{ fontSize: '16px' }}
              >
                Continue to Questionnaire
              </Button>
            </div>
          </div>
        )}

        </div>
      </DialogContent>
    </Dialog>
  );
}