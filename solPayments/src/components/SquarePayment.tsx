"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Shield, Lock } from "lucide-react";

interface PaymentResult {
  token: string;
  details: {
    card: {
      last4: string;
      brand: string;
    };
  };
}

interface PaymentError {
  message: string;
  code?: string;
}

interface SquarePaymentProps {
  amount: number;
  onPaymentSuccess: (result: PaymentResult) => void;
  onPaymentError: (error: PaymentError) => void;
  applicationId: string;
  locationId: string;
  environment?: 'sandbox' | 'production';
}

export default function SquarePayment({
  amount,
  onPaymentSuccess,
  onPaymentError,
  applicationId,
  locationId,
  environment = 'sandbox'
}: SquarePaymentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cardPayment, setCardPayment] = useState<unknown>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // In a real implementation, you would load the Square Web SDK here
    // For now, we'll simulate the Square payment form
    const initializeSquarePayments = async () => {
      try {
        // Simulate Square SDK loading
        setTimeout(() => {
          setIsLoading(false);
          // This would normally initialize the actual Square payment form
          console.log('Square Payment Form would initialize here');
        }, 1000);
      } catch (error) {
        console.error('Failed to initialize Square payments:', error);
        setIsLoading(false);
      }
    };

    initializeSquarePayments();
  }, [applicationId, locationId, environment]);

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      // In a real implementation, this would tokenize the card and process payment
      // For demo purposes, we'll simulate a successful payment
      setTimeout(() => {
        const mockSuccessResult = {
          token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
          details: {
            card: {
              last4: '1234',
              brand: 'VISA'
            }
          }
        };

        onPaymentSuccess(mockSuccessResult);
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      onPaymentError({ message: error instanceof Error ? error.message : 'Payment failed' });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Amount Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Total Amount:</span>
          <span className="text-2xl font-bold text-green-700">${amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Square Payment Form Container */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <div className="flex items-center mb-3">
          <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
          <span className="font-medium text-gray-700">Payment Information</span>
          <div className="ml-auto flex items-center text-green-600">
            <Shield className="w-4 h-4 mr-1" />
            <span className="text-sm">Secured by Square</span>
          </div>
        </div>

        <div
          ref={cardContainerRef}
          className={`min-h-[120px] rounded-lg border-2 ${
            isLoading ? 'border-dashed border-gray-300 bg-gray-50' : 'border-solid border-gray-200 bg-white'
          } flex flex-col items-center justify-center transition-all duration-300`}
        >
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading secure payment form...</p>
            </div>
          ) : (
            <div className="w-full space-y-3 p-4">
              {/* Demo Card Input Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Information */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="flex items-start">
          <Lock className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Your payment is secure</p>
            <p className="text-blue-700">
              We use Square's industry-leading encryption to protect your payment information.
              Your card details are never stored on our servers.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Payment Button */}
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)} Securely`}
      </button>

      {/* Square Branding */}
      <div className="text-center text-xs text-gray-500">
        Powered by <span className="font-medium">Square</span> • PCI DSS Compliant
      </div>
    </div>
  );
}
