"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export default function InsurancePayment() {
  const [currentStep, setCurrentStep] = useState(1);

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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Use My Insurance</h2>
          <p className="text-gray-600">Co-pay payment for Associate-Level Therapists</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 3 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > 3 ? <Check className="w-4 h-4" /> : "3"}
            </div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-xl text-center">Insurance Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-400 focus:border-yellow-400">
                  <option value="">Select your insurance provider</option>
                  <option value="aetna">Aetna</option>
                  <option value="cigna">Cigna</option>
                  <option value="meritain">Meritain</option>
                  <option value="carelon">Carelon</option>
                  <option value="bcbs">BCBS</option>
                  <option value="amerihealth">AmeriHealth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member ID
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-400 focus:border-yellow-400"
                  placeholder="Enter your member ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Number (if applicable)
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-400 focus:border-yellow-400"
                  placeholder="Enter group number"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Estimated Co-pay:</strong> We'll verify your benefits and provide the exact co-pay amount before your first session.
                </p>
              </div>

              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800"
              >
                Continue to Appointment Scheduling
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="max-w-2xl mx-auto bg-yellow-50 border-yellow-200">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-400 focus:border-yellow-400">
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
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-400 focus:border-yellow-400">
                  <option value="video">Video Session</option>
                  <option value="phone">Phone Session</option>
                  <option value="in-person">In-Person (if available)</option>
                </select>
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
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-800"
                >
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="max-w-2xl mx-auto bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-xl text-center">Payment Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-blue-800 font-medium">Your insurance will be billed directly</p>
                <p className="text-blue-600 text-sm mt-1">
                  We'll collect your co-pay at the time of service using Square payments
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method for Co-pay
                </label>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div id="square-card-container" className="min-h-[100px] flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">Square Payment Form will load here</p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>• Your card will be securely stored for co-pay collection</p>
                <p>• You'll only be charged your insurance co-pay amount</p>
                <p>• Payment is processed securely through Square</p>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-800"
                >
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
