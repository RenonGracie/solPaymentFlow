"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import InsuranceVerificationModal from "@/components/InsuranceVerificationModal";
import SquarePaymentModal from "@/components/SquarePaymentModal";
import Image from "next/image";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalInitialState, setModalInitialState] = useState<"cash-pay-form" | undefined>(undefined);
  // Card expansion states
  const [insuranceExpanded, setInsuranceExpanded] = useState(false);
  const [cashExpanded, setCashExpanded] = useState(false);

  // Toggle helpers (cards can now be independent)
  const toggleInsurance = () => {
    setInsuranceExpanded(prev => !prev);
  };

  const toggleCash = () => {
    setCashExpanded(prev => !prev);
  };

  const handleOpenModal = () => {
    setModalInitialState(undefined); // opens modal at default insurance form
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleContinueToQuestionnaire = () => {
    window.location.href = "https://stg.solhealth.co/";
  };

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

  const handleOpenCashPayModal = () => {
    setModalInitialState("cash-pay-form");
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Header Section */}
      <div className="relative overflow-hidden h-[120px] sm:h-[180px] md:h-[180px] lg:h-[180px]">
        {/* Banner Image */}
        <Image
          src="/onboarding-banner.jpg"
          alt="Onboarding Banner"
          width={1440}
          height={180}
          priority
          className="w-full h-full select-none object-cover"
        />

        {/* Top-left Content */}
        <div className="absolute top-0 left-0 px-6 py-8 flex-col items-start space-y-4 hidden md:flex">
          <div className="flex items-center">
            <Image
              src="/sol-health-logo.svg"
              alt="Sol Health"
              width={186}
              height={32}
              className="h-8 w-auto"
            />
            {/* Demo Square Payment Button */}
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

        {/* Center Quote */}
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

      {/* Mobile Header below banner */}
      <div className="relative flex items-center justify-center px-6 py-4 mt-6 mb-2 md:hidden">
        {/* Back Arrow */}
        <ArrowLeft className="absolute left-6 w-5 h-5 text-gray-600" />
        {/* Centered Logo */}
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
        {/* Back Arrow and Welcome Section */}
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
              <p className="text-sm font-inter" style={{ color: '#363943' }}>Associate-Level Therapists</p>
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
                      <li>• You'll be matched with an Associate-Level Therapist</li>
                      <li>• Associate-Level Therapists have graduated from their counseling programs and are working towards full licensure.</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full hover:opacity-90 rounded-full font-inter font-medium py-3 mt-6 border"
                    style={{ backgroundColor: '#FFFAEE', color: '#363943', borderColor: '#E6CAAF' }}
                    onClick={handleOpenModal}
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
              <p className="text-sm font-inter" style={{ color: '#363943' }}>Graduate-Level Therapists</p>
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
                      • Those who are seeking a lighter form of care or who prefer not to go through insurance
                    </p>
                  </div>

                  <div>
                    <p className="font-inter font-semibold mb-2" style={{ color: '#363943' }}>What to expect:</p>
                    <ul className="text-sm font-inter space-y-1" style={{ color: '#363943' }}>
                      <li>• You'll be matched with a Graduate-Level Therapist</li>
                      <li>• Graduate-Level Therapists are in their counseling programs obtaining supervised clinical hours.</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full hover:opacity-90 rounded-full font-inter font-medium py-3 mt-6 border"
                    style={{ backgroundColor: '#E6CAAF', color: '#363943', borderColor: '#E6CAAF' }}
                    onClick={handleOpenCashPayModal}
                  >
                    Pay Out-of-Pocket <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <InsuranceVerificationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onContinueToQuestionnaire={handleContinueToQuestionnaire}
        initialState={modalInitialState}
      />

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
