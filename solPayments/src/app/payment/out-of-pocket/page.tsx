"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import SquarePayment from "@/components/SquarePayment";
import { SQUARE_CONFIG, PAYMENT_AMOUNTS } from "@/lib/square-config";

export default function OutOfPocketPayment() {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handlePaymentSuccess = async (result: { token: string; details: { card: { last4: string; brand: string } } }) => {
    console.log('Payment successful:', result);
    setPaymentComplete(true);
    // Here you would typically send the payment data to your backend
  };

  const handlePaymentError = (error: { message: string; code?: string }) => {
    console.error('Payment failed:', error);
    alert('Payment failed. Please try again.');
    setPaymentProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-200 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-300 via-orange-200 to-yellow-200 px-6 py-4">
        <div className="max-w-4xl mx-auto relative flex items-center justify-center">
          {/* Back Arrow */}
          <Link href="/" className="absolute left-0 flex items-center text-gray-700 hover:text-gray-900 p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Brand */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800 mr-2">Sol Health</h1>
            <div className="w-5 h-5 bg-yellow-400 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Pay Out-of-Pocket</h2>
          <p className="text-gray-600">$30 flat rate for Graduate-Level Therapists</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-orange-400' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-orange-400' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 3 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 3 ? <Check className="w-4 h-4" /> : "3"}
            </div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-xl text-center">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400"
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Simple pricing:</strong> $30 per session, no hidden fees, no insurance hassles.
                </p>
              </div>

              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-orange-400 hover:bg-orange-500 text-white"
              >
                Continue to Scheduling
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="max-w-2xl mx-auto bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-xl text-center">Schedule Your Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400">
                  <option value="">Select preferred time</option>
                  <option value="morning">Morning (9 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                  <option value="evening">Evening (5 PM - 8 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400">
                  <option value="video">Video Session</option>
                  <option value="phone">Phone Session</option>
                  <option value="in-person">In-Person (if available)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Therapy Focus (optional)
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-400 focus:border-orange-400"
                  rows={3}
                  placeholder="Briefly describe what you'd like to focus on in therapy..."
                />
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 bg-orange-400 hover:bg-orange-500 text-white"
                >
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && !paymentComplete && (
          <Card className="max-w-2xl mx-auto bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-xl text-center flex items-center justify-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Secure Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SquarePayment
                amount={30}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                applicationId={SQUARE_CONFIG.applicationId}
                locationId={SQUARE_CONFIG.locationId}
                environment={SQUARE_CONFIG.environment}
              />

              <div className="flex space-x-4">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="flex-1"
                  disabled={paymentProcessing}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {paymentComplete && (
          <Card className="max-w-2xl mx-auto bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-xl text-center text-green-800">
                <Check className="w-6 h-6 mx-auto mb-2" />
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="bg-white p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Your session is booked!</h3>
                <p className="text-gray-600 mb-4">
                  We'll match you with a Graduate-Level Therapist and send you an email confirmation with your appointment details.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• You'll receive a confirmation email within 15 minutes</p>
                  <p>• Your therapist will contact you 24 hours before your session</p>
                  <p>• Session reminders will be sent via email and SMS</p>
                </div>
              </div>

              <Button
                onClick={() => window.location.href = '/'}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
