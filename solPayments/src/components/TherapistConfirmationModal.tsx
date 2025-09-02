"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TMatchedTherapistData } from "@/api/types/therapist.types";

interface TherapistConfirmationModalProps {
  isVisible: boolean;
  therapist: TMatchedTherapistData | null;
  selectedDate: Date | null;
  selectedTimeSlot: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TherapistConfirmationModal = ({ 
  isVisible, 
  therapist, 
  selectedDate, 
  selectedTimeSlot,
  onConfirm, 
  onCancel 
}: TherapistConfirmationModalProps) => {
  if (!therapist) return null;

  const getImageUrl = (imageLink: string | null | undefined): string => {
    if (!imageLink || typeof imageLink !== 'string') {
      return '';
    }
    
    const cleanLink = imageLink.trim();
    if (!cleanLink) {
      return '';
    }
    
    if (cleanLink.startsWith('http://') || cleanLink.startsWith('https://')) {
      return cleanLink;
    }
    
    return '';
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Date not selected';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeSlot: string | null): string => {
    if (!timeSlot) return 'Time not selected';
    
    // Convert from normalized format (e.g., "3:45pm") back to display format
    const cleanTime = timeSlot.toLowerCase().trim();
    
    // Handle different formats
    const match = cleanTime.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
    if (match) {
      const hour = match[1];
      const minute = match[2] || '00';
      const period = match[3].toUpperCase();
      return `${hour}:${minute} ${period}`;
    }
    
    return timeSlot;
  };

  return (
    <Dialog open={isVisible} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md bg-white border border-[#5C3106] rounded-3xl shadow-[4px_4px_0_#5C3106] p-0 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="very-vogue-title text-2xl text-[#5C3106] mb-2">
              Confirm Your Selection
            </h2>
          </div>

          {/* Therapist Info */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-4">
              {therapist.therapist.image_link && getImageUrl(therapist.therapist.image_link) ? (
                <img
                  src={getImageUrl(therapist.therapist.image_link)}
                  alt={therapist.therapist.intern_name}
                  className="w-20 h-20 rounded-full object-cover shadow-sm border border-gray-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm border border-gray-200">
                  <span className="text-2xl font-medium text-gray-600">
                    {therapist.therapist.intern_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            
            <h3 className="very-vogue-title text-xl text-gray-800 text-center">
              {therapist.therapist.intern_name}
            </h3>
            <p className="text-sm text-gray-600 text-center" style={{ fontFamily: 'var(--font-inter)' }}>
              Therapist
            </p>
          </div>

          {/* Meeting Info */}
          <div className="bg-yellow-50 border border-[#5C3106] rounded-2xl p-4 mb-6 shadow-[1px_1px_0_#5C3106]">
            <h4 className="font-semibold text-gray-800 mb-3 text-center" style={{ fontFamily: 'var(--font-inter)' }}>
              Session Details
            </h4>
            
            <div className="space-y-2 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-gray-800">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium text-gray-800">{formatTime(selectedTimeSlot)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-gray-800">55 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium text-gray-800">Video Session</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-full border border-[#5C3106] shadow-[1px_1px_0_#5C3106]"
              onClick={onConfirm}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Confirm & Book Session →
            </Button>
            
            <Button
              variant="outline"
              className="w-full rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={onCancel}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Go Back & Change
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};