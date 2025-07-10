"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, CreditCard, X } from "lucide-react";
import SquarePayment from "./SquarePayment";
import { SQUARE_CONFIG } from "@/lib/square-config";

interface SquarePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  title?: string;
  description?: string;
  onPaymentSuccess: (result: { token: string; details: { card: { last4: string; brand: string } } }) => void;
  onPaymentError?: (error: { message: string; code?: string }) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function SquarePaymentModal({
  isOpen,
  onClose,
  amount,
  title = "Secure Payment",
  description = "Complete your payment securely",
  onPaymentSuccess,
  onPaymentError,
  showBackButton = false,
  onBack
}: SquarePaymentModalProps) {
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ token: string; details: { card: { last4: string; brand: string } } } | null>(null);

  const handlePaymentSuccess = (result: { token: string; details: { card: { last4: string; brand: string } } }) => {
    console.log('Payment successful:', result);
    setPaymentResult(result);
    setPaymentComplete(true);
    onPaymentSuccess(result);
  };

  const handlePaymentError = (error: { message: string; code?: string }) => {
    console.error('Payment failed:', error);
    if (onPaymentError) {
      onPaymentError(error);
    } else {
      alert('Payment failed. Please try again.');
    }
  };

  const handleClose = () => {
    setPaymentComplete(false);
    setPaymentResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">

        {!paymentComplete && (
          <div className="space-y-6">
            <DialogHeader className="relative">
              <button
                onClick={handleClose}
                className="absolute right-0 top-0 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
              <DialogTitle className="text-xl text-center flex items-center justify-center">
                <CreditCard className="w-5 h-5 mr-2" />
                {title}
              </DialogTitle>
              <p className="text-center text-gray-600">{description}</p>
            </DialogHeader>

            <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
              <p className="text-green-800 font-medium text-2xl">${amount.toFixed(2)}</p>
              <p className="text-green-600 text-sm mt-1">
                One-time secure payment
              </p>
            </div>

            <SquarePayment
              amount={amount}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              applicationId={SQUARE_CONFIG.applicationId}
              locationId={SQUARE_CONFIG.locationId}
              environment={SQUARE_CONFIG.environment}
            />

            {showBackButton && onBack && (
              <div className="flex space-x-3">
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            )}
          </div>
        )}

        {paymentComplete && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-center text-green-800">
                <Check className="w-6 h-6 mx-auto mb-2" />
                Payment Successful!
              </DialogTitle>
            </DialogHeader>

            <div className="bg-green-50 p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Your payment of ${amount.toFixed(2)} has been processed!
              </h3>
              <p className="text-gray-600 mb-4">
                Thank you for your payment. You should receive a confirmation email shortly.
              </p>
              {paymentResult && (
                <div className="text-sm text-gray-500 space-y-1">
                  <p>✓ Payment processed securely</p>
                  <p>✓ Card ending in {paymentResult.details?.card?.last4}</p>
                  <p>✓ Receipt sent to your email</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Continue
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
