"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";

type InsuranceProvider = "aetna" | "cigna" | "meritain" | "carelon" | "bcbs" | "amerihealth" | "cash-pay";

type ModalState =
  | "provider-selection"
  | "insurance-form"
  | "verifying"
  | "verification-success"
  | "verification-failed"
  | "cash-pay-form";

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
  const [modalState, setModalState] = useState<ModalState>(initialState ?? "provider-selection");
  const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    memberId: "",
    email: ""
  });

  // Reset modal state when it opens
  useEffect(() => {
    if (isOpen) {
      setModalState("provider-selection");
      setSelectedProvider(null);
      setFormData({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        memberId: "",
        email: ""
      });
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

  const handleProviderSelect = (providerId: InsuranceProvider) => {
    setSelectedProvider(providerId);
  };

  const handleContinueFromProviderSelection = () => {
    if (selectedProvider === "cash-pay") {
      setModalState("cash-pay-form");
    } else if (selectedProvider) {
      setModalState("insurance-form");
    }
  };

  const handleVerifyInsurance = () => {
    setModalState("verifying");

    // Simulate API call with timer (3 seconds)
    setTimeout(() => {
      // Randomly simulate success or failure for demo
      const isSuccess = Math.random() > 0.5;
      setModalState(isSuccess ? "verification-success" : "verification-failed");
    }, 3000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSelectedProviderName = () => {
    return insuranceProviders.find(p => p.id === selectedProvider)?.name || "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFBF3' }}>

        {/* Add transition container for smooth animations */}
        <div className="transition-all duration-500 ease-in-out">

        {/* Provider Selection State */}
        {modalState === "provider-selection" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 duration-500">
            {/* Title */}
            <div className="text-center space-y-4">
              <h1 className="very-vogue-title text-4xl text-gray-800" style={{ fontSize: '40px', lineHeight: '1.1' }}>
                Please Select Your Insurance Provider
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.4' }}>
                Please select your insurance provider or choose out-of-pocket ($30 per session).
              </p>
            </div>

            {/* Provider Selection Container */}
            <div className="mx-auto max-w-md">
              <div className="border border-gray-300 rounded-xl p-6 bg-white space-y-1">
                {/* Cash Pay Option */}
                <div className="pb-4">
                  <button
                    onClick={() => handleProviderSelect("cash-pay")}
                    className={`w-full px-6 py-3 text-center rounded-full border-2 transition-all duration-300 font-inter ${
                      selectedProvider === "cash-pay"
                        ? "border-gray-400 bg-gray-100 transform scale-105"
                        : "border-gray-300 bg-white hover:bg-gray-50 hover:scale-102"
                    }`}
                    style={{ fontSize: '16px', fontWeight: '400' }}
                  >
                    I won't be using insurance
                  </button>
                </div>

                {/* Insurance Providers */}
                <div className="space-y-0">
                  {insuranceProviders.map((provider, index) => (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderSelect(provider.id)}
                      className={`w-full py-4 px-6 text-left font-inter transition-all duration-300 border-b last:border-b-0 border-gray-200 ${
                        selectedProvider === provider.id
                          ? "bg-orange-200/60 transform scale-102"
                          : "bg-white hover:bg-gray-50"
                      }`}
                      style={{ fontSize: '16px', fontWeight: '400' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-800">{provider.name}</span>
                        {selectedProvider === provider.id && <Check className="w-5 h-5 text-gray-700 animate-in zoom-in-50 duration-300" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleContinueFromProviderSelection}
                disabled={!selectedProvider}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                style={{ fontSize: '16px' }}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Insurance Information Form */}
        {modalState === "insurance-form" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-right-5 duration-500">
            <div className="text-center space-y-4">
              <h1 className="very-vogue-title text-4xl text-gray-800" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                Great, We're In Network!
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.4' }}>
                Next, to verify your eligibility and estimate your co-pay, please enter your insurance information below.
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
                    Date of Birth* (mm/dd/yyyy)
                  </label>
                  <input
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 font-inter"
                    placeholder="MM/DD/YYYY"
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
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setModalState("provider-selection")}
                variant="outline"
                className="px-6 py-3 font-inter rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleVerifyInsurance}
                disabled={!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId}
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
              <h2 className="very-vogue-title text-gray-800" style={{ fontSize: '32px', lineHeight: '1.2' }}>
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

        {/* Verification Success State */}
        {modalState === "verification-success" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in-50 duration-700 delay-300">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                You're Covered!<br />
                Here's How It Works.
              </h1>
            </div>

            <div className="mx-auto max-w-md">
              <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-6 text-center animate-in fade-in-0 duration-700 delay-500">
                <p className="font-inter text-gray-800" style={{ fontSize: '18px', fontWeight: '500' }}>
                  Given our estimates, you'll pay <strong>$50</strong> for your first session and <strong>$25</strong> for all follow-up sessions.
                </p>
              </div>

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
                asChild
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px' }}
              >
                <a href="https://stg.solhealth.co/" target="_blank" rel="noopener noreferrer">
                  Continue to Questionnaire
                </a>
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
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '32px', lineHeight: '1.1' }}>
                Sorry, we couldn't verify your eligibility.
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.4' }}>
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
                asChild
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px' }}
              >
                <a href="https://stg.solhealth.co/" target="_blank" rel="noopener noreferrer">
                  Pay Out-of-Pocket for $30/Session
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Cash Pay Form */}
        {modalState === "cash-pay-form" && (
          <div className="space-y-8 py-6 animate-in fade-in-0 slide-in-from-right-5 duration-500">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 border border-yellow-400 rounded-full px-6 py-3 font-inter text-yellow-800 animate-in fade-in-0 duration-700 delay-300" style={{ fontSize: '16px', fontWeight: '500' }}>
                  💰 $30 / Session Out-of-Pocket Selected
                </div>
              </div>
              <h1 className="very-vogue-title text-gray-800" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                Let's Get You Matched
              </h1>
              <p className="font-inter text-gray-600" style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.4' }}>
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
                onClick={() => setModalState("provider-selection")}
                variant="outline"
                className="px-6 py-3 font-inter rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                style={{ fontSize: '16px', fontWeight: '500' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => onContinueToQuestionnaire({
                  type: 'cash-pay',
                  ...formData
                })}
                disabled={!formData.firstName || !formData.lastName || !formData.email}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-inter rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
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
